import { now } from "./runtime.js";
import { tokenize } from "./tokenizer.js";
import { LABELS, Role } from "./labels.js";
import { inferCPU, type Predictions } from "./model/cpu.js";
import type {
  ParserOptions,
  RawToken,
  PredictionToken as Token,
} from "./types.js";

export interface TagResult {
  tokens: Token[];
  unknownLabels: boolean;
  backend: "cpu";
  timings: { tokenizeMs: number; inferMs: number };
}

interface Batch {
  results: TagResult[];
  remaining: number;
  resolve: (results: TagResult[]) => void;
  reject: (reason: unknown) => void;
}

interface Job {
  text: string;
  tokens: RawToken[];
  tokenizeMs: number;
  batch: Batch;
  index: number;
}

interface Window {
  job: number;
  start: number;
  keepStart: number;
  keepEnd: number;
  tokens: RawToken[];
}

function windowsFor(job: Job, jobIndex: number): Window[] {
  // Whitespace width has no temporal meaning. Use canonical model features
  // while retaining the original tokens and offsets in the public result.
  const started = now();
  const canonicalText = job.text.trim().replace(/\s+/g, " ");
  const canonical =
    canonicalText === job.text ? job.tokens : tokenize(canonicalText);
  job.tokenizeMs += now() - started;
  const sourceStart = job.tokens[0]?.kind === 3 ? 1 : 0;
  const windows: Window[] = [];
  for (let start = 0; start < canonical.length; start += 96) {
    const contextStart = Math.max(0, start - 16);
    const contextEnd = Math.min(canonical.length, start + 112);
    const tokens = canonical.slice(contextStart, contextEnd);
    for (const index of new Set([0, tokens.length - 1])) {
      const token = tokens[index];
      let flags = token.features[1] & ~((1 << 10) | (1 << 11));
      if (index === 0) flags |= 1 << 10;
      if (index === tokens.length - 1) flags |= 1 << 11;
      tokens[index] = { ...token, features: [token.features[0], flags] };
    }
    windows.push({
      job: jobIndex,
      start: sourceStart + contextStart,
      keepStart: start - contextStart,
      keepEnd: Math.min(canonical.length, start + 96) - contextStart,
      tokens,
    });
  }
  return windows;
}

export async function createTagger(
  options: Pick<ParserOptions, "backend"> = {},
) {
  if (options.backend !== undefined && options.backend !== "cpu")
    throw new RangeError("This React Native build supports only the cpu backend.");
  const pending: Job[] = [];
  let active: Job[] = [];
  let scheduled = false;
  let running = false;
  let disposed = false;
  async function process(jobs: Job[]): Promise<void> {
    const windows = jobs.flatMap(windowsFor);
    const started = now();
    const predictions: Predictions[] = windows.map((window) => inferCPU(window.tokens));
    if (disposed) throw new Error("The parser is disposed.");
    if (
      predictions.length !== windows.length ||
      predictions.some(
        (prediction, index) =>
          prediction.labels.length !== windows[index].tokens.length ||
          prediction.clauseStarts.length !== windows[index].tokens.length ||
          prediction.scores.length !== windows[index].tokens.length,
      )
    ) {
      throw new Error("The model returned incomplete predictions.");
    }
    const inferMs = now() - started;
    const labeled = jobs.map((job) =>
      job.tokens.map((token): Token => ({
        ...token,
        label: Role.O,
        clauseStart: false,
        score: 0,
      })),
    );
    const invalid = new Set<number>();
    windows.forEach((window, index) => {
      const prediction = predictions[index];
      for (let token = window.keepStart; token < window.keepEnd; token++) {
        const label = prediction.labels[token];
        if (label >= LABELS.length) invalid.add(window.job);
        const result = labeled[window.job][window.start + token];
        result.label = label < LABELS.length ? label : Role.O;
        result.clauseStart = Boolean(prediction.clauseStarts[token]);
        result.score = prediction.scores[token];
      }
    });
    jobs.forEach((job, index) => {
      job.batch.results[job.index] = {
        tokens: labeled[index],
        unknownLabels: invalid.has(index),
        backend: "cpu",
        timings: { tokenizeMs: job.tokenizeMs, inferMs },
      };
      if (--job.batch.remaining === 0) job.batch.resolve(job.batch.results);
    });
  }

  async function flush(): Promise<void> {
    scheduled = false;
    if (running) return;
    running = true;
    try {
      while (pending.length) {
        active = pending.splice(0);
        try {
          if (disposed) throw new Error("The parser is disposed.");
          await process(active);
        } catch (error) {
          active.forEach((job) => job.batch.reject(error));
        } finally {
          active = [];
        }
      }
    } finally {
      running = false;
      if (pending.length) schedule();
    }
  }

  function schedule(): void {
    if (scheduled || running) return;
    scheduled = true;
    void Promise.resolve().then(flush);
  }

  function tagMany(texts: string[]): Promise<TagResult[]> {
    if (!texts.length) return Promise.resolve([]);
    if (disposed) return Promise.reject(new Error("The parser is disposed."));
    for (const text of texts) {
      if (typeof text !== "string")
        return Promise.reject(new TypeError("Input must be a string."));
      if (text.length > 1_000_000)
        return Promise.reject(
          new RangeError("An input supports at most one million characters."),
        );
    }
    return new Promise((resolve, reject) => {
      const batch: Batch = {
        results: new Array(texts.length),
        remaining: texts.length,
        resolve,
        reject,
      };
      texts.forEach((text, index) => {
        const started = now();
        const tokens = tokenize(text);
        pending.push({
          text,
          tokens,
          tokenizeMs: now() - started,
          batch,
          index,
        });
      });
      schedule();
    });
  }

  return {
    tag(text: string): Promise<TagResult> {
      return tagMany([text]).then((results) => results[0]);
    },
    tagMany,
    dispose(): void {
      if (disposed) return;
      disposed = true;
      for (const job of [...pending.splice(0), ...active])
        job.batch.reject(new Error("The parser is disposed."));
    },
  };
}

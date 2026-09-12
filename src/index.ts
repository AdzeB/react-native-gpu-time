import {
  defineParser as createCore,
  type ParseContext,
  type ParserOptions as CoreOptions,
  type ParseResult as CoreResult,
} from "./core.js";
import {
  resolveLanguage,
  type BuiltinLanguage,
  type LanguagePack,
} from "./languages/index.js";
export {
  languages,
  english,
  french,
  spanish,
  chinese,
} from "./languages/index.js";
export type { BuiltinLanguage, LanguagePack };
export type { ParseContext, Diagnostic, TimeRange } from "./core.js";
export interface ParserOptions extends CoreOptions {
  language?: BuiltinLanguage | LanguagePack;
}
export interface ParseResult extends CoreResult {
  language: string;
  /** Canonical English passed to the model for non-English packs. */
  normalizedText?: string;
}

export async function defineParser(options: ParserOptions = {}) {
  const language = resolveLanguage(options.language);
  const core = await createCore({
    ...options,
    dateOrder: options.dateOrder ?? language.dateOrder,
  });
  let disposed = false;
  async function parseOne(
    text: string,
    context: ParseContext,
  ): Promise<ParseResult> {
    if (disposed) throw new Error("The parser is disposed.");
    if (typeof text !== "string")
      throw new TypeError("Input must be a string.");
    if (text.length > 1_000_000)
      throw new RangeError("An input supports at most one million characters.");
    const normalized = language.normalize(text);
    // An empty parse still validates the reference, timezone, and occurrence limit.
    const result = await core.parse(normalized ?? "", context);
    if (normalized === null) {
      return {
        ...result,
        language: language.id,
        diagnostics: [
          {
            code: "unsupported-language-input",
            severity: "error",
            start: 0,
            end: text.length,
            message: `This phrase is outside the ${language.name} language pack's supported vocabulary.`,
          },
        ],
      };
    }
    return {
      ...result,
      language: language.id,
      ...(language.id !== "en" ? { normalizedText: normalized } : {}),
      // Normalization can reorder words. Report diagnostics on the whole original
      // phrase instead of presenting incorrect token offsets from the English text.
      diagnostics:
        normalized === text
          ? result.diagnostics
          : result.diagnostics.map((diagnostic) => ({
              ...diagnostic,
              start: 0,
              end: text.length,
            })),
    };
  }
  async function parseBatch(
    texts: string[],
    context: ParseContext,
  ): Promise<ParseResult[]> {
    if (disposed) throw new Error("The parser is disposed.");
    return Promise.all(texts.map((text) => parseOne(text, context)));
  }
  return {
    parse: parseOne,
    parseMany: parseBatch,
    dispose() {
      disposed = true;
      core.dispose();
    },
  };
}

let defaultParser: ReturnType<typeof defineParser> | undefined;
export async function parse(
  text: string,
  context: ParseContext,
  options?: ParserOptions,
): Promise<ParseResult> {
  if (!options) {
    defaultParser ??= defineParser();
    return (await defaultParser).parse(text, context);
  }
  const parser = await defineParser(options);
  try {
    return await parser.parse(text, context);
  } finally {
    parser.dispose();
  }
}
export async function parseMany(
  texts: string[],
  context: ParseContext,
  options?: ParserOptions,
): Promise<ParseResult[]> {
  if (!options) {
    defaultParser ??= defineParser();
    return (await defaultParser).parseMany(texts, context);
  }
  const parser = await defineParser(options);
  try {
    return await parser.parseMany(texts, context);
  } finally {
    parser.dispose();
  }
}

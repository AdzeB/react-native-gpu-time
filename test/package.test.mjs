import assert from "node:assert/strict";
import { test } from "node:test";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { parse, defineParser } from "../dist/index.js";

const context = {
  reference: "2026-09-12T12:00:00-04:00",
  timeZone: "America/New_York",
};

test("ESM and CommonJS consumers receive the same dates", async () => {
  const cjs = createRequire(import.meta.url)("../dist/index.cjs");
  const esmResult = await parse("tomorrow at 3pm", context);
  const cjsResult = await cjs.parse("tomorrow at 3pm", context);
  assert.deepEqual(cjsResult.occurrences, esmResult.occurrences);
  assert.equal(esmResult.occurrences[0].start, "2026-09-13T15:00:00-04:00");
});

test("bundle runs without browser globals or recent array and cloning APIs", async () => {
  const sandbox = vm.createContext({ module: { exports: {} } });
  vm.runInContext(
    `
    Array.prototype.at = undefined;
    String.prototype.at = undefined;
    Array.prototype.findLast = undefined;
    globalThis.structuredClone = undefined;
    globalThis.performance = undefined;
    globalThis.queueMicrotask = undefined;
  `,
    sandbox,
  );
  vm.runInContext(
    readFileSync(new URL("../dist/index.cjs", import.meta.url), "utf8"),
    sandbox,
  );
  const result = await sandbox.module.exports.parse(
    "tomorrow at 3pm and 5pm",
    context,
  );
  assert.equal(result.occurrences.length, 2);
  assert.equal(result.occurrences[1].start, "2026-09-13T17:00:00-04:00");
});

test("unsupported GPU requests fail explicitly", async () => {
  await assert.rejects(
    defineParser({ backend: "webgpu" }),
    /supports only the cpu backend/,
  );
});

test("missing Intl support reports a useful error", async () => {
  const sandbox = vm.createContext({
    module: { exports: {} },
    Intl: undefined,
  });
  vm.runInContext(
    readFileSync(new URL("../dist/index.cjs", import.meta.url), "utf8"),
    sandbox,
  );
  await assert.rejects(
    sandbox.module.exports.defineParser(),
    /Intl.DateTimeFormat.formatToParts/,
  );
});

test("disposing rejects queued work and subsequent calls", async () => {
  const parser = await defineParser();
  const pending = parser.parse("tomorrow", context);
  parser.dispose();
  await assert.rejects(pending, /disposed/);
  await assert.rejects(parser.parse("tomorrow", context), /disposed/);
});

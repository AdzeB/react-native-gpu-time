import assert from "node:assert/strict";
import { test } from "node:test";
import { parse } from "../dist/index.js";
const context = {
  reference: "2026-09-12T12:00:00-04:00",
  timeZone: "America/New_York",
};
for (const [language, text] of [
  ["fr", "demain à 15h"],
  ["es", "mañana a las 15:00"],
  ["zh-CN", "明天下午三点"],
]) {
  test(`built package parses ${language}`, async () => {
    const result = await parse(text, context, { language });
    assert.equal(result.occurrences[0].start, "2026-09-13T15:00:00-04:00");
    assert.equal(result.language, language);
  });
}

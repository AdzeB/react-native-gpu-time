import { defineParser, parse, parseMany } from "react-native-gpu-time";

const context = {
  reference: "2026-09-12T12:00:00-04:00",
  timeZone: "America/New_York",
  limit: 3,
};

export type Check = { name: string; passed: boolean; detail?: string };

// Run the same public-API fixtures in Node and on the device's actual JS engine.
export async function runChecks(): Promise<Check[]> {
  const results: Check[] = [];
  async function check(name: string, test: () => Promise<boolean>) {
    try {
      const passed = await test();
      results.push({
        name,
        passed,
        ...(!passed ? { detail: "Unexpected result" } : {}),
      });
    } catch (error) {
      results.push({ name, passed: false, detail: String(error) });
    }
  }
  await check("Relative date in New York", async () => {
    const result = await parse("tomorrow at 3pm", context);
    return (
      result.backend === "cpu" &&
      result.occurrences[0]?.start === "2026-09-13T15:00:00-04:00"
    );
  });
  await check("Overnight range", async () => {
    const result = await parse("Mon 10pm-12am", context);
    return (
      result.occurrences[0]?.start === "2026-09-14T22:00:00-04:00" &&
      result.occurrences[0]?.end === "2026-09-15T00:00:00-04:00"
    );
  });
  await check("Weekly recurrence and preview limit", async () => {
    const result = await parse("every Monday at 8pm", context);
    return (
      result.occurrences.length === 3 &&
      result.truncated &&
      result.rrules.some((rule) => rule.includes("FREQ=WEEKLY"))
    );
  });
  await check("Conjoined times", async () => {
    const result = await parse("tomorrow at 3pm and 5pm", context);
    return (
      result.occurrences.length === 2 &&
      result.occurrences[0]?.start === "2026-09-13T15:00:00-04:00" &&
      result.occurrences[1]?.start === "2026-09-13T17:00:00-04:00"
    );
  });
  await check("Daylight saving transition", async () => {
    const result = await parse("tomorrow at noon", {
      reference: "2026-03-07T12:00:00-05:00",
      timeZone: "America/New_York",
    });
    return result.occurrences[0]?.start === "2026-03-08T12:00:00-04:00";
  });
  await check("Invalid time diagnostics", async () => {
    const result = await parse("27pm", context);
    return (
      result.occurrences.length === 0 &&
      result.diagnostics.some((d) => d.code === "invalid-time")
    );
  });
  await check("Invalid timezone rejection", async () => {
    try {
      await parse("tomorrow", { ...context, timeZone: "Invalid/Zone" });
    } catch {
      return true;
    }
    return false;
  });
  await check("Ordered batches and empty input", async () => {
    const results = await parseMany(
      ["tomorrow at 3pm", "", "every Monday at 8pm"],
      context,
    );
    return (
      results.length === 3 &&
      results[0].occurrences[0]?.start === "2026-09-13T15:00:00-04:00" &&
      results[1].occurrences.length === 0 &&
      results[2].rrules.length > 0
    );
  });
  await check("Day-first numeric date", async () => {
    const parser = await defineParser({ dateOrder: "DMY" });
    try {
      const result = await parser.parse("03/04/2027", context);
      return result.occurrences[0]?.start === "2027-04-03T00:00:00-04:00";
    } finally {
      parser.dispose();
    }
  });
  await check("Disposed parser rejects reuse", async () => {
    const parser = await defineParser();
    parser.dispose();
    try {
      await parser.parse("tomorrow", context);
    } catch (error) {
      return String(error).includes("disposed");
    }
    return false;
  });
  for (const [language, phrase] of [
    ["fr", "demain à 15h"],
    ["es", "mañana a las 15:00"],
    ["zh-CN", "明天下午三点"],
  ] as const) {
    await check(`${language}: local language pack`, async () => {
      const result = await parse(phrase, context, { language });
      return (
        result.occurrences[0]?.start === "2026-09-13T15:00:00-04:00" &&
        result.language === language
      );
    });
  }
  return results;
}

import { expect, it } from "vitest";
import {
  parse,
  defineParser,
  languages,
  type LanguagePack,
} from "../src/index.js";
const context = {
  reference: "2026-09-12T12:00:00-04:00",
  timeZone: "America/New_York",
  limit: 3,
};
const cases: [string, string, string][] = [
  ["fr", "demain à 15h", "2026-09-13T15:00:00-04:00"],
  ["fr", "demain à quinze heures", "2026-09-13T15:00:00-04:00"],
  ["fr", "demain à 9h30", "2026-09-13T09:30:00-04:00"],
  ["fr", "demain à neuf heures du matin", "2026-09-13T09:00:00-04:00"],
  ["fr", "le 2 octobre à 20h", "2026-10-02T20:00:00-04:00"],
  ["fr", "dans 20 minutes", "2026-09-12T12:20:00-04:00"],
  ["fr", "vendredi prochain à midi", "2026-09-18T12:00:00-04:00"],
  ["fr", "03/04/2027", "2027-04-03T00:00:00-04:00"],
  ["fr", "après-demain à 15h", "2026-09-14T15:00:00-04:00"],
  ["es", "mañana a las 15:00", "2026-09-13T15:00:00-04:00"],
  ["es", "mañana a las quince horas", "2026-09-13T15:00:00-04:00"],
  ["es", "mañana a las nueve de la mañana", "2026-09-13T09:00:00-04:00"],
  ["es", "el 2 de octubre a las 20:00", "2026-10-02T20:00:00-04:00"],
  ["es", "el 2 de octubre de 2027 a las 20:00", "2027-10-02T20:00:00-04:00"],
  ["es", "dentro de 20 minutos", "2026-09-12T12:20:00-04:00"],
  ["es", "el próximo viernes a las 12:00", "2026-09-18T12:00:00-04:00"],
  ["es", "03/04/2027", "2027-04-03T00:00:00-04:00"],
  ["es", "pasado mañana a las 15:00", "2026-09-14T15:00:00-04:00"],
  ["zh-CN", "明天下午三点", "2026-09-13T15:00:00-04:00"],
  ["zh-CN", "明天上午九点半", "2026-09-13T09:30:00-04:00"],
  ["zh-CN", "明天下午三点一刻", "2026-09-13T15:15:00-04:00"],
  ["zh-CN", "明天下午三点三刻", "2026-09-13T15:45:00-04:00"],
  ["zh-CN", "十月二日下午八点", "2026-10-02T20:00:00-04:00"],
  ["zh-CN", "2027年10月2日晚上八点", "2027-10-02T20:00:00-04:00"],
  ["zh-CN", "二〇二七年十月二日下午八点", "2027-10-02T20:00:00-04:00"],
  ["zh-CN", "二十分钟后", "2026-09-12T12:20:00-04:00"],
  ["zh-CN", "下周五中午", "2026-09-18T12:00:00-04:00"],
  ["zh-CN", "明天凌晨十二点", "2026-09-13T00:00:00-04:00"],
];
it.each(cases)("%s: %s", async (id, text, expected) => {
  const result = await parse(text, context, {
    language: languages.find((pack) => pack.id === id)!,
  });
  expect(result.language).toBe(id);
  expect(result.normalizedText).toBeTruthy();
  expect(result.diagnostics.filter((d) => d.severity === "error")).toEqual([]);
  expect(result.occurrences[0].start).toBe(expected);
});

it.each([
  ["fr", "chaque lundi à 20h"],
  ["es", "cada lunes a las 20:00"],
  ["zh-CN", "每周一晚上八点"],
])("%s exports weekly recurrence", async (id, text) => {
  const result = await parse(text, context, {
    language: languages.find((pack) => pack.id === id)!,
  });
  expect(result.occurrences.map((item) => item.start)).toEqual([
    "2026-09-14T20:00:00-04:00",
    "2026-09-21T20:00:00-04:00",
    "2026-09-28T20:00:00-04:00",
  ]);
  expect(result.rrules[0]).toContain("FREQ=WEEKLY");
  expect(result.truncated).toBe(true);
});
it.each([
  ["fr", "le dernier vendredi de chaque mois"],
  ["es", "el último viernes de cada mes"],
])("%s exports an ordinal monthly recurrence", async (id, text) => {
  const result = await parse(text, context, {
    language: languages.find((pack) => pack.id === id)!,
  });
  expect(result.occurrences[0].start).toBe("2026-09-25T00:00:00-04:00");
  expect(result.rrules[0]).toContain("FREQ=MONTHLY");
});
it.each([
  ["fr", "demain à midi"],
  ["es", "mañana a las 12:00"],
  ["zh-CN", "明天中午"],
])("%s resolves daylight saving time after normalization", async (id, text) => {
  const result = await parse(
    text,
    {
      ...context,
      reference: "2026-03-07T12:00:00-05:00",
      timeZone: "America/New_York",
    },
    { language: languages.find((pack) => pack.id === id)! },
  );
  expect(result.occurrences[0].start).toBe("2026-03-08T12:00:00-04:00");
});
it.each([
  ["fr", "ne pas demain"],
  ["es", "no mañana"],
  ["zh-CN", "不要明天"],
  ["fr", "demain blorp"],
  ["es", "mañana blorp"],
  ["zh-CN", "明天火星时间"],
  ["zh-CN", "明天下午二十十点"],
  ["zh-CN", "明天晚上十二点"],
])("%s rejects unsupported wording without guessing: %s", async (id, text) => {
  const result = await parse(text, context, {
    language: languages.find((pack) => pack.id === id)!,
  });
  expect(result.occurrences).toEqual([]);
  expect(result.diagnostics[0]).toMatchObject({
    code: "unsupported-language-input",
    start: 0,
    end: text.length,
  });
});
it.each([
  ["fr", "demain à 27h"],
  ["es", "mañana a las 27:00"],
  ["zh-CN", "明天二十七点"],
])("%s rejects invalid clocks", async (id, text) => {
  const result = await parse(text, context, {
    language: languages.find((pack) => pack.id === id)!,
  });
  expect(result.occurrences).toEqual([]);
  expect(result.diagnostics.length).toBeGreaterThan(0);
  expect(result.diagnostics[0].end).toBe(text.length);
});
it("accepts a third-party language pack without changing core code", async () => {
  const german: LanguagePack = {
    id: "de",
    name: "Deutsch",
    dateOrder: "DMY",
    normalize(text) {
      const match = /^morgen um (\d{1,2}) uhr$/i.exec(text.trim());
      return match ? `tomorrow at ${match[1]}:00` : null;
    },
  };
  const parser = await defineParser({ language: german });
  const { parseMany } = parser;
  const results = await parseMany(["morgen um 15 uhr", "unbekannt"], context);
  expect(results[0].occurrences[0].start).toBe("2026-09-13T15:00:00-04:00");
  expect(results[1].diagnostics[0].code).toBe("unsupported-language-input");
  parser.dispose();
});
it("rejects an unknown language instead of falling back to English", async () => {
  await expect(defineParser({ language: "de" as "en" })).rejects.toThrow(
    "Unsupported language",
  );
});
it("allows callers to override a language pack numeric date order", async () => {
  const result = await parse("03/04/2027", context, {
    language: "fr",
    dateOrder: "MDY",
  });
  expect(result.occurrences[0].start).toBe("2027-03-04T00:00:00-05:00");
});
it("accepts plural French weekdays", async () => {
  const result = await parse("tous les lundis à 20h", context, {
    language: "fr",
  });
  expect(result.occurrences[0].start).toBe("2026-09-14T20:00:00-04:00");
  expect(result.rrules[0]).toContain("FREQ=WEEKLY");
});
it.each([
  ["fr", "chaque lundi de 20h à 22h"],
  ["es", "cada lunes de 20:00 a 22:00"],
])("%s preserves range endpoints", async (id, text) => {
  const result = await parse(text, context, {
    language: languages.find((pack) => pack.id === id)!,
  });
  expect(result.occurrences[0]).toEqual({
    start: "2026-09-14T20:00:00-04:00",
    end: "2026-09-14T22:00:00-04:00",
    allDay: false,
  });
});
it("parses a Chinese overnight shift", async () => {
  const result = await parse("从星期五晚上十点到星期六凌晨两点", context, {
    language: "zh-CN",
  });
  expect(result.occurrences[0]).toEqual({
    start: "2026-09-18T22:00:00-04:00",
    end: "2026-09-19T02:00:00-04:00",
    allDay: false,
  });
});
it("parses a Chinese ordinal monthly recurrence", async () => {
  const result = await parse("每月最后一个星期五", context, {
    language: "zh-CN",
  });
  expect(result.occurrences[0].start).toBe("2026-09-25T00:00:00-04:00");
  expect(result.rrules[0]).toContain("FREQ=MONTHLY");
});

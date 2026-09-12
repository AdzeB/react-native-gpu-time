# Language support

Language packs are small, offline normalization modules in front of the English model. They cover short scheduling expressions, not general translation. They do not increase the model's multilingual training or establish real-world accuracy.

| Language           | ID      | Numeric date default                 | Examples                                       |
| ------------------ | ------- | ------------------------------------ | ---------------------------------------------- |
| English            | `en`    | MDY                                  | `tomorrow at 3pm`, `every Monday at 8pm`       |
| French             | `fr`    | DMY                                  | `demain à 15h`, `chaque lundi à 20h`           |
| Spanish            | `es`    | DMY                                  | `mañana a las 15:00`, `cada lunes a las 20:00` |
| Simplified Chinese | `zh-CN` | MDY; year-first dates also supported | `明天下午三点`, `每周一晚上八点`               |

## Initial coverage

French and Spanish include weekday and month names, relative days, numeric dates, clock times, common spoken hours, durations, weekly recurrence, and ordinal monthly recurrence. French accepts `15h` and `9h30`. Spanish accepts `a las nueve de la mañana` and dates such as `2 de octubre de 2027`. Supported number words are deliberately bounded by the vocabulary in each pack; arbitrary spelled-out quantities are not supported.

Simplified Chinese includes relative days, weekday expressions (`周`/`星期`), numeric and Chinese-numeral month/day dates, digit-by-digit years, clock periods, half/quarter hours, durations, weekly recurrence, and ordinal monthly recurrence. Examples:

- `明天上午九点半`: tomorrow at 09:30
- `明天下午三点一刻`: tomorrow at 15:15
- `十月二日下午八点`: October 2 at 20:00
- `二〇二七年十月二日下午八点`: October 2, 2027 at 20:00
- `二十分钟后`: in 20 minutes
- `每周一晚上八点`: every Monday at 20:00

This first Chinese pack targets Simplified Chinese scheduling phrases. Traditional Chinese, regional dialects, automatic script conversion, Chinese lunar calendar dates, festival names, and unrestricted prose are not supported. Ambiguous clock wording such as `晚上十二点` is rejected rather than converted to noon.

Unknown words and negation examples (`ne pas demain`, `no mañana`, `不要明天`) return `unsupported-language-input`. The normalizers retain all unknown text until validation; they never strip unknown words merely to obtain a parse. Known vocabulary in an unfamiliar arrangement can still be misinterpreted by the English model.

## Diagnostics and source positions

`normalizedText` shows the canonical English that reached the model. If normalization changes the phrase, diagnostic spans cover the whole original input. This is intentional: word reordering makes the English token offsets unsuitable for highlighting the original sentence. English input retains the original detailed offsets.

## Adding a language

A language pack is a plain TypeScript object:

```ts
import { defineParser, type LanguagePack } from "react-native-gpu-time";

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
```

This illustrative pack supports exactly one pattern. A reusable community pack can be published separately and passed directly to `defineParser`; no global registry, fork, or change to the core is needed. Returning `null` produces an unsupported-input diagnostic. Normalizers must be synchronous, deterministic, and must not mutate shared state.

Expanding beyond these bounded packs would require broader language-specific grammar, independently reviewed evaluation datasets, and potentially a newly trained multilingual model. Adding translated UI labels alone does not expand input-language support.

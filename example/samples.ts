import type { BuiltinLanguage } from "react-native-gpu-time";
export const samplePhrases: Record<BuiltinLanguage, string[]> = {
  en: [
    "tomorrow at 3pm",
    "every Monday at 8pm",
    "Mon 10pm-12am",
    "in 20 minutes for half an hour",
  ],
  fr: [
    "demain à 15h",
    "chaque lundi à 20h",
    "le 2 octobre à 20h",
    "dans 20 minutes",
  ],
  es: [
    "mañana a las 15:00",
    "cada lunes a las 20:00",
    "el 2 de octubre a las 20:00",
    "dentro de 20 minutos",
  ],
  "zh-CN": ["明天下午三点", "每周一晚上八点", "十月二日下午八点", "二十分钟后"],
};

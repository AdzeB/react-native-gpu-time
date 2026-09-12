import { french } from "./french.js";
import { spanish } from "./spanish.js";
import { chinese } from "./chinese.js";
import type { LanguagePack } from "./types.js";
export { french, spanish, chinese };
export type { LanguagePack };
export const english: LanguagePack = {
  id: "en",
  name: "English",
  dateOrder: "MDY",
  normalize: (text) => text,
};
export const languages = [english, french, spanish, chinese] as const;
export type BuiltinLanguage = "en" | "fr" | "es" | "zh-CN";
export function resolveLanguage(
  language: BuiltinLanguage | LanguagePack = "en",
): LanguagePack {
  if (
    typeof language === "object" &&
    language !== null &&
    typeof language.id === "string" &&
    typeof language.normalize === "function"
  )
    return language;
  const pack = languages.find((pack) => pack.id === language);
  if (!pack)
    throw new RangeError(
      `Unsupported language: ${String(language)}. Pass a LanguagePack to add a language.`,
    );
  return pack;
}

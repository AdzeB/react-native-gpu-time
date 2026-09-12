/** A language pack converts a supported phrase to the English model's grammar. */
export interface LanguagePack {
  readonly id: string;
  readonly name: string;
  readonly dateOrder?: "MDY" | "DMY";
  /** Return null for unsupported wording. Never silently discard unknown words. */
  normalize(text: string): string | null;
}

// The allowlist prevents an untranslated word from silently reaching the English model.
const englishWords = new Set(
  (
    "today tomorrow yesterday tonight next this last first second third fourth fifth " +
    "monday tuesday wednesday thursday friday saturday sunday january february march april may june july august september october november december " +
    "at in for from to until and of the every other each weekday weekdays weekend weekends day days week weeks month months year years " +
    "hour hours minute minutes second seconds half quarter past noon midnight am pm daily weekly monthly yearly after before " +
    "one two three four five six seven eight nine ten eleven twelve a an on starting except times"
  ).split(" "),
);

export function validateEnglish(text: string): string | null {
  const output = text.replace(/\s+/g, " ").trim();
  const words = output.match(/[a-zÀ-ž]+/gi) ?? [];
  if (words.some((word) => !englishWords.has(word.toLowerCase()))) return null;
  // Reject leftover CJK, symbols, or language-specific punctuation.
  if (/[^a-z\d\s:.,/\-+]/i.test(output)) return null;
  return output;
}

export function replaceWords(
  text: string,
  vocabulary: Record<string, string>,
): string {
  const names = Object.keys(vocabulary).sort((a, b) => b.length - a.length);
  const escaped = names.map((name) =>
    name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
  );
  // Include accents in word boundaries. JS \b only recognizes ASCII letters.
  const pattern = new RegExp(
    `(^|[^a-zà-ž])(${escaped.join("|")})(?=$|[^a-zà-ž])`,
    "gi",
  );
  return text.replace(
    pattern,
    (_, prefix: string, word: string) =>
      prefix + vocabulary[word.toLowerCase()],
  );
}

export function europeanClock(text: string): string {
  return text.replace(
    /\b(\d{1,2})\s*h(?:\s*(\d{2}))?\b/g,
    (_, hour, minute) => `${hour}:${minute ?? "00"}`,
  );
}

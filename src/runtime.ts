export function now(): number {
  return typeof performance !== "undefined" &&
    typeof performance.now === "function"
    ? performance.now()
    : Date.now();
}

// Schedule clauses contain only arrays, plain objects, and primitive values.
// Keep optional undefined fields without requiring a global structuredClone polyfill.
export function clonePlain<T>(value: T): T {
  if (Array.isArray(value)) return value.map(clonePlain) as T;
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, clonePlain(item)]),
    ) as T;
  }
  return value;
}

export function assertRuntime(): void {
  if (
    typeof Intl === "undefined" ||
    typeof Intl.DateTimeFormat !== "function" ||
    typeof Intl.DateTimeFormat.prototype.formatToParts !== "function"
  ) {
    throw new Error(
      "react-native-gpu-time requires Intl.DateTimeFormat.formatToParts with IANA timezone support. Use a current Hermes runtime or load an Intl DateTimeFormat polyfill before creating a parser.",
    );
  }
}

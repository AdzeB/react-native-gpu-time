# Validation

Verified on 12 September 2026. The example and public usage fixtures now use `America/New_York`.

## Library

- TypeScript source check passed.
- A clean `npm ci` passed after completing the optional-dependency lockfile entry.
- All source tests also passed in a checkout without Expo dependencies installed; the shared device checks have an independent TypeScript configuration.
- 832 tests passed, plus one inherited expected model failure (`negative-017`). This is a visible upstream limitation, not a newly waived failure.
- 55 language-pack cases cover French, Spanish, Simplified Chinese, custom packs, unsupported input, date order, recurrence, ranges, and timezone transitions.
- Eight tests against built ESM/CommonJS bundles passed. These include language parsing, missing browser globals, missing Intl support, unsupported GPU requests, and parser disposal.
- The build verified the unchanged model SHA-256 against `UPSTREAM.json`.
- ESM bundle: 127,339 bytes raw; 40,559 bytes Brotli. CommonJS: 127,806 bytes raw; 40,781 bytes Brotli. Both pass the 50,000-byte compressed-entry limit. These are bundle sizes, not app memory or download sizes.

## Example

- Expo SDK 57, React Native 0.86.3, React 19.2.3.
- Example TypeScript check passed.
- iOS and Android production exports compiled successfully to Hermes bytecode.
- iOS 18.6 simulator, iPhone 16 Pro, Expo Go with Hermes: all 13 compatibility checks passed. Confirmed all four languages produce September 13, 2026 at 15:00 in New York and captured fresh UI previews in `docs/images/`.
- Android 16 (API 36) emulator, Medium Phone, arm64-v8a, Expo Go with Hermes: all 13 compatibility checks passed.

The 13 device checks cover relative dates, overnight ranges, recurrence limits, conjoined times, a daylight saving transition, invalid times and timezones, batch ordering, day-first dates, disposal, and the three non-English language packs.

## Limits

No physical-device latency, battery, memory, or frame-rate benchmark was performed. Simulator timings should not be presented as mobile performance results. Real-world language accuracy and native-speaker review remain unmeasured. Language packs support the documented vocabulary and patterns; they do not constitute a multilingual-trained model.

The [GitHub Actions workflow](https://github.com/AdzeB/react-native-gpu-time/actions/workflows/ci.yml) verifies the package and exports the Expo example on every push and pull request. Consult its current run for hosted CI status. Installable archives are distributed through GitHub Releases; the package is not published to npm.

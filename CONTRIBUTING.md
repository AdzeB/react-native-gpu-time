# Contributing

This project welcomes additional language packs and corrections to existing ones.

## Set up

Use Node.js 22 or later. Run `npm ci`, then `npm run verify`. To work on the mobile example, run `npm run example:install`, then start Expo inside `example/`.

## Add or extend a language

1. Add a small file under `src/languages/` implementing `LanguagePack`. You can also distribute the pack as an independent package.
2. Keep normalization offline and deterministic. Return `null` when input contains unknown wording. Do not drop unknown words or silently translate negations away.
3. Choose an explicit numeric date order. Do not infer the input language from the user's timezone.
4. For a built-in pack, export it from `src/languages/index.ts`, add its ID to `BuiltinLanguage`, and add examples to `example/samples.ts`.
5. Add exact expected-date tests with a fixed reference and timezone. Cover clock times, relative dates, recurrence, ranges, ambiguity, invalid numbers, negation, and daylight saving changes where relevant.
6. Ask a fluent speaker to review the examples and explain regional assumptions in `docs/languages.md`.
7. Run `npm run verify`, repack the example, and run its compatibility checks in Expo Go. Include the device, OS, React Native version, and engine when reporting results.

A dictionary is not proof of unrestricted language support. Keep the documented coverage proportional to independently verified examples.

## Core changes

Preserve the model's numerical behavior, the public date/recurrence contracts, and explicit context validation. The model weight file is copied unchanged from upstream and verified by SHA-256 during every build. Do not hand-edit it or lower the bundle-size gate.

The inherited regression suite has one expected model failure, `negative-017`. Preserve that visible limitation until it is actually corrected. Do not mark new failures as expected to make CI pass.

## Pull requests

Describe the input that previously failed, the expected result, the change, and the checks performed. Include before/after screenshots for UI changes. Avoid introducing runtime dependencies for functionality already covered by standard JavaScript.

Contributions use the repository's MIT license. Preserve upstream attribution and third-party notices.

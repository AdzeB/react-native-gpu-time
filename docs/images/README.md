# UI previews

These are screenshots of the running Expo example on an iPhone 16 Pro simulator, captured with Hermes. They use `America/New_York` and the fixed reference `2026-09-12T12:00:00-04:00`.

| File | Language | Phrase |
| --- | --- | --- |
| `ios-english.png` | English | `tomorrow at 3pm` |
| `ios-french.png` | French | `demain à 15h` |
| `ios-spanish.png` | Spanish | `mañana a las 15:00` |
| `ios-chinese.png` | Simplified Chinese | `明天下午三点` |

Each phrase resolves to September 13, 2026 at 15:00 in New York. The images show real parsed results. Expo Go's developer button is hidden during capture, and the system status bar uses a fixed display time.

To refresh them, run the example, use the fixed reference and timezone above, select a language, parse its first sample, and capture the app at the top of the screen. Keep the filenames stable so the main README gallery stays valid. Use real captures rather than generated UI mockups.

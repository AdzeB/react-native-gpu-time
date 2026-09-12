import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
export default defineConfig({
  resolve: {
    // Device fixtures live under the example's package boundary. Exercise the
    // built library without requiring Expo's dependencies in the unit-test job.
    alias: {
      "react-native-gpu-time": fileURLToPath(
        new URL("./dist/index.js", import.meta.url),
      ),
    },
  },
  test: { include: ["test/**/*.test.ts"] },
});

import { expect, it } from "vitest";
import { runChecks } from "../example/checks/index.js";

it("passes the example app compatibility checks against the built package", async () => {
  const checks = await runChecks();
  expect(checks).toHaveLength(13);
  expect(checks.filter((check) => !check.passed)).toEqual([]);
});

import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error("Run this script with npm run example:install.");
const cwd = fileURLToPath(new URL("..", import.meta.url));
const run = (args, options = {}) =>
  execFileSync(process.execPath, [npmCli, ...args], {
    cwd,
    stdio: "inherit",
    ...options,
  });

run(["run", "build"]);
// npm 11 returns an array; npm 12 keys the records by package name.
const [archive] = Object.values(
  JSON.parse(
    run(["pack", "--ignore-scripts", "--json"], {
      encoding: "utf8",
      stdio: ["inherit", "pipe", "inherit"],
    }),
  ),
);
run(["install", "--prefix", "example", `./${archive.filename}`]);

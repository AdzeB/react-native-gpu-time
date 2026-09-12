import { build, transform } from "esbuild";
import { transformAsync } from "@babel/core";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { brotliCompressSync, constants, gzipSync } from "node:zlib";
import { createHash } from "node:crypto";

const provenance = JSON.parse(await readFile("UPSTREAM.json", "utf8"));
const weightsHash = createHash("sha256")
  .update(await readFile("src/model/weights.gen.ts"))
  .digest("hex");
if (weightsHash !== provenance.weightsSha256)
  throw new Error("Upstream model weights changed.");

await rm("dist", { recursive: true, force: true });
await mkdir("dist", { recursive: true });
const result = await build({
  entryPoints: ["src/index.ts"],
  bundle: true,
  write: false,
  format: "esm",
  platform: "neutral",
  target: "es2019",
  treeShaking: true,
  define: { GPU_TIME_DIAGNOSTICS: "false", GPU_TIME_STORAGE: '"f32"' },
});
// Hermes versions differ in support for Unicode property escapes. Lower them
// at build time while preserving the upstream tokenizer's Unicode semantics.
const lowered = await transformAsync(result.outputFiles[0].text, {
  babelrc: false,
  configFile: false,
  plugins: [
    [
      "@babel/plugin-transform-unicode-property-regex",
      { useUnicodeFlag: false },
    ],
  ],
});
const sizes = [];
for (const [format, filename] of [
  ["esm", "index.js"],
  ["cjs", "index.cjs"],
]) {
  const output = await transform(lowered.code, {
    format,
    target: "es2019",
    minify: true,
    legalComments: "none",
  });
  const code =
    "/*! Derived from gpu-time. Copyright (c) Arik Chakma. MIT license. */\n" +
    output.code;
  if (
    /navigator|GPUBufferUsage|requestAdapter|structuredClone|\.findLast\(|\.at\(/.test(
      output.code,
    )
  ) {
    throw new Error(
      "Unexpected browser or unsupported runtime API in the mobile bundle.",
    );
  }
  await writeFile(`dist/${filename}`, code);
  sizes.push({
    file: filename,
    bytes: Buffer.byteLength(code),
    gzipBytes: gzipSync(code, { level: 9 }).length,
    brotliBytes: brotliCompressSync(code, {
      params: { [constants.BROTLI_PARAM_QUALITY]: 11 },
    }).length,
  });
}
execFileSync(
  process.execPath,
  ["node_modules/typescript/bin/tsc", "-p", "tsconfig.build.json"],
  { stdio: "inherit" },
);
// Only declarations reachable from the public entry need to ship.
const { readdir } = await import("node:fs/promises");
const publicTypes = new Set([
  "index.d.ts",
  "core.d.ts",
  "types.d.ts",
  "labels.d.ts",
  "languages",
]);
for (const entry of await readdir("dist/types")) {
  if (!publicTypes.has(entry))
    await rm(`dist/types/${entry}`, { recursive: true, force: true });
}
await writeFile(
  "dist/size.json",
  JSON.stringify({ limitBytes: 50000, sizes }, null, 2) + "\n",
);
console.table(sizes);
if (sizes.some((item) => item.brotliBytes > 50000))
  throw new Error("Bundle exceeds the upstream 50,000-byte Brotli budget.");

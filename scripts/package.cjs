// Package locally, then validate the archive's entry point and declarations.
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { encoding: "utf8", ...options });
  if (result.error || result.status !== 0)
    throw new Error(
      `${command} failed: ${result.error?.message || result.stderr || result.stdout}`,
    );
  return result.stdout;
}

fs.mkdirSync(".artifacts", { recursive: true });
const packed = JSON.parse(
  run("npm", [
    "pack",
    "--ignore-scripts",
    "--json",
    "--pack-destination",
    ".artifacts",
  ]),
);
// npm 12 keys JSON output by package name; earlier versions return an array.
const archive = Array.isArray(packed)
  ? packed[0]
  : packed[require("../package.json").name];
assert.ok(
  archive?.filename && Array.isArray(archive.files),
  "npm pack returned no archive metadata",
);
const filename = path.resolve(".artifacts", archive.filename);
const temporary = fs.mkdtempSync(path.resolve(".artifacts", "package-check-"));
try {
  assert.ok(archive.files.some((file) => file.path === "dist/src/index.js"));
  assert.ok(archive.files.some((file) => file.path === "dist/src/index.d.ts"));
  assert.ok(
    archive.files.some((file) => file.path === "dist/chipmunk.bundle.js"),
  );
  assert.equal(
    archive.files.some((file) =>
      /(^|\/)(tests|credentials|node_modules)(\/|\.)/.test(file.path),
    ),
    false,
  );
  run("tar", ["-xzf", filename, "-C", temporary]);
  const entry = path.join(temporary, "package");
  const library = require(entry);
  assert.equal(typeof library.default, "function");
  assert.equal(typeof library.cleanConfig, "function");
  const client = library.default();
  client.cache.set("package-smoke", { id: 1 });
  assert.deepEqual(client.cache.get("package-smoke"), { id: 1 });
  client.cache.clear();

  fs.writeFileSync(
    path.join(temporary, "consumer.ts"),
    `
import createChipmunk, { IConfig, IActionOpts, IResult, IRequestError } from "./package";
const config: IConfig = { signal: new AbortController().signal };
const client = createChipmunk(config);
const options: IActionOpts = { params: { id: 1 }, body: new FormData(), signal: config.signal };
export async function consume(): Promise<IResult<{ id: number }>> {
  return client.action<{ id: number }>("um.widget", "get", options);
}
export function handle(error: IRequestError): string { return error.text || error.message; }
// @ts-expect-error A string is not an AbortSignal.
const invalid: IActionOpts = { signal: "invalid" };
void invalid;
`,
  );
  fs.writeFileSync(
    path.join(temporary, "tsconfig.json"),
    JSON.stringify({
      compilerOptions: {
        strict: true,
        noEmit: true,
        target: "ES2020",
        module: "Node16",
        moduleResolution: "Node16",
        types: ["node"],
        skipLibCheck: false,
      },
      files: ["consumer.ts"],
    }),
  );
  run(process.execPath, [
    "node_modules/typescript/bin/tsc",
    "-p",
    path.join(temporary, "tsconfig.json"),
  ]);
  console.log(
    `Validated ${archive.filename}: CommonJS entry point, browser bundle and TypeScript declarations.`,
  );
} finally {
  fs.rmSync(temporary, { recursive: true, force: true });
}

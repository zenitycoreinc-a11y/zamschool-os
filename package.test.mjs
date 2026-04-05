import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const packageJsonPath = resolve(process.cwd(), "package.json");
const nextConfigPath = resolve(process.cwd(), "next.config.ts");

test("standalone Next builds start from the standalone server entrypoint", async () => {
  const [packageSource, nextConfigSource] = await Promise.all([
    readFile(packageJsonPath, "utf8"),
    readFile(nextConfigPath, "utf8"),
  ]);

  const pkg = JSON.parse(packageSource);
  const usesStandaloneOutput = /output:\s*['"]standalone['"]/.test(nextConfigSource);

  assert.equal(usesStandaloneOutput, true);
  assert.equal(pkg.scripts.prestart, "node ./scripts/prepare-standalone.mjs");
  assert.equal(pkg.scripts.start, "node --env-file=.env.local .next/standalone/server.js");
});

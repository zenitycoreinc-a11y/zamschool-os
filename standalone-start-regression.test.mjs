import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { strict as assert } from "node:assert";

const projectRoot = process.cwd();
const packageJson = JSON.parse(readFileSync(resolve(projectRoot, "package.json"), "utf8"));

assert.equal(
  packageJson.scripts.start,
  "node --env-file=.env.local ./scripts/start-standalone.mjs",
  "The production start script should go through the standalone bootstrapper so static assets are synced before the server starts."
);

const bootstrapScript = resolve(projectRoot, "scripts", "start-standalone.mjs");

assert.ok(
  existsSync(bootstrapScript),
  "The standalone bootstrap script should exist."
);

const prepareRun = spawnSync(
  process.execPath,
  ["--env-file=.env.local", bootstrapScript, "--prepare-only"],
  {
    cwd: projectRoot,
    encoding: "utf8",
  }
);

assert.equal(
  prepareRun.status,
  0,
  `Preparing standalone assets should succeed.\nSTDOUT:\n${prepareRun.stdout}\nSTDERR:\n${prepareRun.stderr}`
);

const standaloneCssDir = resolve(projectRoot, ".next", "standalone", ".next", "static", "css");
const standalonePublicAsset = resolve(
  projectRoot,
  ".next",
  "standalone",
  "public",
  "avatar-placeholder.svg"
);

assert.ok(
  existsSync(standaloneCssDir),
  "The standalone static css directory should exist after bootstrap preparation."
);

assert.ok(
  readdirSync(standaloneCssDir).some((entry) => entry.endsWith(".css")),
  "The standalone static css directory should contain built CSS files."
);

assert.ok(
  existsSync(standalonePublicAsset),
  "The standalone public assets should be copied before the server starts."
);

console.log("standalone-start-regression.test.mjs passed");

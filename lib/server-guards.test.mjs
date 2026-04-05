import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { resolve, join } from "node:path";

const apiRoot = resolve(process.cwd(), "app", "api");
const serverGuardsPath = resolve(process.cwd(), "lib", "server-guards.ts");

async function collectRouteFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        return collectRouteFiles(fullPath);
      }

      return entry.isFile() && entry.name === "route.ts" ? [fullPath] : [];
    })
  );

  return files.flat();
}

test("api routes await applyRateLimit calls", async () => {
  const routeFiles = await collectRouteFiles(apiRoot);
  const failingRoutes = [];

  for (const routeFile of routeFiles) {
    const source = await readFile(routeFile, "utf8");
    if (!source.includes("applyRateLimit(")) {
      continue;
    }

    const unawaitedCall = /\bconst\s+\w+\s*=\s*applyRateLimit\(/.test(source);
    if (unawaitedCall) {
      failingRoutes.push(routeFile.replace(`${process.cwd()}\\`, ""));
    }
  }

  assert.deepEqual(
    failingRoutes,
    [],
    `Expected all applyRateLimit calls to be awaited, found: ${failingRoutes.join(", ")}`
  );
});

test("parseJsonWithSchema formats Zod validation failures from error.issues", async () => {
  const source = await readFile(serverGuardsPath, "utf8");

  assert.match(source, /error\.issues\.map/);
  assert.doesNotMatch(source, /error\.errors\.map/);
});

test("applyRateLimit defaults to fail-closed on Redis errors", async () => {
  const source = await readFile(serverGuardsPath, "utf8");

  assert.match(source, /params\.failOpen \? "failing open" : "failing closed"/);
  assert.match(source, /if \(params\.failOpen\) \{/);
  assert.match(source, /allowed: false as const/);
});

import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { assertStandaloneReady, syncStandaloneAssets } from "./prepare-standalone.mjs";

test("assertStandaloneReady fails when standalone static assets are missing", async () => {
  const root = await mkdtemp(join(tmpdir(), "standalone-missing-static-"));
  const standaloneRoot = join(root, ".next", "standalone");

  await mkdir(standaloneRoot, { recursive: true });
  await writeFile(join(standaloneRoot, "server.js"), "console.log('ok');");

  await assert.rejects(
    () => assertStandaloneReady(root),
    /Standalone static assets are missing/
  );
});

test("syncStandaloneAssets copies static assets into the standalone output and passes validation", async () => {
  const root = await mkdtemp(join(tmpdir(), "standalone-sync-"));
  const standaloneRoot = join(root, ".next", "standalone");
  const staticRoot = join(root, ".next", "static", "chunks");

  await mkdir(staticRoot, { recursive: true });
  await mkdir(standaloneRoot, { recursive: true });
  await writeFile(join(staticRoot, "app.js"), "console.log('chunk');");
  await writeFile(join(standaloneRoot, "server.js"), "console.log('ok');");

  await syncStandaloneAssets(root);
  await assert.doesNotReject(() => assertStandaloneReady(root));
});

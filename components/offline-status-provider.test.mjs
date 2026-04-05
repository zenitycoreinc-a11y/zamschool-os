import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const layoutPath = resolve(process.cwd(), "app", "app", "layout.tsx");
const providerPath = resolve(process.cwd(), "components", "OfflineStatusProvider.tsx");

test("authenticated app layout wraps children with the offline status provider", async () => {
  const source = await readFile(layoutPath, "utf8");

  assert.match(source, /OfflineStatusProvider/);
});

test("offline status provider registers the service worker and includes offline banner copy", async () => {
  const source = await readFile(providerPath, "utf8");

  assert.match(source, /navigator\.serviceWorker\.register\("\/sw\.js"\)/);
  assert.match(source, /warmOfflineCore/);
  assert.match(source, /OfflineStatusBanner/);
});

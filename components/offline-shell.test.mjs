import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const providerPath = resolve(process.cwd(), "components", "OfflineStatusProvider.tsx");
const bannerPath = resolve(process.cwd(), "components", "OfflineStatusBanner.tsx");

test("offline provider warms the curated offline core after auth is ready", async () => {
  const source = await readFile(providerPath, "utf8");

  assert.match(source, /warmOfflineCore/);
  assert.match(source, /OFFLINE_CORE_PAGE_URLS/);
  assert.match(source, /OFFLINE_CORE_API_URLS/);
});

test("offline banner exposes both slow-network and offline messaging", async () => {
  const source = await readFile(bannerPath, "utf8");

  assert.match(source, /Network is slow/);
  assert.match(source, /You are offline/);
  assert.match(source, /Last synced/);
});

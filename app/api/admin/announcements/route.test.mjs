import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const routePath = resolve(process.cwd(), "app", "api", "admin", "announcements", "route.ts");

test("admin announcements route normalizes target roles separately from legacy audience values", async () => {
  const source = await readFile(routePath, "utf8");

  assert.match(source, /normalizeAudienceForStorage/);
  assert.match(source, /normalizeTargetRoleForStorage/);
  assert.match(source, /normalizeTargetRoleForResponse/);
  assert.doesNotMatch(source, /function normalizeAudience/);
  assert.doesNotMatch(source, /function normalizeRoleFromAudience/);
});

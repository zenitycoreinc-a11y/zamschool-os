import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const pagePath = resolve(process.cwd(), "app", "(dashboard)", "teacher", "notifications", "page.tsx");

test("teacher notifications page exposes unread filters and a mark-all action", async () => {
  const source = await readFile(pagePath, "utf8");

  assert.match(source, /Mark all as read/);
  assert.match(source, /Unread/);
  assert.match(source, /Read/);
  assert.match(source, /markAll/);
  assert.match(source, /\/api\/teacher\/notifications/);
  assert.doesNotMatch(source, /\/api\/account\/notifications/);
});

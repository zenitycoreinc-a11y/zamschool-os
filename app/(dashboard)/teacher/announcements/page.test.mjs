import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const pagePath = resolve(process.cwd(), "app", "(dashboard)", "teacher", "announcements", "page.tsx");

test("teacher announcements page uses the dedicated teacher announcements API", async () => {
  const source = await readFile(pagePath, "utf8");

  assert.match(source, /\/api\/teacher\/announcements/);
  assert.doesNotMatch(source, /\/api\/account\/announcements/);
});

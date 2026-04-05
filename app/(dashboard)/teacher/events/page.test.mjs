import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const pagePath = resolve(process.cwd(), "app", "(dashboard)", "teacher", "events", "page.tsx");

test("teacher events page uses the dedicated teacher events API", async () => {
  const source = await readFile(pagePath, "utf8");

  assert.match(source, /\/api\/teacher\/events/);
  assert.doesNotMatch(source, /\/api\/account\/events/);
});

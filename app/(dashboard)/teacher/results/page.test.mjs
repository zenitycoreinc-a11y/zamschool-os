import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const pagePath = resolve(process.cwd(), "app", "(dashboard)", "teacher", "results", "page.tsx");

test("teacher results page exposes an explicit publish action for parent and student visibility", async () => {
  const source = await readFile(pagePath, "utf8");

  assert.match(source, /\/api\/teacher\/results-publish/);
  assert.match(source, /\/teacher\/teaching/);
  assert.match(source, /Publish/);
  assert.match(source, /View details/);
});

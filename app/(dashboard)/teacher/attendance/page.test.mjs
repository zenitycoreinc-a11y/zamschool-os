import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const pagePath = resolve(process.cwd(), "app", "(dashboard)", "teacher", "attendance", "page.tsx");

test("teacher attendance page loads historical attendance data with range and class filters", async () => {
  const source = await readFile(pagePath, "utf8");

  assert.match(source, /\/api\/teacher\/attendance\?/);
  assert.match(source, /\/teacher\/teaching/);
  assert.match(source, /Date range/);
  assert.match(source, /Class filter/);
  assert.match(source, /Student attendance history/);
});

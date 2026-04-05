import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const pagePath = resolve(process.cwd(), "app", "(dashboard)", "teacher", "teaching", "page.tsx");

test("teacher teaching hub exposes operational sections for the teacher workspace", async () => {
  const source = await readFile(pagePath, "utf8");

  assert.match(source, /Teacher Teaching Hub/);
  assert.match(source, /Teaching flow/);
  assert.match(source, /Student support/);
  assert.match(source, /Message families/);
  assert.match(source, /Mark rollcall/);
  assert.match(source, /\/teacher\/classes/);
  assert.match(source, /\/teacher\/attendance/);
  assert.match(source, /\/teacher\/assignments/);
  assert.match(source, /\/teacher\/results/);
  assert.match(source, /\/teacher\/students/);
  assert.match(source, /\/teacher\/messages/);
});

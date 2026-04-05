import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const pagePath = resolve(process.cwd(), "app", "(dashboard)", "teacher", "students", "page.tsx");

test("teacher students page provides searchable student roster navigation", async () => {
  const source = await readFile(pagePath, "utf8");

  assert.match(source, /Students/);
  assert.match(source, /My students/);
  assert.match(source, /Search students/);
  assert.match(source, /All classes/);
  assert.match(source, /Sort by name/);
  assert.match(source, /\/api\/teacher\/students/);
  assert.match(source, /\/teacher\/students\/\$\{student\.id\}/);
  assert.match(source, /Open any student to view their full profile/);
});

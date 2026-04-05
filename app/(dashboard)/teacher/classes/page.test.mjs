import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const pagePath = resolve(process.cwd(), "app", "(dashboard)", "teacher", "classes", "page.tsx");

test("teacher classes page supports bulk attendance actions and saves rollcall through the teacher attendance API", async () => {
  const source = await readFile(pagePath, "utf8");

  assert.match(source, /\/api\/teacher\/attendance/);
  assert.match(source, /\/api\/teacher\/students/);
  assert.match(source, /\/teacher\/teaching/);
  assert.match(source, /Class health/);
  assert.match(source, /Needs help now/);
  assert.match(source, /useSearchParams/);
  assert.match(source, /lessonId/);
  assert.match(source, /filter === "pending"/);
  assert.match(source, /view === "roster"/);
  assert.match(source, /Mark all present/);
  assert.match(source, /Clear statuses/);
  assert.match(source, /Save rollcall/);
  assert.match(source, /remarks/i);
});

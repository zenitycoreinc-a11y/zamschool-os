import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const routePath = resolve(
  process.cwd(),
  "app",
  "api",
  "teacher",
  "results-publish",
  "route.ts"
);

test("teacher results publish route enforces teacher auth assignment scope and publish metadata", async () => {
  const source = await readFile(routePath, "utf8");

  assert.match(source, /requireTeacherContext/);
  assert.match(source, /loadTeacherAssignmentScope/);
  assert.match(source, /published_at/);
  assert.match(source, /published_by/);
  assert.match(source, /notifications/);
});

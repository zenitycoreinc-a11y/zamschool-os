import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const routePath = resolve(process.cwd(), "app", "api", "teacher", "assignments", "route.ts");

test("teacher assignments route keeps assignments visible even before results exist", async () => {
  const source = await readFile(routePath, "utf8");

  assert.doesNotMatch(source, /results!inner\(/);
  assert.match(source, /results\(/);
});

test("teacher assignments route avoids non-existent assignments.updated_at schema dependency", async () => {
  const source = await readFile(routePath, "utf8");

  assert.doesNotMatch(source, /\bupdated_at\b/);
});

test("teacher assignments route aggregates real submission progress and grading metrics", async () => {
  const source = await readFile(routePath, "utf8");

  assert.match(source, /assignment_submissions/);
  assert.match(source, /\bsubmittedCount\b/);
  assert.match(source, /\btotalStudents\b/);
  assert.match(source, /\bgradedCount\b/);
  assert.match(source, /\bpendingGrades\b/);
});

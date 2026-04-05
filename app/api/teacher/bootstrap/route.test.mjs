import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const routePath = resolve(process.cwd(), "app", "api", "teacher", "bootstrap", "route.ts");

test("teacher bootstrap route stays teacher-scoped and summary-only", async () => {
  const source = await readFile(routePath, "utf8");

  assert.match(source, /export async function GET/);
  assert.match(source, /requireTeacherContext/);
  assert.match(source, /jsonWithPrivateCache/);
  assert.match(source, /displayName/);
  assert.match(source, /schoolName/);
  assert.match(source, /yearTerm/);
  assert.match(source, /stats:/);
  assert.match(source, /workload:/);
  assert.doesNotMatch(source, /recentAssignments/);
  assert.doesNotMatch(source, /recentAttendance/);
  assert.doesNotMatch(source, /recentResults/);
  assert.doesNotMatch(source, /roster:/);
});

test("teacher bootstrap route tolerates legacy profile and teacher columns", async () => {
  const source = await readFile(routePath, "utf8");

  assert.match(source, /const selectAttempts = \[/);
  assert.match(source, /photo_url/);
  assert.match(source, /employee_id/);
  assert.match(source, /isMissingColumnError/);
});

import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const routePath = resolve(process.cwd(), "app", "api", "teacher", "dashboard", "route.ts");

test("teacher dashboard route composes teacher-scoped workload data", async () => {
  const source = await readFile(routePath, "utf8");

  assert.match(source, /export async function GET/);
  assert.match(source, /requireTeacherContext/);
  assert.match(source, /loadTeacherAssignmentScope|loadTeacherAccountDetail|loadTeacherAccountDetail/);
  assert.match(source, /from\("messages"\)/);
  assert.match(source, /from\("notifications"\)/);
  assert.match(source, /from\("events"\)/);
  assert.match(source, /from\("assignments"\)/);
  assert.match(source, /from\("results"\)/);
});

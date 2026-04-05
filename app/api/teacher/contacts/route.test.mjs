import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const routePath = resolve(process.cwd(), "app", "api", "teacher", "contacts", "route.ts");

test("teacher contacts route returns teacher-safe contact discovery within the same school", async () => {
  const source = await readFile(routePath, "utf8");

  assert.match(source, /export async function GET/);
  assert.match(source, /requireTeacherContext/);
  assert.match(source, /loadTeacherMessagingAccess/);
  assert.match(source, /allowedProfileIds/);
  assert.match(source, /searchParams\.get\("role"\)/);
  assert.match(source, /normalizeRoleFilter/);
  assert.match(source, /from\("profiles"\)/);
  assert.match(source, /\.in\("id", accessData\.allowedProfileIds\)/);
  assert.match(source, /\.in\("role"/);
  assert.match(source, /school_id/);
  assert.match(source, /role/);
  assert.doesNotMatch(source, /\.neq\("id", access\.context\.userId\)/);
});

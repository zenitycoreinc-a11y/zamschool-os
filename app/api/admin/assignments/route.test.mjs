import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const routePath = resolve(process.cwd(), "app", "api", "admin", "assignments", "route.ts");

test("admin assignments route uses request-scoped admin auth and the live assignments table", async () => {
  const source = await readFile(routePath, "utf8");

  assert.match(source, /export async function GET/);
  assert.match(source, /export async function POST/);
  assert.match(source, /export async function PUT/);
  assert.match(source, /export async function DELETE/);
  assert.match(source, /requireAdminContext\(req\)/);
  assert.match(source, /from\("assignments"\)/);
  assert.match(source, /export async function GET[\s\S]*const access = await requireAdminContext\(req\);/);
  assert.match(source, /export async function POST[\s\S]*const access = await requireAdminContext\(req\);/);
  assert.match(source, /export async function PUT[\s\S]*const access = await requireAdminContext\(req\);/);
  assert.match(source, /export async function DELETE[\s\S]*const access = await requireAdminContext\(req\);/);
  assert.match(source, /subjectId/);
  assert.match(source, /classId/);
  assert.match(source, /teacherId/);
  assert.match(source, /dueDate/);
  assert.match(source, /totalMarks/);
  assert.match(source, /validateAdminManagedAssignmentTarget/);
  assert.match(source, /validateAssignmentTarget/);
  assert.match(source, /fetchAssignmentRecord/);
  assert.match(source, /fetchTeacherAssignmentReferences/);
  assert.match(source, /subjects\(name\)/);
  assert.match(source, /classes\(name\)/);
  assert.match(source, /assignments_teacher_id_fkey/);
});

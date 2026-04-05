import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const routePath = resolve(process.cwd(), "app", "api", "teacher", "attendance", "route.ts");

test("teacher attendance route supports both saving rollcall and loading historical attendance windows", async () => {
  const source = await readFile(routePath, "utf8");

  assert.match(source, /export async function GET/);
  assert.match(source, /export async function POST/);
  assert.match(source, /buildAttendanceWindow/);
  assert.match(source, /summarizeAttendance/);
  assert.match(source, /requireTeacherContext/);
});

test("teacher attendance route preserves distinct lesson sessions when upserting rollcall", async () => {
  const source = await readFile(routePath, "utf8");

  assert.match(source, /buildAttendanceUpsertRows/);
  assert.match(
    source,
    /onConflict:\s*"school_id,class_id,student_id,attendance_date,session_name,session_time"/
  );
});

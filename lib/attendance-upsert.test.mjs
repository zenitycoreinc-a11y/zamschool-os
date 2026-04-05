import test from "node:test";
import assert from "node:assert/strict";

import { buildAttendanceUpsertRows } from "./attendance-upsert.ts";

test("buildAttendanceUpsertRows creates one row per student for a lesson date", () => {
  const rows = buildAttendanceUpsertRows({
    schoolId: "school-1",
    classId: "class-1",
    markedBy: "teacher-1",
    date: "2026-03-18",
    sessionName: "English Reading Circle",
    sessionTime: "08:00:00",
    statuses: [
      { studentId: "student-1", status: "PRESENT" },
      { studentId: "student-2", status: "ABSENT" },
    ],
  });

  assert.equal(rows.length, 2);
  assert.equal(rows[1].class_id, "class-1");
  assert.equal(rows[1].session_name, "English Reading Circle");
  assert.equal(rows[1].session_time, "08:00:00");
  assert.equal(rows[1].attendance_date, "2026-03-18");
  assert.equal(rows[1].recorded_by, "teacher-1");
  assert.equal(rows[1].status, "absent");
});

test("buildAttendanceUpsertRows keeps session time on every row so repeated lesson names stay distinct", () => {
  const morningRows = buildAttendanceUpsertRows({
    schoolId: "school-1",
    classId: "class-1",
    markedBy: "teacher-1",
    date: "2026-03-18",
    sessionName: "Mathematics",
    sessionTime: "08:00:00",
    statuses: [{ studentId: "student-1", status: "PRESENT" }],
  });
  const afternoonRows = buildAttendanceUpsertRows({
    schoolId: "school-1",
    classId: "class-1",
    markedBy: "teacher-1",
    date: "2026-03-18",
    sessionName: "Mathematics",
    sessionTime: "13:00:00",
    statuses: [{ studentId: "student-1", status: "ABSENT" }],
  });

  assert.equal(morningRows[0].session_name, afternoonRows[0].session_name);
  assert.notEqual(morningRows[0].session_time, afternoonRows[0].session_time);
});

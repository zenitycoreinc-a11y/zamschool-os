import test from "node:test";
import assert from "node:assert/strict";

import { buildAttendanceNotificationPayloads } from "./attendance-notifications.ts";

test("buildAttendanceNotificationPayloads fans out the same status to student and parents", () => {
  const rows = buildAttendanceNotificationPayloads({
    studentUserId: "student-1",
    studentId: "student-1",
    lessonId: "lesson-1",
    parents: [{ id: "parent-1" }, { id: "parent-2" }],
    studentName: "Mary Banda",
    className: "Grade 7A",
    lessonName: "Mathematics",
    teacherName: "Mr Phiri",
    date: "2026-03-18",
    timeLabel: "08:00",
    status: "LATE",
  });

  assert.equal(rows.length, 3);
  assert.deepEqual(
    rows.map((row) => row.user_id),
    ["student-1", "parent-1", "parent-2"]
  );
  assert.match(rows[0].message, /LATE/i);
  assert.equal(rows[0].message, rows[1].message);
  assert.equal(rows[1].message, rows[2].message);
});

test("buildAttendanceNotificationPayloads generates a stable dedupe key per recipient and lesson event", () => {
  const rows = buildAttendanceNotificationPayloads({
    studentUserId: "student-1",
    studentId: "student-1",
    lessonId: "lesson-1",
    parents: [{ id: "parent-1" }],
    studentName: "Mary Banda",
    className: "Grade 7A",
    lessonName: "Mathematics",
    teacherName: "Mr Phiri",
    date: "2026-03-18",
    status: "ABSENT",
  });

  assert.equal(rows[0].dedupe_key, "student-1:student-1:lesson-1:2026-03-18");
  assert.equal(rows[1].dedupe_key, "parent-1:student-1:lesson-1:2026-03-18");
});

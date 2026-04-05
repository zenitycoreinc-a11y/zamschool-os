import test from "node:test";
import assert from "node:assert/strict";

import { buildResultNotificationPayloads } from "./result-notifications.ts";

test("buildResultNotificationPayloads fans out published results to student and parents", () => {
  const rows = buildResultNotificationPayloads({
    studentUserId: "student-1",
    studentId: "student-row-1",
    resultId: "result-1",
    parents: [{ id: "parent-1" }, { id: "parent-2" }],
    studentName: "Mary Banda",
    className: "Grade 7A",
    subjectName: "Mathematics",
    assignmentTitle: "Weekly Test",
    teacherName: "Mr Phiri",
    publishedAt: "2026-03-23T10:30:00.000Z",
  });

  assert.equal(rows.length, 3);
  assert.deepEqual(
    rows.map((row) => row.user_id),
    ["student-1", "parent-1", "parent-2"]
  );
  assert.match(rows[0].title, /Weekly Test/);
  assert.match(rows[0].message, /published/i);
  assert.equal(rows[0].message, rows[1].message);
  assert.equal(rows[0].type, "general");
});

test("buildResultNotificationPayloads generates stable dedupe keys per recipient and result", () => {
  const rows = buildResultNotificationPayloads({
    studentUserId: "student-1",
    studentId: "student-row-1",
    resultId: "result-1",
    parents: [{ id: "parent-1" }],
    studentName: "Mary Banda",
    className: "Grade 7A",
    subjectName: "English",
    assignmentTitle: "Comprehension Test",
    teacherName: "Mr Phiri",
    publishedAt: "2026-03-23T10:30:00.000Z",
  });

  assert.equal(rows[0].dedupe_key, "student-1:student-row-1:result:result-1");
  assert.equal(rows[1].dedupe_key, "parent-1:student-row-1:result:result-1");
});

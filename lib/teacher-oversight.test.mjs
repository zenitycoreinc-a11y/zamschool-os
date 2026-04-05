import test from "node:test";
import assert from "node:assert/strict";

import {
  buildTeacherOversightDossier,
  buildTeacherTenure,
} from "./teacher-oversight.ts";

test("buildTeacherTenure returns day, month, and year labels", () => {
  assert.deepEqual(
    buildTeacherTenure("2026-03-01", new Date("2026-03-23T00:00:00.000Z")),
    { label: "22 days", days: 22 }
  );
  assert.deepEqual(
    buildTeacherTenure("2025-12-01", new Date("2026-03-23T00:00:00.000Z")),
    { label: "3 months", days: 112 }
  );
  assert.deepEqual(
    buildTeacherTenure("2023-03-23", new Date("2026-03-23T00:00:00.000Z")),
    { label: "3 years", days: 1096 }
  );
});

test("buildTeacherOversightDossier summarizes load and pending roll calls", () => {
  const dossier = buildTeacherOversightDossier({
    todayDate: "2026-03-23",
    todayLessonDayOfWeek: 1,
    supervisedClasses: [
      { id: "class-1", name: "Grade 8 - East" },
      { id: "class-1", name: "Grade 8 - East" },
      { id: "class-2", name: "Grade 9 - West" },
    ],
    lessons: [
      {
        id: "lesson-1",
        title: "Mathematics",
        classId: "class-1",
        className: "Grade 8 - East",
        subjectId: "subject-1",
        subjectName: "Mathematics",
        dayOfWeek: 1,
        startTime: "08:00:00",
      },
      {
        id: "lesson-2",
        title: "Science",
        classId: "class-2",
        className: "Grade 9 - West",
        subjectId: "subject-2",
        subjectName: "Science",
        dayOfWeek: 1,
        startTime: "10:30:00",
      },
      {
        id: "lesson-3",
        title: "English",
        classId: "class-3",
        className: "Grade 7 - North",
        subjectId: "subject-3",
        subjectName: "English",
        dayOfWeek: 3,
        startTime: "09:00:00",
      },
    ],
    attendanceRows: [
      {
        id: "attendance-1",
        date: "2026-03-23",
        status: "present",
        classId: "class-1",
        sessionName: "Mathematics",
        sessionTime: "08:00:00",
        createdAt: "2026-03-23T08:15:00.000Z",
      },
      {
        id: "attendance-2",
        date: "2026-03-22",
        status: "present",
        classId: "class-3",
        sessionName: "English",
        sessionTime: "09:00:00",
        createdAt: "2026-03-22T09:10:00.000Z",
      },
    ],
    assignments: [
      {
        id: "assignment-1",
        title: "Fractions Quiz",
        classId: "class-1",
        className: "Grade 8 - East",
        subjectName: "Mathematics",
        dueDate: "2026-03-30",
        createdAt: "2026-03-20T12:00:00.000Z",
      },
    ],
    results: [
      {
        id: "result-1",
        assignmentId: "assignment-1",
        subjectName: "Mathematics",
        studentName: "Student One",
        score: 84,
        grade: "B",
        createdAt: "2026-03-21T09:00:00.000Z",
      },
    ],
  });

  assert.equal(dossier.stats.supervisedClasses, 2);
  assert.equal(dossier.stats.teachingClasses, 3);
  assert.equal(dossier.stats.weeklyLessons, 3);
  assert.equal(dossier.stats.todayLessons, 2);
  assert.equal(dossier.stats.completedRollCalls, 1);
  assert.equal(dossier.stats.pendingRollCalls, 1);
  assert.equal(dossier.activity.lastAttendanceAt, "2026-03-23T08:15:00.000Z");
  assert.equal(dossier.activity.lastAssignmentAt, "2026-03-20T12:00:00.000Z");
  assert.equal(dossier.activity.lastResultAt, "2026-03-21T09:00:00.000Z");
  assert.equal(dossier.supervisedClasses.length, 2);
});

test("buildTeacherOversightDossier keeps newest activity first", () => {
  const dossier = buildTeacherOversightDossier({
    todayDate: "2026-03-23",
    todayLessonDayOfWeek: 1,
    supervisedClasses: [],
    lessons: [],
    attendanceRows: [
      { id: "old", createdAt: "2026-03-20T08:00:00.000Z" },
      { id: "new", createdAt: "2026-03-21T08:00:00.000Z" },
    ],
    assignments: [
      { id: "assignment-old", createdAt: "2026-03-20T07:00:00.000Z" },
      { id: "assignment-new", createdAt: "2026-03-22T07:00:00.000Z" },
    ],
    results: [
      { id: "result-old", createdAt: "2026-03-18T07:00:00.000Z" },
      { id: "result-new", createdAt: "2026-03-23T07:00:00.000Z" },
    ],
  });

  assert.equal(dossier.recentAttendance[0].id, "new");
  assert.equal(dossier.recentAssignments[0].id, "assignment-new");
  assert.equal(dossier.recentResults[0].id, "result-new");
});

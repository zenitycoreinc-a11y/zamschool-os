import test from "node:test";
import assert from "node:assert/strict";

import {
  buildAcademicContextLabel,
  buildAttendanceSessionKey,
  buildParentLinkedStudentProfiles,
  buildTeacherActorIds,
  buildTeacherDirectory,
  mapLessonRows,
  normalizeTimeValue,
} from "./live-schema-adapters.ts";

test("buildAcademicContextLabel falls back when year and term are missing", () => {
  assert.equal(buildAcademicContextLabel(undefined, undefined), "Academic Context");
});

test("buildAcademicContextLabel joins available parts", () => {
  assert.equal(buildAcademicContextLabel("2026", "Term 1"), "2026 - Term 1");
  assert.equal(buildAcademicContextLabel("2026", undefined), "2026");
});

test("buildTeacherDirectory maps teacher ids to profile display names", () => {
  const directory = buildTeacherDirectory(
    [
      { id: "teacher-row-1", profile_id: "profile-1" },
      { id: "teacher-row-2", profile_id: "profile-2" },
    ],
    [
      { id: "profile-1", first_name: "Demo", last_name: "Teacher", email: "teacher@example.com" },
      { id: "profile-2", first_name: "Jane", last_name: "Phiri", email: "jane@example.com" },
    ]
  );

  assert.deepEqual(directory.options, [
    { id: "teacher-row-1", label: "Demo Teacher" },
    { id: "teacher-row-2", label: "Jane Phiri" },
  ]);
  assert.equal(directory.nameByTeacherId["teacher-row-1"], "Demo Teacher");
});

test("buildTeacherActorIds includes both profile and teacher row ids", () => {
  assert.deepEqual(
    buildTeacherActorIds({
      actorProfileId: "profile-1",
      teachers: [
        { id: "teacher-row-1", profile_id: "profile-1" },
        { id: "teacher-row-2", profile_id: "profile-2" },
      ],
    }),
    ["profile-1", "teacher-row-1"]
  );
});

test("buildParentLinkedStudentProfiles maps parent links back to student profile ids", () => {
  const scoped = buildParentLinkedStudentProfiles({
    actorProfileId: "parent-profile-1",
    actorSchoolId: "school-1",
    parents: [
      { id: "parent-row-1", profile_id: "parent-profile-1" },
      { id: "parent-row-2", profile_id: "parent-profile-2" },
    ],
    students: [
      { id: "student-row-1", profile_id: "student-profile-1", school_id: "school-1" },
      { id: "student-row-2", profile_id: "student-profile-2", school_id: "school-2" },
    ],
    links: [
      { parent_id: "parent-row-1", student_id: "student-row-1", relationship: "Guardian" },
      { parent_id: "parent-row-1", student_id: "student-row-2", relationship: "Guardian" },
      { parent_id: "parent-row-2", student_id: "student-row-1", relationship: "Guardian" },
    ],
  });

  assert.deepEqual(scoped.profileIds, ["student-profile-1"]);
  assert.equal(scoped.relationshipByProfileId.get("student-profile-1"), "Guardian");
  assert.equal(scoped.studentRowIdByProfileId.get("student-profile-1"), "student-row-1");
  assert.equal(scoped.profileIdByStudentRowId.get("student-row-1"), "student-profile-1");
});

test("buildAttendanceSessionKey normalizes names and times", () => {
  assert.equal(normalizeTimeValue("08:00:00"), "08:00");
  assert.equal(
    buildAttendanceSessionKey({
      classId: "class-1",
      studentId: "student-1",
      sessionName: "English Reading Circle",
      sessionTime: "08:00:00",
    }),
    "class-1:student-1:english reading circle:08:00"
  );
});

test("mapLessonRows uses direct class, subject, and teacher ids", () => {
  const rows = mapLessonRows(
    [
      {
        id: "lesson-1",
        title: "English Reading Circle",
        class_id: "class-1",
        subject_id: "subject-1",
        teacher_id: "teacher-row-1",
        start_time: "08:00:00",
        end_time: "09:00:00",
      },
    ],
    { "class-1": "Grade 7A" },
    { "subject-1": "English" },
    { "teacher-row-1": "Demo Teacher" }
  );

  assert.equal(rows[0].class, "Grade 7A");
  assert.equal(rows[0].subject, "English");
  assert.equal(rows[0].teacher, "Demo Teacher");
  assert.equal(rows[0].time, "08:00 - 09:00");
});

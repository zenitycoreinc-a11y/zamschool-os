import test from "node:test";
import assert from "node:assert/strict";

import {
  validateAdminManagedAssignmentTarget,
  buildTeacherConflictIds,
  findLessonSchedulingConflict,
  normalizeAssignedTeacherProfileId,
  validateLessonAssignment,
  validateTeacherManagedAssignmentTarget,
  validateSupervisorAssignment,
} from "./teacher-assignment-contract.ts";

const teacherProfiles = [
  { id: "teacher-profile-1", school_id: "school-1", role: "teacher" },
  { id: "teacher-profile-2", school_id: "school-1", role: "TEACHER" },
  { id: "teacher-profile-3", school_id: "school-2", role: "teacher" },
  { id: "parent-profile-1", school_id: "school-1", role: "parent" },
];

const teacherRows = [
  { id: "teacher-row-1", profile_id: "teacher-profile-1", school_id: "school-1" },
  { id: "teacher-row-2", profile_id: "teacher-profile-3", school_id: "school-2" },
];

test("normalizeAssignedTeacherProfileId accepts a teacher profile id in the same school", () => {
  assert.equal(
    normalizeAssignedTeacherProfileId({
      teacherId: "teacher-profile-1",
      schoolId: "school-1",
      teacherProfiles,
      teacherRows,
    }),
    "teacher-profile-1"
  );
});

test("normalizeAssignedTeacherProfileId resolves a teacher row id back to the teacher profile", () => {
  assert.equal(
    normalizeAssignedTeacherProfileId({
      teacherId: "teacher-row-1",
      schoolId: "school-1",
      teacherProfiles,
      teacherRows,
    }),
    "teacher-profile-1"
  );
});

test("validateSupervisorAssignment rejects non-teacher or cross-school supervisors", () => {
  assert.deepEqual(
    validateSupervisorAssignment({
      schoolId: "school-1",
      supervisorId: "parent-profile-1",
      teacherProfiles,
      teacherRows,
    }),
    {
      ok: false,
      status: 400,
      error: "Supervisor must be an active teacher in this school",
    }
  );

  assert.deepEqual(
    validateSupervisorAssignment({
      schoolId: "school-1",
      supervisorId: "teacher-profile-3",
      teacherProfiles,
      teacherRows,
    }),
    {
      ok: false,
      status: 400,
      error: "Supervisor must be an active teacher in this school",
    }
  );
});

test("validateLessonAssignment enforces school-scoped class subject and teacher references", () => {
  assert.deepEqual(
    validateLessonAssignment({
      schoolId: "school-1",
      classRow: { id: "class-1", school_id: "school-2" },
      subjectRow: { id: "subject-1", school_id: "school-1" },
      teacherId: "teacher-profile-1",
      teacherProfiles,
      teacherRows,
      dayOfWeek: 1,
      startTime: "08:00",
      endTime: "09:00",
    }),
    {
      ok: false,
      status: 404,
      error: "Class not found in this school",
    }
  );

  assert.deepEqual(
    validateLessonAssignment({
      schoolId: "school-1",
      classRow: { id: "class-1", school_id: "school-1" },
      subjectRow: { id: "subject-1", school_id: "school-2" },
      teacherId: "teacher-profile-1",
      teacherProfiles,
      teacherRows,
      dayOfWeek: 1,
      startTime: "08:00",
      endTime: "09:00",
    }),
    {
      ok: false,
      status: 404,
      error: "Subject not found in this school",
    }
  );
});

test("validateLessonAssignment rejects invalid teacher references and invalid time ranges", () => {
  assert.deepEqual(
    validateLessonAssignment({
      schoolId: "school-1",
      classRow: { id: "class-1", school_id: "school-1" },
      subjectRow: { id: "subject-1", school_id: "school-1" },
      teacherId: "parent-profile-1",
      teacherProfiles,
      teacherRows,
      dayOfWeek: 1,
      startTime: "08:00",
      endTime: "09:00",
    }),
    {
      ok: false,
      status: 400,
      error: "Teacher must be an active teacher in this school",
    }
  );

  assert.deepEqual(
    validateLessonAssignment({
      schoolId: "school-1",
      classRow: { id: "class-1", school_id: "school-1" },
      subjectRow: { id: "subject-1", school_id: "school-1" },
      teacherId: "teacher-profile-1",
      teacherProfiles,
      teacherRows,
      dayOfWeek: 1,
      startTime: "09:00",
      endTime: "09:00",
    }),
    {
      ok: false,
      status: 400,
      error: "Lesson end time must be after start time",
    }
  );
});

test("validateLessonAssignment returns the normalized teacher profile id for valid assignments", () => {
  assert.deepEqual(
    validateLessonAssignment({
      schoolId: "school-1",
      classRow: { id: "class-1", school_id: "school-1" },
      subjectRow: { id: "subject-1", school_id: "school-1" },
      teacherId: "teacher-row-1",
      teacherProfiles,
      teacherRows,
      dayOfWeek: 2,
      startTime: "10:00",
      endTime: "11:00",
    }),
    {
      ok: true,
      data: {
        teacherProfileId: "teacher-profile-1",
        teacherRowId: "teacher-row-1",
      },
    }
  );
});

test("buildTeacherConflictIds includes both the teacher profile id and legacy teacher row ids", () => {
  assert.deepEqual(
    buildTeacherConflictIds({
      teacherProfileId: "teacher-profile-1",
      teacherRows: [
        { id: "teacher-row-1", profile_id: "teacher-profile-1", school_id: "school-1" },
      ],
    }).sort(),
    ["teacher-profile-1", "teacher-row-1"]
  );
});

test("validateTeacherManagedAssignmentTarget rejects unauthorized classes and foreign-school subjects", () => {
  assert.deepEqual(
    validateTeacherManagedAssignmentTarget({
      schoolId: "school-1",
      classId: "class-2",
      subjectId: "subject-1",
      allowedClassIds: ["class-1"],
      classRow: { id: "class-2", school_id: "school-1" },
      subjectRow: { id: "subject-1", school_id: "school-1" },
    }),
    {
      ok: false,
      status: 404,
      error: "Class not found or access denied",
    }
  );

  assert.deepEqual(
    validateTeacherManagedAssignmentTarget({
      schoolId: "school-1",
      classId: "class-1",
      subjectId: "subject-2",
      allowedClassIds: ["class-1"],
      classRow: { id: "class-1", school_id: "school-1" },
      subjectRow: { id: "subject-2", school_id: "school-2" },
    }),
    {
      ok: false,
      status: 404,
      error: "Subject not found in this school",
    }
  );
});

test("validateAdminManagedAssignmentTarget enforces school-scoped class subject and teacher references", () => {
  assert.deepEqual(
    validateAdminManagedAssignmentTarget({
      schoolId: "school-1",
      classRow: { id: "class-1", school_id: "school-1" },
      subjectRow: { id: "subject-1", school_id: "school-1" },
      teacherId: "teacher-row-1",
      teacherProfiles,
      teacherRows,
    }),
    {
      ok: true,
      data: {
        classId: "class-1",
        subjectId: "subject-1",
        teacherProfileId: "teacher-profile-1",
        teacherRowId: "teacher-row-1",
      },
    }
  );

  assert.deepEqual(
    validateAdminManagedAssignmentTarget({
      schoolId: "school-1",
      classRow: { id: "class-2", school_id: "school-2" },
      subjectRow: { id: "subject-1", school_id: "school-1" },
      teacherId: "teacher-profile-1",
      teacherProfiles,
      teacherRows,
    }),
    {
      ok: false,
      status: 404,
      error: "Class not found in this school",
    }
  );
});

test("findLessonSchedulingConflict blocks overlapping class slots and teacher double-booking", () => {
  const lessons = [
    {
      id: "lesson-1",
      class_id: "class-1",
      teacher_id: "teacher-profile-1",
      subject_id: "subject-1",
      day_of_week: 1,
      start_time: "08:00",
      end_time: "09:00",
    },
    {
      id: "lesson-2",
      class_id: "class-2",
      teacher_id: "teacher-profile-2",
      subject_id: "subject-2",
      day_of_week: 1,
      start_time: "10:00",
      end_time: "11:00",
    },
  ];

  assert.deepEqual(
    findLessonSchedulingConflict({
      candidate: {
        class_id: "class-1",
        teacher_id: "teacher-profile-2",
        subject_id: "subject-3",
        day_of_week: 1,
        start_time: "08:30",
        end_time: "09:15",
      },
      lessons,
    }),
    {
      lessonId: "lesson-1",
      scope: "class",
      error: "This class already has a lesson scheduled during that time",
    }
  );

  assert.deepEqual(
    findLessonSchedulingConflict({
      candidate: {
        class_id: "class-3",
        teacher_id: "teacher-profile-2",
        subject_id: "subject-3",
        day_of_week: 1,
        start_time: "10:15",
        end_time: "10:45",
      },
      lessons,
    }),
    {
      lessonId: "lesson-2",
      scope: "teacher",
      error: "This teacher is already scheduled to teach another class during that time",
    }
  );
});

test("findLessonSchedulingConflict ignores adjacent slots and the lesson being updated", () => {
  const lessons = [
    {
      id: "lesson-1",
      class_id: "class-1",
      teacher_id: "teacher-profile-1",
      subject_id: "subject-1",
      day_of_week: 1,
      start_time: "08:00",
      end_time: "09:00",
    },
  ];

  assert.equal(
    findLessonSchedulingConflict({
      candidate: {
        id: "lesson-1",
        class_id: "class-1",
        teacher_id: "teacher-profile-1",
        subject_id: "subject-1",
        day_of_week: 1,
        start_time: "08:00",
        end_time: "09:00",
      },
      lessons,
      excludeLessonId: "lesson-1",
    }),
    null
  );

  assert.equal(
    findLessonSchedulingConflict({
      candidate: {
        class_id: "class-1",
        teacher_id: "teacher-profile-2",
        subject_id: "subject-2",
        day_of_week: 1,
        start_time: "09:00",
        end_time: "10:00",
      },
      lessons,
    }),
    null
  );
});

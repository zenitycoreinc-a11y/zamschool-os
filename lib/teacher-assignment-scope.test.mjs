import test from "node:test";
import assert from "node:assert/strict";

import {
  buildTeacherAssignmentScope,
  teacherHasClassAccess,
} from "./teacher-assignment-scope.ts";

test("buildTeacherAssignmentScope includes both teacher profile and teacher row ids", () => {
  const scope = buildTeacherAssignmentScope({
    actorProfileId: "profile-1",
    schoolId: "school-1",
    teachers: [{ id: "teacher-row-1", profile_id: "profile-1" }],
    classes: [],
    lessons: [],
    assignments: [],
  });

  assert.deepEqual(scope.actorTeacherIds.sort(), ["profile-1", "teacher-row-1"]);
});

test("buildTeacherAssignmentScope combines supervised and taught classes", () => {
  const scope = buildTeacherAssignmentScope({
    actorProfileId: "profile-1",
    schoolId: "school-1",
    teachers: [{ id: "teacher-row-1", profile_id: "profile-1" }],
    classes: [
      { id: "class-supervised", school_id: "school-1", supervisor_id: "profile-1" },
      { id: "class-other-school", school_id: "school-2", supervisor_id: "profile-1" },
    ],
    lessons: [
      { id: "lesson-1", school_id: "school-1", class_id: "class-taught", teacher_id: "teacher-row-1" },
      { id: "lesson-2", school_id: "school-1", class_id: "class-supervised", teacher_id: "teacher-row-2" },
      { id: "lesson-3", school_id: "school-2", class_id: "class-other-school", teacher_id: "teacher-row-1" },
    ],
    assignments: [],
  });

  assert.deepEqual(scope.supervisedClassIds, ["class-supervised"]);
  assert.deepEqual(scope.taughtClassIds, ["class-taught"]);
  assert.deepEqual(scope.allowedClassIds.sort(), ["class-supervised", "class-taught"]);
});

test("buildTeacherAssignmentScope includes assignment-only classes before lessons exist", () => {
  const scope = buildTeacherAssignmentScope({
    actorProfileId: "profile-1",
    schoolId: "school-1",
    teachers: [{ id: "teacher-row-1", profile_id: "profile-1" }],
    classes: [],
    lessons: [],
    assignments: [
      { school_id: "school-1", class_id: "class-assigned", teacher_profile_id: "profile-1" },
      { school_id: "school-1", class_id: "class-assigned-row", teacher_profile_id: "teacher-row-1" },
      { school_id: "school-2", class_id: "class-other-school", teacher_profile_id: "profile-1" },
    ],
  });

  assert.deepEqual(scope.taughtClassIds.sort(), ["class-assigned", "class-assigned-row"]);
  assert.deepEqual(scope.allowedClassIds.sort(), ["class-assigned", "class-assigned-row"]);
});

test("teacherHasClassAccess only allows classes inside the computed scope", () => {
  const scope = {
    actorTeacherIds: ["profile-1", "teacher-row-1"],
    supervisedClassIds: ["class-supervised"],
    taughtClassIds: ["class-taught"],
    allowedClassIds: ["class-supervised", "class-taught"],
  };

  assert.equal(teacherHasClassAccess(scope, "class-supervised"), true);
  assert.equal(teacherHasClassAccess(scope, "class-taught"), true);
  assert.equal(teacherHasClassAccess(scope, "class-hidden"), false);
});

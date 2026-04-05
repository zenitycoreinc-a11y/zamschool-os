import test from "node:test";
import assert from "node:assert/strict";
import { canTeacherAccessLesson } from "./attendance-access.ts";

test("teacher can access a supervised class even when lessonTeacherId is null", () => {
  assert.equal(
    canTeacherAccessLesson({
      actorId: "teacher-1",
      lessonTeacherId: null,
      classSupervisorId: "teacher-1",
      lessonSchoolId: "school-1",
      actorSchoolId: "school-1",
    }),
    true
  );
});

test("teacher can access a class they teach even when classSupervisorId is null", () => {
  assert.equal(
    canTeacherAccessLesson({
      actorId: "teacher-1",
      lessonTeacherId: "teacher-1",
      classSupervisorId: null,
      lessonSchoolId: "school-1",
      actorSchoolId: "school-1",
    }),
    true
  );
});

test("teacher cannot access a class with neither relationship", () => {
  assert.equal(
    canTeacherAccessLesson({
      actorId: "teacher-1",
      lessonTeacherId: "teacher-2",
      classSupervisorId: "teacher-3",
      lessonSchoolId: "school-1",
      actorSchoolId: "school-1",
    }),
    false
  );
});

test("teacher cannot access a class in another school", () => {
  assert.equal(
    canTeacherAccessLesson({
      actorId: "teacher-1",
      lessonTeacherId: "teacher-1",
      classSupervisorId: null,
      lessonSchoolId: "school-2",
      actorSchoolId: "school-1",
    }),
    false
  );
});

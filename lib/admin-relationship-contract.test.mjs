import test from "node:test";
import assert from "node:assert/strict";

import {
  validateParentLinkProfile,
  validateStudentClassAssignment,
} from "./admin-relationship-contract.ts";

test("validateStudentClassAssignment allows clearing a class assignment", () => {
  assert.deepEqual(
    validateStudentClassAssignment({
      schoolId: "school-1",
      classId: null,
      classRow: null,
    }),
    {
      ok: true,
      data: { classId: null },
    }
  );
});

test("validateStudentClassAssignment rejects a class from another school", () => {
  assert.deepEqual(
    validateStudentClassAssignment({
      schoolId: "school-1",
      classId: "class-2",
      classRow: { id: "class-2", school_id: "school-2" },
    }),
    {
      ok: false,
      status: 404,
      error: "Class not found in this school",
    }
  );
});

test("validateParentLinkProfile requires a parent role in the same school", () => {
  assert.deepEqual(
    validateParentLinkProfile({
      schoolId: "school-1",
      parentProfile: { id: "profile-1", school_id: "school-1", role: "teacher" },
    }),
    {
      ok: false,
      status: 404,
      error: "Parent profile not found in this school",
    }
  );

  assert.deepEqual(
    validateParentLinkProfile({
      schoolId: "school-1",
      parentProfile: { id: "profile-2", school_id: "school-2", role: "parent" },
    }),
    {
      ok: false,
      status: 404,
      error: "Parent profile not found in this school",
    }
  );
});

test("validateParentLinkProfile accepts a parent in the same school", () => {
  assert.deepEqual(
    validateParentLinkProfile({
      schoolId: "school-1",
      parentProfile: { id: "profile-1", school_id: "school-1", role: "PARENT" },
    }),
    {
      ok: true,
      data: { parentProfileId: "profile-1" },
    }
  );
});

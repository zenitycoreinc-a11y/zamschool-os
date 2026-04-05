import test from "node:test";
import assert from "node:assert/strict";

import { buildCreateClassPayload } from "./class-route-payload.mjs";

test("buildCreateClassPayload keeps grade_id and grade_level in sync for grade-based schemas", () => {
  const payload = buildCreateClassPayload({
    schoolId: "school-1",
    body: {
      gradeId: "grade-8",
      gradeLevel: undefined,
      name: "Blue",
      capacity: 30,
    },
    resolvedGradeLevel: 8,
    supervisorProfileId: null,
  });

  assert.deepEqual(payload, {
    school_id: "school-1",
    grade_id: "grade-8",
    grade_level: 8,
    name: "Blue",
    capacity: 30,
    supervisor_id: null,
  });
});

test("buildCreateClassPayload falls back to explicit gradeLevel when no grade record is resolved", () => {
  const payload = buildCreateClassPayload({
    schoolId: "school-1",
    body: {
      gradeId: null,
      gradeLevel: 6,
      name: "Grade 6 East",
      capacity: 40,
    },
    resolvedGradeLevel: null,
    supervisorProfileId: "teacher-1",
  });

  assert.deepEqual(payload, {
    school_id: "school-1",
    grade_id: null,
    grade_level: 6,
    name: "Grade 6 East",
    capacity: 40,
    supervisor_id: "teacher-1",
  });
});

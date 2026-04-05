import test from "node:test";
import assert from "node:assert/strict";

import {
  buildTeacherProfileLookup,
  hydrateAssignmentRows,
  hydratePaymentRows,
  hydrateTimetableRows,
} from "./admin-route-hydration.mjs";

test("buildTeacherProfileLookup resolves direct profile ids and teacher row ids", () => {
  const lookup = buildTeacherProfileLookup({
    teacherIds: ["profile-teacher", "teacher-row"],
    teacherRows: [
      { id: "teacher-row", profile_id: "profile-from-row" },
      { id: "other-row", profile_id: "other-profile" },
    ],
    profileRows: [
      { id: "profile-teacher", first_name: "Direct", last_name: "Teacher", email: "direct@example.com" },
      { id: "profile-from-row", first_name: "Row", last_name: "Teacher", email: "row@example.com" },
    ],
  });

  assert.deepEqual(lookup["profile-teacher"], {
    id: "profile-teacher",
    first_name: "Direct",
    last_name: "Teacher",
    email: "direct@example.com",
  });
  assert.deepEqual(lookup["teacher-row"], {
    id: "profile-from-row",
    first_name: "Row",
    last_name: "Teacher",
    email: "row@example.com",
  });
});

test("hydrateTimetableRows attaches teacher profile under profiles", () => {
  const rows = hydrateTimetableRows(
    [{ id: "lesson-1", teacher_id: "teacher-row" }],
    {
      "teacher-row": {
        id: "profile-from-row",
        first_name: "Row",
        last_name: "Teacher",
        email: "row@example.com",
      },
    }
  );

  assert.deepEqual(rows[0].profiles, {
    id: "profile-from-row",
    first_name: "Row",
    last_name: "Teacher",
    email: "row@example.com",
  });
});

test("hydrateAssignmentRows attaches teacher relation under teacher", () => {
  const rows = hydrateAssignmentRows(
    [{ id: "assignment-1", teacher_id: "profile-teacher" }],
    {
      "profile-teacher": {
        id: "profile-teacher",
        first_name: "Direct",
        last_name: "Teacher",
        email: "direct@example.com",
      },
    }
  );

  assert.deepEqual(rows[0].teacher, {
    id: "profile-teacher",
    first_name: "Direct",
    last_name: "Teacher",
    email: "direct@example.com",
  });
});

test("hydratePaymentRows merges student admission numbers from student records", () => {
  const rows = hydratePaymentRows(
    [
      {
        id: "payment-1",
        student_id: "student-profile",
        created_by: "admin-profile",
      },
    ],
    {
      studentProfilesById: {
        "student-profile": {
          id: "student-profile",
          first_name: "Bet",
          last_name: "Sheba",
          email: "student@example.com",
        },
      },
      studentAdmissionByProfileId: {
        "student-profile": "STU-001",
      },
      createdByProfilesById: {
        "admin-profile": {
          id: "admin-profile",
          first_name: "Admin",
          last_name: "User",
          email: "admin@example.com",
        },
      },
    }
  );

  assert.deepEqual(rows[0].profiles, {
    id: "student-profile",
    first_name: "Bet",
    last_name: "Sheba",
    email: "student@example.com",
    admission_number: "STU-001",
  });
  assert.deepEqual(rows[0].student, rows[0].profiles);
  assert.deepEqual(rows[0].created_by_profile, {
    id: "admin-profile",
    first_name: "Admin",
    last_name: "User",
    email: "admin@example.com",
  });
});

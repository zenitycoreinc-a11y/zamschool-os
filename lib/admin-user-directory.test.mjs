import test from "node:test";
import assert from "node:assert/strict";

const modulePath = new URL("./admin-user-directory.ts", import.meta.url);

test("normalizeProfileGender matches the live profile schema", async () => {
  const { normalizeProfileGender } = await import(modulePath.href);

  assert.equal(normalizeProfileGender("MALE"), "male");
  assert.equal(normalizeProfileGender("female"), "female");
  assert.equal(normalizeProfileGender("OTHER"), null);
  assert.equal(normalizeProfileGender(""), null);
});

test("toDisplayStatus maps activity flags to the UI status pills", async () => {
  const { toDisplayStatus } = await import(modulePath.href);

  assert.equal(toDisplayStatus(true), "ACTIVE");
  assert.equal(toDisplayStatus(false), "INACTIVE");
  assert.equal(toDisplayStatus(null), "ACTIVE");
});

test("mergeUserDirectoryRows enriches student and teacher rows from role tables", async () => {
  const { mergeUserDirectoryRows } = await import(modulePath.href);

  const directory = mergeUserDirectoryRows({
    profiles: [
      {
        id: "student-profile",
        role: "student",
        first_name: "Mary",
        last_name: "Zulu",
        email: "mary@example.com",
        phone: "+260970000001",
        gender: "female",
        is_active: true,
      },
      {
        id: "teacher-profile",
        role: "teacher",
        first_name: "John",
        last_name: "Phiri",
        email: "john@example.com",
        phone: "+260970000002",
        gender: "male",
        is_active: false,
      },
      {
        id: "parent-profile",
        role: "parent",
        first_name: "Grace",
        last_name: "Tembo",
        email: "grace@example.com",
        phone: "+260970000003",
        gender: null,
        is_active: true,
      },
    ],
    students: [
      {
        id: "student-row",
        profile_id: "student-profile",
        class_id: "class-a",
        student_number: "STU-1",
        enrollment_date: "2026-01-15",
        is_active: true,
      },
    ],
    teachers: [
      {
        id: "teacher-row",
        profile_id: "teacher-profile",
        employee_number: "EMP-7",
        department: "Sciences",
        specialization: "Physics",
        hire_date: "2025-05-20",
        is_active: false,
      },
    ],
    parents: [
      {
        id: "parent-row",
        profile_id: "parent-profile",
        relation_type: "Mother",
        occupation: "Nurse",
      },
    ],
    classNameById: {
      "class-a": "Grade 8 - A",
    },
  });

  assert.equal(directory.students[0].admission_number, "STU-1");
  assert.equal(directory.students[0].class_name, "Grade 8 - A");
  assert.equal(directory.students[0].status, "ACTIVE");
  assert.equal(directory.students[0].gender, "female");

  assert.equal(directory.teachers[0].employee_id, "EMP-7");
  assert.equal(directory.teachers[0].department, "Sciences");
  assert.equal(directory.teachers[0].status, "INACTIVE");

  assert.equal(directory.parents[0].relation_type, "Mother");
  assert.equal(directory.parents[0].occupation, "Nurse");
});

test("buildUserWritePlan sends gender and status in schema-safe shapes", async () => {
  const { buildUserWritePlan } = await import(modulePath.href);

  const plan = buildUserWritePlan({
    role: "teacher",
    schoolId: "school-1",
    profileId: "teacher-profile",
    form: {
      first_name: "John",
      last_name: "Phiri",
      email: "john@example.com",
      phone: "+260970000002",
      gender: "FEMALE",
      status: "INACTIVE",
      admission_number: "",
      class_id: "",
      enrollment_date: "",
      employee_id: "EMP-7",
      department: "Sciences",
      specialization: "Physics",
      hire_date: "2025-05-20",
      relation_type: "",
      occupation: "",
    },
  });

  assert.equal(plan.profile.gender, "female");
  assert.equal(plan.profile.is_active, false);
  assert.equal(plan.roleRecord.employee_number, "EMP-7");
  assert.equal(plan.roleRecord.is_active, false);
});

import test from "node:test";
import assert from "node:assert/strict";

import { buildTeacherAccountDetail } from "./teacher-account-detail-builder.ts";

test("buildTeacherAccountDetail keeps normalized assignment data visible without lessons", () => {
  const detail = buildTeacherAccountDetail({
    baseProfile: {
      profileId: "teacher-profile-1",
      role: "teacher",
      displayName: "Grace Teacher",
      email: "grace@example.com",
      status: "ACTIVE",
    },
    teacherRecord: {
      employee_id: "EMP-001",
      department: "Science",
      specialization: null,
      hire_date: "2024-01-15",
    },
    specializationRows: [{ subject_id: "subject-1" }],
    normalizedTeachingAssignments: [{ class_id: "class-1", subject_id: "subject-1" }],
    supervisedClassRefs: [],
    directLessons: [],
    assignments: [],
    attendanceRows: [],
    resultRows: [],
    studentNamesById: new Map(),
    classMap: new Map([["class-1", { id: "class-1", name: "A", grade_level: 8 }]]),
    subjectById: new Map([["subject-1", { id: "subject-1", name: "Mathematics" }]]),
    todayDate: "2026-03-29",
    todayLessonDayOfWeek: 1,
  });

  assert.equal(detail.employeeId, "EMP-001");
  assert.deepEqual(detail.specializationSubjectIds, ["subject-1"]);
  assert.deepEqual(detail.teachingAssignments, [
    {
      classId: "class-1",
      className: "Grade 8 - A",
      subjectId: "subject-1",
      subjectName: "Mathematics",
    },
  ]);
  assert.deepEqual(detail.assignedClasses, [{ id: "class-1", name: "Grade 8 - A" }]);
  assert.deepEqual(detail.assignedSubjects, [{ id: "subject-1", name: "Mathematics" }]);
});

test("buildTeacherAccountDetail keeps supervised classes separate from teaching classes", () => {
  const detail = buildTeacherAccountDetail({
    baseProfile: {
      profileId: "teacher-profile-1",
      role: "teacher",
      displayName: "Grace Teacher",
      email: "grace@example.com",
      status: "ACTIVE",
    },
    teacherRecord: {
      employee_id: "EMP-001",
      department: "Science",
      specialization: null,
      hire_date: "2024-01-15",
    },
    specializationRows: [],
    normalizedTeachingAssignments: [],
    supervisedClassRefs: [{ id: "class-2" }],
    directLessons: [],
    assignments: [],
    attendanceRows: [],
    resultRows: [],
    studentNamesById: new Map(),
    classMap: new Map([["class-2", { id: "class-2", name: "B", grade_level: 9 }]]),
    subjectById: new Map(),
    todayDate: "2026-03-29",
    todayLessonDayOfWeek: 1,
  });

  assert.deepEqual(detail.supervisedClassIds, ["class-2"]);
  assert.deepEqual(detail.supervisedClasses, [{ id: "class-2", name: "Grade 9 - B" }]);
  assert.equal(detail.oversight.stats.supervisedClasses, 1);
});

test("buildTeacherAccountDetail includes recent teaching activity from lessons assignments attendance and results", () => {
  const detail = buildTeacherAccountDetail({
    baseProfile: {
      profileId: "teacher-profile-1",
      role: "teacher",
      displayName: "Grace Teacher",
      email: "grace@example.com",
      status: "ACTIVE",
    },
    teacherRecord: {
      employee_id: "EMP-001",
      department: "Science",
      specialization: null,
      hire_date: "2024-01-15",
    },
    specializationRows: [],
    normalizedTeachingAssignments: [],
    supervisedClassRefs: [],
    directLessons: [
      {
        id: "lesson-1",
        class_id: "class-1",
        subject_id: "subject-1",
        day_of_week: 1,
        start_time: "08:00",
        end_time: "09:00",
        title: "Algebra",
      },
    ],
    assignments: [
      {
        id: "assignment-1",
        title: "Worksheet 1",
        class_id: "class-1",
        subject_id: "subject-1",
        due_date: "2026-03-31",
        created_at: "2026-03-28T10:00:00.000Z",
      },
    ],
    attendanceRows: [
      {
        id: "attendance-1",
        class_id: "class-1",
        date: "2026-03-29",
        session_name: "Algebra",
        session_time: "08:00",
        status: "PRESENT",
        created_at: "2026-03-29T08:05:00.000Z",
      },
    ],
    resultRows: [
      {
        id: "result-1",
        assignment_id: "assignment-1",
        student_id: "student-1",
        score: 88,
        grade: "A",
        created_at: "2026-03-29T11:00:00.000Z",
      },
    ],
    studentNamesById: new Map([["student-1", "Chipo Banda"]]),
    classMap: new Map([["class-1", { id: "class-1", name: "A", grade_level: 8 }]]),
    subjectById: new Map([["subject-1", { id: "subject-1", name: "Mathematics" }]]),
    todayDate: "2026-03-29",
    todayLessonDayOfWeek: 1,
  });

  assert.equal(detail.oversight.stats.weeklyLessons, 1);
  assert.equal(detail.oversight.recentAssignments[0].title, "Worksheet 1");
  assert.equal(detail.oversight.recentAttendance[0].sessionName, "Algebra");
  assert.equal(detail.oversight.recentResults[0].studentName, "Chipo Banda");
});

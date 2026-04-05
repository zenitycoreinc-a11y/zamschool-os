import test from "node:test";
import assert from "node:assert/strict";

import {
  buildMobileDaySections,
  buildTimetableBoard,
  getLessonActionItems,
} from "./timetable-workspace.ts";

const lessons = [
  {
    id: "lesson-1",
    title: "Algebra",
    subject_id: "subject-1",
    class_id: "class-a",
    teacher_id: "teacher-1",
    day_of_week: 1,
    start_time: "08:00",
    end_time: "09:00",
  },
  {
    id: "lesson-2",
    title: null,
    subject_id: "subject-2",
    class_id: "class-a",
    teacher_id: "teacher-2",
    day_of_week: 1,
    start_time: "09:00",
    end_time: "10:00",
  },
  {
    id: "lesson-3",
    title: "Chemistry Lab",
    subject_id: "subject-3",
    class_id: "class-b",
    teacher_id: "teacher-3",
    day_of_week: 3,
    start_time: "11:00",
    end_time: "12:30",
  },
];

const meta = {
  classMap: {
    "class-a": "Grade 7 - A",
    "class-b": "Grade 8 - B",
  },
  subjectMap: {
    "subject-1": "Mathematics",
    "subject-2": "English",
    "subject-3": "Science",
  },
  teacherMap: {
    "teacher-1": "Ms. Banda",
    "teacher-2": "Mr. Phiri",
    "teacher-3": "Mrs. Zulu",
  },
};

test("buildTimetableBoard filters to the selected class and attaches readable lesson labels", () => {
  const board = buildTimetableBoard({
    lessons,
    selectedClass: "class-a",
    ...meta,
  });

  assert.equal(board.totalLessons, 2);
  assert.equal(board.days[0].slots[2].lessons.length, 1);
  assert.deepEqual(board.days[0].slots[2].lessons[0], {
    id: "lesson-1",
    title: "Algebra",
    subject: "Mathematics",
    teacher: "Ms. Banda",
    className: "Grade 7 - A",
    dayOfWeek: 1,
    startsAt: "08:00",
    endsAt: "09:00",
    timeRange: "08:00 - 09:00",
    durationMinutes: 60,
    slotSpan: 2,
    tone: "sky",
  });
});

test("buildMobileDaySections groups lessons by weekday and sorts them by start time", () => {
  const sections = buildMobileDaySections({
    lessons,
    selectedClass: "all",
    ...meta,
  });

  assert.equal(sections.length, 2);
  assert.equal(sections[0].label, "Monday");
  assert.deepEqual(
    sections[0].lessons.map((lesson) => lesson.id),
    ["lesson-1", "lesson-2"]
  );
  assert.equal(sections[1].label, "Wednesday");
  assert.equal(sections[1].lessons[0].timeRange, "11:00 - 12:30");
});

test("buildTimetableBoard normalizes second-precision lesson times from the API before overlap checks", () => {
  const board = buildTimetableBoard({
    lessons: [
      {
        ...lessons[0],
        day_of_week: "1",
        start_time: "08:00:00",
        end_time: "09:00:00",
      },
    ],
    selectedClass: "class-a",
    ...meta,
  });

  assert.equal(board.days[0].slots[2].lessons.length, 1);
  assert.equal(board.days[0].slots[2].lessons[0].timeRange, "08:00 - 09:00");
});

test("buildTimetableBoard only renders a lesson card once at its starting slot", () => {
  const board = buildTimetableBoard({
    lessons: [lessons[0]],
    selectedClass: "class-a",
    ...meta,
  });

  assert.equal(board.days[0].slots[2].lessons.length, 1);
  assert.equal(board.days[0].slots[3].lessons.length, 0);
});

test("buildTimetableBoard expands the visible grid when lessons fall outside the default daytime window", () => {
  const board = buildTimetableBoard({
    lessons: [
      {
        ...lessons[0],
        id: "lesson-early",
        start_time: "06:30",
        end_time: "07:30",
      },
      {
        ...lessons[1],
        id: "lesson-late",
        start_time: "17:30",
        end_time: "18:00",
      },
    ],
    selectedClass: "all",
    ...meta,
  });

  const earlySlot = board.days[0].slots.find((slot) => slot.label === "06:30");
  const lateSlot = board.days[0].slots.find((slot) => slot.label === "17:30");

  assert.equal(earlySlot?.lessons[0]?.id, "lesson-early");
  assert.equal(lateSlot?.lessons[0]?.id, "lesson-late");
});

test("getLessonActionItems keeps destructive actions behind an explicit action surface", () => {
  assert.deepEqual(getLessonActionItems({ id: "lesson-1" }), [
    {
      key: "view",
      label: "View lesson",
      tone: "neutral",
    },
    {
      key: "delete",
      label: "Delete lesson",
      tone: "danger",
    },
  ]);
});

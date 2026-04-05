import test from "node:test";
import assert from "node:assert/strict";

import {
  buildAssignmentSummary,
  filterAssignments,
  getAssignmentActionItems,
} from "./assignment-workspace.ts";

const assignments = [
  {
    id: "a1",
    title: "Quadratic equations",
    class: "Grade 11 - Blue",
    teacher: "Ms. Banda",
    dueAt: "2026-03-28",
    totalMarks: 100,
    description: "Worksheet pack",
  },
  {
    id: "a2",
    title: "Poetry analysis",
    class: "Grade 10 - Red",
    teacher: "Mr. Phiri",
    dueAt: "2026-03-26",
    totalMarks: 50,
    description: "",
  },
  {
    id: "a3",
    title: "Lab report",
    class: "Grade 12 - Gold",
    teacher: "Mrs. Zulu",
    dueAt: "2026-04-05",
    totalMarks: 80,
    description: "Chemistry practical write-up",
  },
];

test("buildAssignmentSummary computes totals, due soon work, and stale items", () => {
  const summary = buildAssignmentSummary(assignments, "2026-03-26");

  assert.deepEqual(summary, {
    total: 3,
    dueSoon: 2,
    overdue: 0,
    missingDescription: 1,
  });
});

test("filterAssignments can isolate due-soon work and search by title, class, and teacher", () => {
  const dueSoon = filterAssignments(assignments, {
    query: "",
    mode: "due-soon",
    today: "2026-03-26",
  });
  assert.deepEqual(dueSoon.map((item) => item.id), ["a1", "a2"]);

  const searched = filterAssignments(assignments, {
    query: "zulu",
    mode: "all",
    today: "2026-03-26",
  });
  assert.deepEqual(searched.map((item) => item.id), ["a3"]);
});

test("getAssignmentActionItems exposes only real row actions", () => {
  assert.deepEqual(getAssignmentActionItems(), [
    { key: "edit", label: "Edit assignment", tone: "neutral" },
    { key: "delete", label: "Delete assignment", tone: "danger" },
  ]);
});

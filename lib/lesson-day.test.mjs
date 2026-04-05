import test from "node:test";
import assert from "node:assert/strict";

import { resolveLessonDayOfWeek } from "./lesson-day.ts";

test("resolveLessonDayOfWeek maps Sunday to the live lessons value 0", () => {
  assert.equal(resolveLessonDayOfWeek("2026-03-22"), 0);
});

test("resolveLessonDayOfWeek preserves weekday numbering for Monday", () => {
  assert.equal(resolveLessonDayOfWeek("2026-03-23"), 1);
});

test("resolveLessonDayOfWeek falls back to a valid database weekday for invalid dates", () => {
  const value = resolveLessonDayOfWeek("not-a-date");
  assert.equal(Number.isInteger(value), true);
  assert.equal(value >= 0 && value <= 6, true);
});

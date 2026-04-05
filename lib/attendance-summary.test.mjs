import test from "node:test";
import assert from "node:assert/strict";

import { summarizeAttendance } from "./attendance-summary.ts";

test("summarizeAttendance groups by exact lesson status", () => {
  const summary = summarizeAttendance([
    { status: "PRESENT" },
    { status: "ABSENT" },
    { status: "ABSENT" },
    { status: "LATE" },
  ]);

  assert.deepEqual(summary, {
    PRESENT: 1,
    ABSENT: 2,
    LATE: 1,
    EXCUSED: 0,
  });
});

test("summarizeAttendance keeps totals stable across school report windows", () => {
  const summary = summarizeAttendance([
    { status: "PRESENT" },
    { status: "EXCUSED" },
  ]);

  assert.equal(summary.PRESENT + summary.EXCUSED, 2);
});

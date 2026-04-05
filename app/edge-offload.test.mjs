import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const teacherDashboardPath = resolve(process.cwd(), "app", "(dashboard)", "teacher", "page.tsx");
const studentDashboardPath = resolve(process.cwd(), "app", "(dashboard)", "student", "page.tsx");
const parentDashboardPath = resolve(process.cwd(), "app", "(dashboard)", "parent", "page.tsx");
const adminTimetablePath = resolve(process.cwd(), "app", "app", "admin", "timetable", "page.tsx");

test("dashboard pages route hot GETs through the shared gateway helper", async () => {
  const [teacherSource, studentSource, parentSource, adminTimetableSource] = await Promise.all([
    readFile(teacherDashboardPath, "utf8"),
    readFile(studentDashboardPath, "utf8"),
    readFile(parentDashboardPath, "utf8"),
    readFile(adminTimetablePath, "utf8"),
  ]);

  assert.match(teacherSource, /fetchGatewayRead/);
  assert.match(studentSource, /fetchGatewayRead/);
  assert.match(parentSource, /fetchGatewayRead/);
  assert.match(adminTimetableSource, /fetchGatewayRead/);
});

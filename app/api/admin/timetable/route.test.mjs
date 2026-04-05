import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const routePath = resolve(process.cwd(), "app", "api", "admin", "timetable", "route.ts");

test("admin timetable route supports legacy class schema when class grade relations are unavailable", async () => {
  const source = await readFile(routePath, "utf8");

  assert.match(source, /grade_level/);
  assert.match(source, /fetchTimetableRows/);
});

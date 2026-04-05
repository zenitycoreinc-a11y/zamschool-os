import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const routePath = resolve(process.cwd(), "app", "api", "teacher", "classes", "route.ts");

test("teacher classes route publishes a private cache policy for read-mostly timetable data", async () => {
  const source = await readFile(routePath, "utf8");

  assert.match(source, /requireTeacherContext/);
  assert.match(source, /Cache-Control/);
  assert.match(source, /private, max-age=/);
});

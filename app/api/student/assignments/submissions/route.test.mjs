import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const routePath = resolve(
  process.cwd(),
  "app",
  "api",
  "student",
  "assignments",
  "submissions",
  "route.ts"
);

test("student assignment submissions route requires student auth and upserts submissions", async () => {
  const source = await readFile(routePath, "utf8");

  assert.match(source, /requireStudentContext/);
  assert.match(source, /assignment_submissions/);
  assert.match(source, /\.upsert\(/);
  assert.match(source, /applyRateLimit/);
});

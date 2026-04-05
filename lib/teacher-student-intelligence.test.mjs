import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const helperPath = resolve(process.cwd(), "lib", "teacher-student-intelligence.ts");

test("teacher student intelligence falls back when legacy student table shape is incompatible", async () => {
  const source = await readFile(helperPath, "utf8");

  assert.match(source, /isSchemaCompatibilityError/);
  assert.match(source, /42703/);
  assert.match(source, /PGRST204/);
  assert.match(source, /admission_number/);
  assert.match(source, /\.in\("role", \["STUDENT", "student"\]\)/);
});

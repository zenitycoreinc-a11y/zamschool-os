import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const scopeServerPath = resolve(process.cwd(), "lib", "teacher-assignment-scope-server.ts");

test("teacher assignment scope server tolerates a missing teachers table", async () => {
  const source = await readFile(scopeServerPath, "utf8");

  assert.match(source, /isMissingRelationError/);
  assert.match(source, /if \(teacherError\)\s*\{/);
  assert.match(source, /if \(!isMissingRelationError\(teacherError\)\) throw teacherError/);
});

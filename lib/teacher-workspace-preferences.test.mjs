import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const libPath = resolve(process.cwd(), "lib", "teacher-workspace-preferences.ts");

test("teacher workspace preferences support storage sync and same-tab updates", async () => {
  const source = await readFile(libPath, "utf8");

  assert.match(source, /TEACHER_WORKSPACE_PREFERENCES_KEY/);
  assert.match(source, /writeTeacherWorkspacePreferences/);
  assert.match(source, /window\.dispatchEvent/);
  assert.match(source, /teacher-workspace-preferences:change/);
  assert.match(source, /window\.addEventListener\("storage"/);
  assert.match(source, /useTeacherWorkspacePreferences/);
});

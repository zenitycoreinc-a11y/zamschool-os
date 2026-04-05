import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const componentPath = resolve(process.cwd(), "components", "account", "AccountSettingsPage.tsx");

test("account settings page writes workspace preferences through the shared teacher preference helper", async () => {
  const source = await readFile(componentPath, "utf8");

  assert.match(source, /readTeacherWorkspacePreferences/);
  assert.match(source, /writeTeacherWorkspacePreferences/);
  assert.match(source, /role="switch"/);
  assert.match(source, /Compact dashboard cards/);
  assert.match(source, /Applies instantly in the teacher/);
});

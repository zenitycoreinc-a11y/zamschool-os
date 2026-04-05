import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const pagePath = resolve(process.cwd(), "app", "(dashboard)", "teacher", "settings", "page.tsx");

test("teacher settings page is teacher-owned and avoids proxying the generic settings page", async () => {
  const source = await readFile(pagePath, "utf8");

  assert.doesNotMatch(source, /from "\@\/app\/app\/settings\/page"/);
  assert.match(source, /AccountSettingsPage/);
  assert.match(source, /Teacher Settings/);
  assert.match(source, /preferencesStorageKey="teacher-workspace-settings"/);
  assert.match(source, /Session controls/);
});

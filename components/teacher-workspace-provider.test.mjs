import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const providerPath = resolve(process.cwd(), "components", "TeacherWorkspaceProvider.tsx");

test("teacher workspace provider owns the shared account fetch and exposes a teacher workspace hook", async () => {
  const source = await readFile(providerPath, "utf8");

  assert.match(source, /fetchTeacherBootstrap/);
  assert.match(source, /preloadTeacherBootstrap/);
  assert.match(source, /TeacherWorkspaceProvider/);
  assert.match(source, /useTeacherWorkspace/);
  assert.match(source, /createContext/);
  assert.doesNotMatch(source, /supabase\.auth\.getUser\(\)/);
  assert.doesNotMatch(source, /fetchAccountProfile/);
});

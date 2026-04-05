import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const shellPath = resolve(process.cwd(), "webapp", "components", "TeacherShell.tsx");

test("teacher shell keeps account pages inside the teacher route tree", async () => {
  const source = await readFile(shellPath, "utf8");

  assert.match(source, /href: "\/teacher", label: "Dashboard"/);
  assert.match(source, /href: "\/teacher\/teaching", label: "Teaching"/);
  assert.match(source, /href: "\/teacher\/students", label: "Students"/);
  assert.match(source, /href: "\/teacher\/inbox", label: "Inbox"/);
  assert.match(source, /href: "\/teacher\/profile", label: "Profile"/);
  assert.match(source, /href: "\/teacher\/settings", label: "Settings"/);
  assert.doesNotMatch(source, /href: "\/teacher\/classes", label: "Rollcall"/);
  assert.doesNotMatch(source, /href: "\/teacher\/attendance", label: "Attendance Log"/);
  assert.doesNotMatch(source, /href: "\/teacher\/assignments", label: "Assignments"/);
  assert.doesNotMatch(source, /href: "\/teacher\/results", label: "Results"/);
  assert.doesNotMatch(source, /href: "\/teacher\/messages", label: "Messages"/);
  assert.doesNotMatch(source, /href: "\/teacher\/announcements", label: "Announcements"/);
  assert.doesNotMatch(source, /href: "\/teacher\/events", label: "Events"/);
  assert.doesNotMatch(source, /href: "\/teacher\/notifications", label: "Notifications"/);
  assert.doesNotMatch(source, /href: "\/app\/settings", label: "Settings"/);
  assert.doesNotMatch(source, /href: "\/app\/profile", label: "Profile"/);
  assert.doesNotMatch(source, /href: "\/app\/messages", label: "Inbox"/);
  assert.doesNotMatch(source, /href: "\/app\/notifications", label: "Notifications"/);
  assert.doesNotMatch(source, /supabase\.auth\.getUser\(\)/);
  assert.doesNotMatch(source, /Preparing teacher workspace/);
  assert.doesNotMatch(source, /if \(workspaceLoading \|\| statsLoading\)/);
  assert.doesNotMatch(source, /fetch\(`\/api\/teacher\/classes\?date=\$\{today\}`/);
  assert.match(source, /preloadTeacherBootstrap/);
  assert.match(source, /TeacherWorkspaceProvider/);
  assert.match(source, /compactCards/);
  assert.match(source, /useTeacherWorkspacePreferences/);
  assert.match(source, /\/teacher\/classes\?view=queue/);
  assert.match(source, /\/teacher\/students/);
  assert.match(source, /\/teacher\/attendance\?filter=completed/);
  assert.match(source, /\/teacher\/classes\?filter=pending/);
});

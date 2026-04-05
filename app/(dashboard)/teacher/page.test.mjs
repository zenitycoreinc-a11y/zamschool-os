import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const pagePath = resolve(process.cwd(), "app", "(dashboard)", "teacher", "page.tsx");

test("teacher dashboard consumes shared workspace state without reloading account identity on mount", async () => {
  const source = await readFile(pagePath, "utf8");

  assert.match(source, /useTeacherWorkspace/);
  assert.match(source, /Teacher Dashboard/);
  assert.match(source, /Daily workspace overview/);
  assert.match(source, /compactCards/);
  assert.match(source, /useTeacherWorkspacePreferences/);
  assert.match(source, /\/teacher\/classes/);
  assert.match(source, /\/teacher\/students/);
  assert.match(source, /\/teacher\/attendance\?filter=completed/);
  assert.match(source, /\/teacher\/classes\?filter=pending/);
  assert.match(source, /Teacher shortcuts/);
  assert.match(source, /Only the pages you use most/);
  assert.match(source, /\/teacher\/notifications/);
  assert.match(source, /\/teacher\/teaching/);
  assert.match(source, /lessonId=/);
  assert.match(source, /href="\/teacher\/assignments"/);
  assert.match(source, /href="\/teacher\/attendance"/);
  assert.match(source, /href="\/teacher\/results"/);
  assert.doesNotMatch(source, /fetchAccountProfile/);
  assert.doesNotMatch(source, /Promise\.all\(\[/);
  assert.doesNotMatch(source, /\/api\/account\/unread-summary/);
  assert.doesNotMatch(source, /\/api\/teacher\/assignments/);
  assert.doesNotMatch(source, /\/api\/teacher\/results/);
  assert.doesNotMatch(source, /\/api\/account\/events/);
  assert.match(source, /account\?\.teacher/);
});

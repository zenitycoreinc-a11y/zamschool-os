import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const pagePath = resolve(process.cwd(), "app", "(dashboard)", "teacher", "profile", "page.tsx");

test("teacher profile page is teacher-owned and avoids proxying the generic profile page", async () => {
  const source = await readFile(pagePath, "utf8");

  assert.doesNotMatch(source, /from "\@\/app\/app\/profile\/page"/);
  assert.match(source, /useTeacherWorkspace/);
  assert.match(source, /AccountProfilePage/);
  assert.match(source, /Teacher Profile/);
  assert.match(source, /showTeacherDetails/);
  assert.match(source, /detailsTitle="School details"/);
  assert.match(source, /Teaching assignment/);
  assert.match(source, /Admin-managed guidance/);
});

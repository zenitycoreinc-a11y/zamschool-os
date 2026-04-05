import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const pagePath = resolve(process.cwd(), "app", "(dashboard)", "student", "page.tsx");

test("student dashboard reads live attendance and published results instead of static calendar placeholders", async () => {
  const source = await readFile(pagePath, "utf8");

  assert.match(source, /\/api\/student\/dashboard/);
  assert.match(source, /\/api\/student\/results/);
  assert.match(source, /Published Results/);
});

test("student dashboard supports submitting assignment work from the same workspace", async () => {
  const source = await readFile(pagePath, "utf8");

  assert.match(source, /Upcoming Assignments/);
  assert.match(source, /\/api\/student\/assignments\/submissions/);
  assert.match(source, /Submit work|Update submission/);
});

import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const pagePath = resolve(process.cwd(), "app", "(dashboard)", "teacher", "assignments", "page.tsx");

test("teacher assignments page supports creating assignments from the teacher workspace", async () => {
  const source = await readFile(pagePath, "utf8");

  assert.match(source, /fetchAccountProfile/);
  assert.match(source, /\/teacher\/teaching/);
  assert.match(source, /New assignment/);
  assert.match(source, /Create assignment/);
  assert.match(source, /method: "POST"/);
});

test("teacher assignments page shows real submission progress once stored submissions exist", async () => {
  const source = await readFile(pagePath, "utf8");

  assert.match(source, /submission progress/i);
  assert.match(source, /label="Submitted"/);
  assert.match(source, /\btotalStudents\b/);
  assert.match(source, /\bsubmittedCount\b/);
});

import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const pagePath = resolve(process.cwd(), "app", "(dashboard)", "list", "classes", "page.tsx");

test("classes list allows saving a class without forcing a grade relation", async () => {
  const source = await readFile(pagePath, "utf8");

  assert.doesNotMatch(source, /Select a grade before saving this class/);
  assert.match(source, /gradeLevel:/);
});

import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const pagePath = resolve(process.cwd(), "app", "(dashboard)", "parent", "page.tsx");

test("parent dashboard loads published child results from the dedicated parent results API", async () => {
  const source = await readFile(pagePath, "utf8");

  assert.match(source, /\/api\/parent\/results/);
  assert.match(source, /Published Results/);
});

import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const componentPath = resolve(process.cwd(), "components", "Announcements.tsx");

test("announcements widget switches to teacher announcements API on teacher routes", async () => {
  const source = await readFile(componentPath, "utf8");

  assert.match(source, /pathname\.startsWith\("\/teacher"\)/);
  assert.match(source, /\/api\/teacher\/announcements\?limit=3/);
  assert.match(source, /\/api\/account\/announcements\?limit=3/);
});

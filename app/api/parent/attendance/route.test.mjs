import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const routePath = resolve(process.cwd(), "app", "api", "parent", "attendance", "route.ts");

test("parent attendance route publishes a private cache policy for read-mostly attendance summaries", async () => {
  const source = await readFile(routePath, "utf8");

  assert.match(source, /requireParentContext/);
  assert.match(source, /buildAttendanceWindow/);
  assert.match(source, /Cache-Control/);
  assert.match(source, /private, max-age=/);
});

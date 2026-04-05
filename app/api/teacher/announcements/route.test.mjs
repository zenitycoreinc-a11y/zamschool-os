import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const routePath = resolve(process.cwd(), "app", "api", "teacher", "announcements", "route.ts");

test("teacher announcements route filters visible announcements through teacher auth context", async () => {
  const source = await readFile(routePath, "utf8");

  assert.match(source, /export async function GET/);
  assert.match(source, /requireTeacherContext/);
  assert.match(source, /from\("announcements"\)/);
  assert.match(source, /target_role/);
  assert.match(source, /Cache-Control/);
});

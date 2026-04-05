import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const routePath = resolve(process.cwd(), "app", "api", "teacher", "notifications", "route.ts");

test("teacher notifications route uses teacher auth instead of generic account auth", async () => {
  const source = await readFile(routePath, "utf8");

  assert.match(source, /export async function GET/);
  assert.match(source, /export async function PUT/);
  assert.match(source, /requireTeacherContext/);
  assert.match(source, /from\("notifications"\)/);
  assert.match(source, /markAll/);
});

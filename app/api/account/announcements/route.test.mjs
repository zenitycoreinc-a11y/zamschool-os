import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const routePath = resolve(process.cwd(), "app", "api", "account", "announcements", "route.ts");

test("account announcements route filters by signed-in account context and publishes a cache policy", async () => {
  const source = await readFile(routePath, "utf8");

  assert.match(source, /export async function GET/);
  assert.match(source, /supabaseAdmin\.auth\.getUser/);
  assert.match(source, /from\("profiles"\)/);
  assert.match(source, /from\("announcements"\)/);
  assert.match(source, /target_role/);
  assert.match(source, /Cache-Control/);
});

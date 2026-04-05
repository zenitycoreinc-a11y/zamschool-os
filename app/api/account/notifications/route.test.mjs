import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const routePath = resolve(process.cwd(), "app", "api", "account", "notifications", "route.ts");

test("account notifications route returns the signed-in user's notification feed", async () => {
  const source = await readFile(routePath, "utf8");

  assert.match(source, /export async function GET/);
  assert.match(source, /export async function PUT/);
  assert.match(source, /supabaseAdmin\.auth\.getUser/);
  assert.match(source, /from\("notifications"\)/);
  assert.match(source, /user_id/);
  assert.match(source, /recipient_id/);
  assert.match(source, /is_read/);
  assert.match(source, /markAllNotificationsRead/);
});

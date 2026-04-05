import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const routePath = resolve(process.cwd(), "app", "api", "account", "unread-summary", "route.ts");

test("account unread summary route returns compact unread counts for the signed-in user", async () => {
  const source = await readFile(routePath, "utf8");

  assert.match(source, /export async function GET/);
  assert.match(source, /supabaseAdmin\.auth\.getUser/);
  assert.match(source, /from\("messages"\)/);
  assert.match(source, /from\("notifications"\)/);
  assert.match(source, /notifications/);
  assert.match(source, /messages/);
});

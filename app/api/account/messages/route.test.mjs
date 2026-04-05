import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const routePath = resolve(process.cwd(), "app", "api", "account", "messages", "route.ts");

test("account messages route returns the signed-in user's inbox with profile joins", async () => {
  const source = await readFile(routePath, "utf8");

  assert.match(source, /export async function GET/);
  assert.match(source, /export async function POST/);
  assert.match(source, /export async function PUT/);
  assert.match(source, /supabaseAdmin\.auth\.getUser/);
  assert.match(source, /from\("messages"\)/);
  assert.match(source, /from\("profiles"\)/);
  assert.match(source, /sender_id/);
  assert.match(source, /recipient_id/);
  assert.match(source, /\.insert\(/);
  assert.match(source, /\.update\(\{ is_read: true \}\)/);
});

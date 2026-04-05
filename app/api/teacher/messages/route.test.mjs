import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const routePath = resolve(process.cwd(), "app", "api", "teacher", "messages", "route.ts");

test("teacher messages route exposes teacher-scoped inbox mutations", async () => {
  const source = await readFile(routePath, "utf8");

  assert.match(source, /export async function GET/);
  assert.match(source, /export async function POST/);
  assert.match(source, /export async function PUT/);
  assert.match(source, /requireTeacherContext/);
  assert.match(source, /loadTeacherMessagingAccess/);
  assert.match(source, /assertTeacherMessageRecipientAllowed/);
  assert.match(source, /allowedProfileIds/);
  assert.match(source, /from\("messages"\)/);
  assert.match(source, /from\("profiles"\)/);
  assert.match(source, /recipient_id/);
  assert.match(source, /sender_id/);
});

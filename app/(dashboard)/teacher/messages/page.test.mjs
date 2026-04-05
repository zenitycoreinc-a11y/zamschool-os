import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const pagePath = resolve(process.cwd(), "app", "(dashboard)", "teacher", "messages", "page.tsx");

test("teacher messages page uses teacher-specific inbox and contact APIs", async () => {
  const source = await readFile(pagePath, "utf8");

  assert.match(source, /adminApiJson/);
  assert.match(source, /\/api\/teacher\/messages/);
  assert.match(source, /\/api\/teacher\/contacts/);
  assert.match(source, /groupConversationsByRole/);
  assert.match(source, /groupContactsByRole/);
  assert.match(source, /contactRoleFilter/);
  assert.match(source, /searchParams\.get\("role"\)/);
  assert.match(source, /searchParams\.get\("compose"\)/);
  assert.match(source, /Student conversations/);
  assert.match(source, /Parent conversations/);
  assert.match(source, /Admin conversations/);
  assert.match(source, /Staff conversations/);
  assert.match(source, /Students/);
  assert.match(source, /Parents/);
  assert.match(source, /New message/);
  assert.match(source, /Select a contact/);
  assert.match(source, /<optgroup/);
  assert.doesNotMatch(source, /\/api\/account\/messages/);
  assert.doesNotMatch(source, /supabase\.from\("messages"\)/);
});

import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const pagePath = resolve(process.cwd(), "app", "(dashboard)", "teacher", "inbox", "page.tsx");

test("teacher inbox page exposes a telegram-style messaging list surface", async () => {
  const source = await readFile(pagePath, "utf8");

  assert.match(source, /Teacher Inbox/);
  assert.match(source, /\/api\/teacher\/messages\?limit=60/);
  assert.match(source, /contactId=/);
  assert.match(source, /Search conversations/);
  assert.match(source, /Pinned/);
  assert.match(source, /All conversations/);
  assert.match(source, /Student conversations/);
  assert.match(source, /Parent conversations/);
  assert.match(source, /Admin conversations/);
  assert.match(source, /Staff conversations/);
  assert.match(source, /groupInboxConversationsByRole/);
  assert.match(source, /Open chat workspace/);
  assert.match(source, /Compose message/);
  assert.match(source, /Conversation preview/);
  assert.match(source, /Telegram-style inbox/);
  assert.match(source, /\/teacher\/messages/);
  assert.doesNotMatch(source, /Student support lane/);
  assert.doesNotMatch(source, /Parent follow-up lane/);
  assert.doesNotMatch(source, /Admin coordination lane/);
  assert.doesNotMatch(source, /School announcements/);
  assert.doesNotMatch(source, /Communication hub/);
});

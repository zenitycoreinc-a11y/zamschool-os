import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const routePath = resolve(process.cwd(), "app", "api", "admin", "notifications", "route.ts");

test("admin notifications route assembles the inbox from notifications, announcements, and events", async () => {
  const source = await readFile(routePath, "utf8");

  assert.match(source, /export async function GET/);
  assert.match(source, /requireAdminContext\(req\)/);
  assert.match(source, /from\("notifications"\)/);
  assert.match(source, /from\("announcements"\)/);
  assert.match(source, /from\("events"\)/);
  assert.match(source, /normalizeNotificationRows/);
  assert.match(source, /normalizeAnnouncementRows/);
  assert.match(source, /normalizeEventRows/);
});

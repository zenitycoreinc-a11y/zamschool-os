import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const componentPath = resolve(process.cwd(), "components", "DetailPanel.tsx");
const adminNotificationsPagePath = resolve(process.cwd(), "app", "app", "notifications", "page.tsx");
const adminAnnouncementsPagePath = resolve(process.cwd(), "app", "(dashboard)", "list", "announcements", "page.tsx");
const adminEventsPagePath = resolve(process.cwd(), "app", "(dashboard)", "list", "events", "page.tsx");
const teacherNotificationsPagePath = resolve(process.cwd(), "app", "(dashboard)", "teacher", "notifications", "page.tsx");
const teacherAnnouncementsPagePath = resolve(process.cwd(), "app", "(dashboard)", "teacher", "announcements", "page.tsx");
const teacherEventsPagePath = resolve(process.cwd(), "app", "(dashboard)", "teacher", "events", "page.tsx");

test("detail panel component provides a shared slide-over shell", async () => {
  const source = await readFile(componentPath, "utf8");

  assert.match(source, /export default function DetailPanel/);
  assert.match(source, /fixed inset-0/);
  assert.match(source, /onClose/);
});

test("admin notifications page opens inbox items inside the shared detail panel", async () => {
  const source = await readFile(adminNotificationsPagePath, "utf8");

  assert.match(source, /DetailPanel/);
  assert.match(source, /selectedItem/);
  assert.match(source, /onClick=\{\(\) => \{ void openItem\(item\); \}\}/);
});

test("admin announcements page opens announcement records inside the shared detail panel", async () => {
  const source = await readFile(adminAnnouncementsPagePath, "utf8");

  assert.match(source, /DetailPanel/);
  assert.match(source, /selectedAnnouncement/);
});

test("admin events page opens event records inside the shared detail panel", async () => {
  const source = await readFile(adminEventsPagePath, "utf8");

  assert.match(source, /DetailPanel/);
  assert.match(source, /selectedEvent/);
});

test("teacher notification, announcement, and event pages reuse the shared detail panel", async () => {
  const [notificationsSource, announcementsSource, eventsSource] = await Promise.all([
    readFile(teacherNotificationsPagePath, "utf8"),
    readFile(teacherAnnouncementsPagePath, "utf8"),
    readFile(teacherEventsPagePath, "utf8"),
  ]);

  assert.match(notificationsSource, /DetailPanel/);
  assert.match(announcementsSource, /DetailPanel/);
  assert.match(eventsSource, /DetailPanel/);
});

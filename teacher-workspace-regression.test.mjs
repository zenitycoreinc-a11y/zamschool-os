import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();

async function readSource(...parts) {
  return readFile(resolve(root, ...parts), "utf8");
}

test("workspace layouts do not choose shells only from pathname", async () => {
  const dashboardLayout = await readSource("app", "(dashboard)", "layout.tsx");
  const appLayout = await readSource("app", "app", "layout.tsx");

  assert.doesNotMatch(dashboardLayout, /pathname\.startsWith\("\/app\/teacher"\) \|\| pathname\.startsWith\("\/teacher"\)/);
  assert.doesNotMatch(appLayout, /pathname\.startsWith\("\/app\/teacher"\)/);
});

test("teacher-visible shared pages do not point at admin-only implementations", async () => {
  const teacherShell = await readSource("components", "TeacherShell.tsx");
  const teacherDashboard = await readSource("app", "(dashboard)", "teacher", "page.tsx");
  const teacherClassesPage = await readSource("app", "(dashboard)", "teacher", "classes", "page.tsx");
  const teacherAttendancePage = await readSource("app", "(dashboard)", "teacher", "attendance", "page.tsx");
  const teacherProfilePage = await readSource("app", "app", "profile", "page.tsx");
  const teacherProfileRoute = await readSource("app", "(dashboard)", "teacher", "profile", "page.tsx");
  const teacherSettingsRoute = await readSource("app", "(dashboard)", "teacher", "settings", "page.tsx");
  const announcementsCard = await readSource("components", "Announcements.tsx");
  const teacherAnnouncementsPage = await readSource("app", "(dashboard)", "teacher", "announcements", "page.tsx").catch(() => "");
  const teacherEventsPage = await readSource("app", "(dashboard)", "teacher", "events", "page.tsx").catch(() => "");
  const teacherNotificationsPage = await readSource("app", "(dashboard)", "teacher", "notifications", "page.tsx").catch(() => "");

  assert.doesNotMatch(teacherShell, /href: "\/app\/messages"/);
  assert.doesNotMatch(teacherShell, /href: "\/app\/announcements"/);
  assert.doesNotMatch(teacherShell, /href: "\/app\/events"/);
  assert.doesNotMatch(teacherShell, /href: "\/list\/attendance"/);
  assert.doesNotMatch(teacherDashboard, /href="\/list\/attendance"/);
  assert.match(teacherDashboard, /Account snapshot/i);
  assert.match(teacherClassesPage, /Assigned subjects|Assigned classes|Supervised classes/);
  assert.doesNotMatch(teacherAttendancePage, /AttendanceListPage from "@\/app\/\(dashboard\)\/list\/attendance\/page"/);
  assert.match(teacherProfilePage, /Teaching assignment|School details/i);
  assert.match(teacherProfilePage, /\/api\/account\/profile/);
  assert.doesNotMatch(teacherProfileRoute, /^export \{ default \} from /m);
  assert.doesNotMatch(teacherSettingsRoute, /^export \{ default \} from /m);
  assert.doesNotMatch(announcementsCard, /\/api\/admin\/announcements/);
  assert.match(
    teacherAnnouncementsPage,
    /\/api\/teacher\/announcements|\/api\/account\/announcements|from\("announcements"\)/
  );
  assert.match(teacherEventsPage, /\/api\/teacher\/events|\/api\/account\/events|from\("events"\)/);
  assert.match(
    teacherNotificationsPage,
    /\/api\/teacher\/notifications|\/api\/account\/notifications|from\("notifications"\)/
  );
});

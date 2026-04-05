import test from "node:test";
import assert from "node:assert/strict";

import {
  buildInboxCounts,
  canMarkAllAsRead,
  filterInboxItems,
  getInboxActionItems,
} from "./notifications-inbox.ts";

const items = [
  {
    id: "n1",
    title: "Attendance reminder",
    body: "Class 8 register still needs review.",
    type: "notification",
    status: "unread",
    href: "/app/notifications/1",
    timestamp: "2026-03-26T08:00:00.000Z",
  },
  {
    id: "n2",
    title: "Sports day announcement",
    body: "Assembly starts at 10 AM.",
    type: "announcement",
    status: "read",
    href: "/app/announcements/2",
    timestamp: "2026-03-25T08:00:00.000Z",
  },
  {
    id: "n3",
    title: "Science fair event",
    body: "Hall booking has been confirmed.",
    type: "event",
    status: "unread",
    href: "/app/events/3",
    timestamp: "2026-03-24T08:00:00.000Z",
  },
];

test("buildInboxCounts summarizes all, unread, and read items", () => {
  assert.deepEqual(buildInboxCounts(items), {
    all: 3,
    unread: 2,
    read: 1,
  });
});

test("filterInboxItems applies mode and search together", () => {
  const unread = filterInboxItems(items, { query: "", mode: "unread" });
  assert.deepEqual(unread.map((item) => item.id), ["n1", "n3"]);

  const search = filterInboxItems(items, { query: "sports", mode: "all" });
  assert.deepEqual(search.map((item) => item.id), ["n2"]);
});

test("notification actions include only meaningful inbox operations", () => {
  assert.deepEqual(getInboxActionItems(items[0]), [
    { key: "open", label: "Open item", tone: "neutral" },
    { key: "mark-read", label: "Mark as read", tone: "neutral" },
  ]);
  assert.equal(canMarkAllAsRead(items), true);
});

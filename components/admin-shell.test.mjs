import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const shellPath = resolve(process.cwd(), "webapp", "components", "AdminShell.tsx");

test("admin shell turns the top search field into an interactive workspace search", async () => {
  const source = await readFile(shellPath, "utf8");

  assert.doesNotMatch(source, /readOnly/);
  assert.match(source, /Search pages, tools, and people/);
  assert.match(source, /filteredSearchItems/);
  assert.match(source, /setSearchOpen\(true\)/);
});

test("admin shell loads unread message and notification counts for the header shortcuts", async () => {
  const source = await readFile(shellPath, "utf8");

  assert.match(source, /\/api\/account\/unread-summary/);
  assert.match(source, /unreadSummary/);
  assert.match(source, /formatUnreadBadgeCount/);
  assert.match(source, /animate-pulse/);
});

test("admin shell wires the header shortcuts and overflow menu to real actions", async () => {
  const source = await readFile(shellPath, "utf8");

  assert.match(source, /router\.push\("\/admin\/messages"\)/);
  assert.match(source, /router\.push\("\/admin\/notifications"\)/);
  assert.match(source, /setOverflowOpen/);
  assert.match(source, /Sign Out/);
});

test("admin shell targets the canonical admin route set instead of legacy /app routes", async () => {
  const source = await readFile(shellPath, "utf8");

  assert.match(source, /href: "\/admin", label: "Dashboard"/);
  assert.match(source, /href: "\/admin\/users", label: "Users"/);
  assert.match(source, /router\.push\("\/admin\/messages"\)/);
  assert.match(source, /router\.push\("\/admin\/notifications"\)/);
  assert.match(source, /href: "\/teacher\/messages", label: "Messages"/);
  assert.match(source, /href: "\/teacher\/profile", label: "Profile"/);
  assert.match(source, /href: "\/teacher\/settings", label: "Settings"/);
  assert.match(source, /href: "\/student\/messages", label: "Messages"/);
  assert.match(source, /href: "\/student\/profile", label: "Profile"/);
  assert.match(source, /href: "\/student\/settings", label: "Settings"/);
  assert.match(source, /href: "\/parent\/messages", label: "Messages"/);
  assert.match(source, /href: "\/parent\/profile", label: "Profile"/);
  assert.match(source, /href: "\/parent\/settings", label: "Settings"/);
  assert.doesNotMatch(source, /"\/app\/dashboard"/);
  assert.doesNotMatch(source, /"\/app\/messages"/);
  assert.doesNotMatch(source, /"\/app\/notifications"/);
  assert.doesNotMatch(source, /"\/app\/profile"/);
  assert.doesNotMatch(source, /"\/app\/settings"/);
});

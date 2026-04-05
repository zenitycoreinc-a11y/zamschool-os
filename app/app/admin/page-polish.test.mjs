import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const auditPagePath = resolve(process.cwd(), "app", "app", "admin", "audit", "page.tsx");
const eventsPagePath = resolve(process.cwd(), "app", "(dashboard)", "list", "events", "page.tsx");
const announcementsPagePath = resolve(process.cwd(), "app", "(dashboard)", "list", "announcements", "page.tsx");

test("audit page loads through the admin audit API instead of probing tables client-side", async () => {
  const source = await readFile(auditPagePath, "utf8");

  assert.match(source, /\/api\/admin\/audit/);
  assert.doesNotMatch(source, /resolveTable\(TABLE_CANDIDATES\)/);
});

test("events page avoids dead filter buttons and uses lowercase role targets", async () => {
  const source = await readFile(eventsPagePath, "utf8");

  assert.doesNotMatch(source, /SlidersHorizontal/);
  assert.doesNotMatch(source, /<Filter className/);
  assert.match(source, /value="admin"/);
  assert.match(source, /value="teacher"/);
  assert.match(source, /value="student"/);
  assert.match(source, /value="parent"/);
});

test("announcements page avoids dead filter buttons and uses lowercase role targets", async () => {
  const source = await readFile(announcementsPagePath, "utf8");

  assert.doesNotMatch(source, /SlidersHorizontal/);
  assert.doesNotMatch(source, /<Filter className/);
  assert.match(source, /value="admin"/);
  assert.match(source, /value="teacher"/);
  assert.match(source, /value="student"/);
  assert.match(source, /value="parent"/);
});

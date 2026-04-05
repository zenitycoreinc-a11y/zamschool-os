import test from "node:test";
import assert from "node:assert/strict";

import {
  OFFLINE_CORE_API_URLS,
  OFFLINE_CORE_PAGE_URLS,
  SLOW_NETWORK_THRESHOLD_MS,
  isOfflineCoreApiPath,
  isOfflineCorePagePath,
} from "./offline-support.ts";

test("offline support defines the curated core page routes", () => {
  assert.deepEqual(
    OFFLINE_CORE_PAGE_URLS,
    [
      "/app/dashboard",
      "/app/admin/users",
      "/app/admin/fees",
      "/app/admin/finance",
      "/app/announcements",
    ]
  );
});

test("offline support defines the curated core GET api routes", () => {
  assert.deepEqual(
    OFFLINE_CORE_API_URLS,
    [
      "/api/admin/users",
      "/api/admin/classes",
      "/api/admin/subjects",
      "/api/admin/finance",
      "/api/admin/payments",
      "/api/admin/announcements",
    ]
  );
});

test("offline support matches curated page and api paths", () => {
  assert.equal(isOfflineCorePagePath("/app/admin/users"), true);
  assert.equal(isOfflineCorePagePath("/app/admin/timetable"), false);
  assert.equal(isOfflineCoreApiPath("/api/admin/payments?status=PENDING"), true);
  assert.equal(isOfflineCoreApiPath("/api/admin/events"), false);
});

test("slow-network threshold stays above one second", () => {
  assert.equal(typeof SLOW_NETWORK_THRESHOLD_MS, "number");
  assert.equal(SLOW_NETWORK_THRESHOLD_MS > 1000, true);
});

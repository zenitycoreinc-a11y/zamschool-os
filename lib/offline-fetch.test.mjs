import test from "node:test";
import assert from "node:assert/strict";

import { createNetworkStatusStore } from "./network-status.ts";
import { fetchWithOfflineSupport } from "./offline-fetch.ts";

test("offline fetch guard blocks mutations when the browser is offline", async () => {
  const store = createNetworkStatusStore();
  let called = false;

  await assert.rejects(
    () =>
      fetchWithOfflineSupport("/api/admin/finance", {
        method: "POST",
        body: JSON.stringify({ amount: 100 }),
      }, {
        fetchImpl: async () => {
          called = true;
          return new Response(null, { status: 204 });
        },
        getBrowserOnline: () => false,
        store,
        now: () => 1700000010000,
      }),
    /Offline: changes can't be saved yet\./
  );

  assert.equal(called, false);
  assert.equal(store.getSnapshot().status, "offline");
});

test("offline fetch support records sync metadata for fast successful GET requests", async () => {
  const store = createNetworkStatusStore();

  const response = await fetchWithOfflineSupport("/api/admin/finance", {
    method: "GET",
  }, {
    fetchImpl: async () => new Response(JSON.stringify({ ok: true }), { status: 200 }),
    getBrowserOnline: () => true,
    store,
    now: (() => {
      let call = 0;
      return () => {
        call += 1;
        return call === 1 ? 1000 : 1450;
      };
    })(),
  });

  assert.equal(response.status, 200);
  assert.deepEqual(store.getSnapshot(), {
    status: "online",
    lastSyncedAt: 1450,
    lastLatencyMs: 450,
  });
});

test("offline fetch support marks slow network without treating it as offline", async () => {
  const store = createNetworkStatusStore();

  await fetchWithOfflineSupport("/api/admin/users", {
    method: "GET",
  }, {
    fetchImpl: async () => new Response(JSON.stringify({ data: [] }), { status: 200 }),
    getBrowserOnline: () => true,
    store,
    now: (() => {
      let call = 0;
      return () => {
        call += 1;
        return call === 1 ? 1000 : 4100;
      };
    })(),
  });

  assert.deepEqual(store.getSnapshot(), {
    status: "slow",
    lastSyncedAt: 4100,
    lastLatencyMs: 3100,
  });
});

import test from "node:test";
import assert from "node:assert/strict";

import { createNetworkStatusStore } from "./network-status.ts";

test("network status store starts online with no sync metadata", () => {
  const store = createNetworkStatusStore();

  assert.deepEqual(store.getSnapshot(), {
    status: "online",
    lastSyncedAt: null,
    lastLatencyMs: null,
  });
});

test("fast successful requests keep the store online and record sync time", () => {
  const store = createNetworkStatusStore();

  store.noteRequestSuccess({ latencyMs: 420, syncedAt: 1700000000000 });

  assert.deepEqual(store.getSnapshot(), {
    status: "online",
    lastSyncedAt: 1700000000000,
    lastLatencyMs: 420,
  });
});

test("slow successful requests mark the store slow without switching offline", () => {
  const store = createNetworkStatusStore();

  store.noteRequestSuccess({ latencyMs: 2600, syncedAt: 1700000005000 });

  assert.deepEqual(store.getSnapshot(), {
    status: "slow",
    lastSyncedAt: 1700000005000,
    lastLatencyMs: 2600,
  });
});

test("browser offline wins over any previous success state", () => {
  const store = createNetworkStatusStore();

  store.noteRequestSuccess({ latencyMs: 2600, syncedAt: 1700000005000 });
  store.setOffline();

  assert.deepEqual(store.getSnapshot(), {
    status: "offline",
    lastSyncedAt: 1700000005000,
    lastLatencyMs: 2600,
  });
});

test("returning online clears offline mode until another slow request is recorded", () => {
  const store = createNetworkStatusStore();

  store.setOffline();
  store.setOnline();

  assert.deepEqual(store.getSnapshot(), {
    status: "online",
    lastSyncedAt: null,
    lastLatencyMs: null,
  });
});

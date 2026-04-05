import test from "node:test";
import assert from "node:assert/strict";

import { applyAuthProviderEvent } from "./auth-provider-events.ts";

test("INITIAL_SESSION clears loading without navigation", async () => {
  const calls = [];

  await applyAuthProviderEvent({
    event: "INITIAL_SESSION",
    session: null,
    setLoading: (loading) => calls.push(["setLoading", loading]),
    refresh: () => calls.push(["refresh"]),
    replace: (href) => calls.push(["replace", href]),
    signOut: async () => calls.push(["signOut"]),
  });

  assert.deepEqual(calls, [["setLoading", false]]);
});

test("SIGNED_IN refreshes the router and clears loading", async () => {
  const calls = [];

  await applyAuthProviderEvent({
    event: "SIGNED_IN",
    session: { access_token: "token" },
    setLoading: (loading) => calls.push(["setLoading", loading]),
    refresh: () => calls.push(["refresh"]),
    replace: (href) => calls.push(["replace", href]),
    signOut: async () => calls.push(["signOut"]),
  });

  assert.deepEqual(calls, [
    ["refresh"],
    ["setLoading", false],
  ]);
});

test("SIGNED_OUT redirects to login and clears loading", async () => {
  const calls = [];

  await applyAuthProviderEvent({
    event: "SIGNED_OUT",
    session: null,
    setLoading: (loading) => calls.push(["setLoading", loading]),
    refresh: () => calls.push(["refresh"]),
    replace: (href) => calls.push(["replace", href]),
    signOut: async () => calls.push(["signOut"]),
  });

  assert.deepEqual(calls, [
    ["replace", "/login"],
    ["setLoading", false],
  ]);
});

test("TOKEN_REFRESHED without a session signs out and clears loading", async () => {
  const calls = [];

  await applyAuthProviderEvent({
    event: "TOKEN_REFRESHED",
    session: null,
    setLoading: (loading) => calls.push(["setLoading", loading]),
    refresh: () => calls.push(["refresh"]),
    replace: (href) => calls.push(["replace", href]),
    signOut: async () => calls.push(["signOut"]),
  });

  assert.deepEqual(calls, [
    ["signOut"],
    ["setLoading", false],
  ]);
});

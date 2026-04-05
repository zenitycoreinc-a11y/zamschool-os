import test from "node:test";
import assert from "node:assert/strict";

import {
  createCookieBackedBrowserClient,
  getOrCreateBrowserClient,
} from "./supabase-browser-client.ts";

test("browser client factory returns the same instance for repeated calls", () => {
  const storage = {};
  const first = getOrCreateBrowserClient(storage, () => ({ id: 1 }));
  const second = getOrCreateBrowserClient(storage, () => ({ id: 2 }));

  assert.equal(first, second);
});

test("cookie-backed browser client delegates to the SSR browser client factory", () => {
  const calls = [];
  const storage = {};

  const first = createCookieBackedBrowserClient({
    storage,
    supabaseUrl: "https://example.supabase.co",
    supabaseAnonKey: "anon-key",
    createBrowserClientImpl: (...args) => {
      calls.push(args);
      return { id: 1 };
    },
  });

  const second = createCookieBackedBrowserClient({
    storage,
    supabaseUrl: "https://example.supabase.co",
    supabaseAnonKey: "anon-key",
    createBrowserClientImpl: () => ({ id: 2 }),
  });

  assert.equal(first, second);
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], "https://example.supabase.co");
  assert.equal(calls[0][1], "anon-key");
});

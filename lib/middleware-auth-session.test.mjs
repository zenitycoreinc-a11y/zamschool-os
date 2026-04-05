import test from "node:test";
import assert from "node:assert/strict";

import {
  combineSupabaseCookieChunks,
  decodeSupabaseSessionCookie,
  getSupabaseAuthCookieName,
  resolveSessionRole,
  resolveSupabaseSessionFromCookies,
} from "./middleware-auth-session.ts";

test("getSupabaseAuthCookieName derives the project-scoped auth cookie key", () => {
  assert.equal(
    getSupabaseAuthCookieName("https://jnnroitaftfmclegbeac.supabase.co"),
    "sb-jnnroitaftfmclegbeac-auth-token"
  );
});

test("combineSupabaseCookieChunks reassembles chunked auth cookies", () => {
  const combined = combineSupabaseCookieChunks(
    [
      { name: "sb-demo-auth-token.1", value: "second" },
      { name: "sb-demo-auth-token.0", value: "first" },
    ],
    "sb-demo-auth-token"
  );

  assert.equal(combined, "firstsecond");
});

test("decodeSupabaseSessionCookie supports raw and base64url-encoded sessions", () => {
  const rawSession = JSON.stringify({
    access_token: "token-1",
    user: {
      user_metadata: {
        role: "teacher",
      },
    },
  });
  const encodedSession = `base64-${Buffer.from(rawSession, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "")}`;

  assert.equal(decodeSupabaseSessionCookie(rawSession)?.access_token, "token-1");
  assert.equal(decodeSupabaseSessionCookie(encodedSession)?.access_token, "token-1");
});

test("resolveSupabaseSessionFromCookies and resolveSessionRole read role metadata", () => {
  const cookiePayload = JSON.stringify({
    access_token: "token-1",
    user: {
      user_metadata: {
        role: "admin",
      },
    },
  });

  const session = resolveSupabaseSessionFromCookies({
    supabaseUrl: "https://jnnroitaftfmclegbeac.supabase.co",
    cookies: [
      {
        name: "sb-jnnroitaftfmclegbeac-auth-token",
        value: cookiePayload,
      },
    ],
  });

  assert.equal(resolveSessionRole(session), "ADMIN");
});

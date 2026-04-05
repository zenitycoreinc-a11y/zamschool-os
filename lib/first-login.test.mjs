import test from "node:test";
import assert from "node:assert/strict";

import { clearFirstLoginState, FirstLoginError } from "./first-login.ts";

test("clearFirstLoginState clears first-login flags in auth metadata and the profile row", async () => {
  const calls = [];
  const adminClient = {
    auth: {
      admin: {
        updateUserById: async (userId, attrs) => {
          calls.push(["updateUserById", userId, attrs]);
          return { error: null };
        },
      },
    },
    from: () => ({
      update: (payload) => {
        calls.push(["profileUpdate", payload]);
        return {
          eq: async (field, value) => {
            calls.push(["eq", field, value]);
            return { error: null };
          },
        };
      },
    }),
  };
  const result = await clearFirstLoginState({
    adminClient,
    userId: "user-1",
    userMetadata: { role: "teacher", must_change_password: true },
  });

  assert.deepEqual(result, { success: true });
  assert.deepEqual(calls, [
    [
      "updateUserById",
      "user-1",
      {
        user_metadata: { role: "teacher", must_change_password: false },
      },
    ],
    [
      "profileUpdate",
      {
        must_change_password: false,
        temporary_password_issued_at: null,
      },
    ],
    ["eq", "id", "user-1"],
  ]);
});

test("clearFirstLoginState rolls back auth metadata when profile unlock fails", async () => {
  const calls = [];
  const adminClient = {
    auth: {
      admin: {
        updateUserById: async (userId, attrs) => {
          calls.push(["updateUserById", userId, attrs]);
          return { error: null };
        },
      },
    },
    from: () => ({
      update: (payload) => {
        calls.push(["profileUpdate", payload]);
        return {
          eq: async (field, value) => {
            calls.push(["eq", field, value]);
            return { error: { message: "RLS blocked profile update" } };
          },
        };
      },
    }),
  };
  await assert.rejects(
    clearFirstLoginState({
      adminClient,
      userId: "user-1",
      userMetadata: { role: "teacher", must_change_password: true },
    }),
    (err) => err instanceof FirstLoginError && /Failed to clear first-login flags/.test(err.message)
  );

  assert.deepEqual(calls, [
    [
      "updateUserById",
      "user-1",
      {
        user_metadata: { role: "teacher", must_change_password: false },
      },
    ],
    [
      "profileUpdate",
      {
        must_change_password: false,
        temporary_password_issued_at: null,
      },
    ],
    ["eq", "id", "user-1"],
    [
      "updateUserById",
      "user-1",
      {
        user_metadata: { role: "teacher", must_change_password: true },
      },
    ],
  ]);
});

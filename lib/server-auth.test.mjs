import test from "node:test";
import assert from "node:assert/strict";

import {
  buildActorContext,
  normalizeRole,
} from "./server-auth-core.ts";

test("normalizeRole accepts uppercase and lowercase role values", () => {
  assert.equal(normalizeRole("admin"), "ADMIN");
  assert.equal(normalizeRole("TEACHER"), "TEACHER");
  assert.equal(normalizeRole(" payments "), "PAYMENTS");
  assert.equal(normalizeRole("unknown"), null);
});

test("buildActorContext rejects missing authenticated users", () => {
  const result = buildActorContext({
    user: null,
    profile: null,
    allowedRoles: ["ADMIN"],
    requireSchool: true,
  });

  assert.deepEqual(result, {
    ok: false,
    status: 401,
    error: "Unauthorized",
  });
});

test("buildActorContext rejects users without an allowed role", () => {
  const result = buildActorContext({
    user: {
      id: "user-1",
      user_metadata: {
        role: "teacher",
      },
    },
    profile: {
      role: "TEACHER",
      school_id: "school-1",
    },
    allowedRoles: ["ADMIN"],
    requireSchool: true,
  });

  assert.deepEqual(result, {
    ok: false,
    status: 403,
    error: "Forbidden",
  });
});

test("buildActorContext requires a school link for school-scoped admin routes", () => {
  const result = buildActorContext({
    user: {
      id: "user-1",
      user_metadata: {
        role: "admin",
      },
    },
    profile: {
      role: "ADMIN",
      school_id: null,
    },
    allowedRoles: ["ADMIN"],
    requireSchool: true,
  });

  assert.deepEqual(result, {
    ok: false,
    status: 403,
    error: "School access is required",
  });
});

test("buildActorContext allows school setup for an admin before a school exists", () => {
  const result = buildActorContext({
    user: {
      id: "user-1",
      user_metadata: {
        role: "admin",
      },
    },
    profile: {
      role: null,
      school_id: null,
    },
    allowedRoles: ["ADMIN"],
    requireSchool: false,
    allowMetadataRoleFallback: true,
  });

  assert.deepEqual(result, {
    ok: true,
    userId: "user-1",
    schoolId: null,
    role: "ADMIN",
  });
});

test("buildActorContext returns the authenticated actor school for admin routes", () => {
  const result = buildActorContext({
    user: {
      id: "user-1",
      user_metadata: {
        role: "admin",
      },
    },
    profile: {
      role: "ADMIN",
      school_id: "school-1",
    },
    allowedRoles: ["ADMIN"],
    requireSchool: true,
  });

  assert.deepEqual(result, {
    ok: true,
    userId: "user-1",
    schoolId: "school-1",
    role: "ADMIN",
  });
});

test("buildActorContext rejects metadata-only teacher roles for school-scoped access", () => {
  const result = buildActorContext({
    user: {
      id: "user-1",
      user_metadata: {
        role: "teacher",
      },
    },
    profile: {
      role: null,
      school_id: "school-1",
    },
    allowedRoles: ["TEACHER"],
    requireSchool: true,
  });

  assert.deepEqual(result, {
    ok: false,
    status: 403,
    error: "Forbidden",
  });
});

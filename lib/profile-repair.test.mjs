import test from "node:test";
import assert from "node:assert/strict";

import { buildProfileRepairPayload } from "./profile-repair.ts";

test("buildProfileRepairPayload derives names and admin role from email metadata", () => {
  const payload = buildProfileRepairPayload({
    userId: "123",
    email: "admin@example.com",
    metadata: {
      school_id: "school-1",
      role: "admin",
      admin_name: "Test Admin",
    },
  });

  assert.deepEqual(payload, {
    id: "123",
    school_id: "school-1",
    role: "admin",
    first_name: "Test",
    last_name: "Admin",
    email: "admin@example.com",
  });
});

test("buildProfileRepairPayload falls back to email local-part when no name metadata exists", () => {
  const payload = buildProfileRepairPayload({
    userId: "123",
    email: "jane.doe@example.com",
    metadata: {
      school_id: "school-1",
      role: "teacher",
    },
  });

  assert.deepEqual(payload, {
    id: "123",
    school_id: "school-1",
    role: "teacher",
    first_name: "jane",
    last_name: "doe",
    email: "jane.doe@example.com",
  });
});

test("buildProfileRepairPayload returns null when required metadata is missing", () => {
  assert.equal(
    buildProfileRepairPayload({
      userId: "123",
      email: "user@example.com",
      metadata: {},
    }),
    null
  );
});

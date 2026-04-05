import test from "node:test";
import assert from "node:assert/strict";

import {
  normalizeAudienceForStorage,
  normalizeTargetRoleForResponse,
  normalizeTargetRoleForStorage,
} from "./audience-targeting.ts";

test("normalizeTargetRoleForStorage keeps lowercase singular roles and clears all-role values", () => {
  assert.equal(normalizeTargetRoleForStorage("ADMIN"), "admin");
  assert.equal(normalizeTargetRoleForStorage("teachers"), "teacher");
  assert.equal(normalizeTargetRoleForStorage("student"), "student");
  assert.equal(normalizeTargetRoleForStorage("all"), null);
  assert.equal(normalizeTargetRoleForStorage(""), null);
});

test("normalizeAudienceForStorage maps role-targeted items to the live audience check values", () => {
  assert.equal(normalizeAudienceForStorage("admin"), "all");
  assert.equal(normalizeAudienceForStorage("teacher"), "teachers");
  assert.equal(normalizeAudienceForStorage("student"), "students");
  assert.equal(normalizeAudienceForStorage("parent"), "parents");
  assert.equal(normalizeAudienceForStorage(null), "all");
});

test("normalizeTargetRoleForResponse returns the uppercase form expected by the admin UI", () => {
  assert.equal(normalizeTargetRoleForResponse("teacher"), "TEACHER");
  assert.equal(normalizeTargetRoleForResponse("teachers"), "TEACHER");
  assert.equal(normalizeTargetRoleForResponse("all"), null);
});

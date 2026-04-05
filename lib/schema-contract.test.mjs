import test from "node:test";
import assert from "node:assert/strict";

import { SCHEMA_CONTRACT } from "./schema-contract.mjs";

test("profiles contract matches verified non-null name columns", () => {
  assert.equal(SCHEMA_CONTRACT.profiles.first_name.isNullable, "NO");
  assert.equal(SCHEMA_CONTRACT.profiles.last_name.isNullable, "NO");
});

test("profiles contract includes school tenancy linkage", () => {
  assert.equal(SCHEMA_CONTRACT.profiles.school_id.dataType, "uuid");
});

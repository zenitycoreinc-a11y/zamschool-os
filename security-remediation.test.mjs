import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("migration tooling no longer hardcodes privileged keys or public-key fallbacks", () => {
  const applyMigrationSupabase = readFileSync("C:/-zamschool-os/webapp/apply-migration-supabase.js", "utf8");
  const runMigration = readFileSync("C:/-zamschool-os/webapp/run-migration.js", "utf8");
  const supabaseLib = readFileSync("C:/-zamschool-os/webapp/lib/supabase.ts", "utf8");

  assert.equal(applyMigrationSupabase.includes("service_role"), false);
  assert.equal(applyMigrationSupabase.includes("eyJhbGciOiJIUzI1Ni"), false);
  assert.equal(runMigration.includes("NEXT_PUBLIC_SUPABASE_ANON_KEY"), false);
  assert.equal(
    supabaseLib.includes("process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey"),
    false
  );
});

test("schema check script does not contain hardcoded database credentials", () => {
  const schemaCheck = readFileSync("C:/-zamschool-os/webapp/scripts/schema-check.mjs", "utf8");

  assert.equal(schemaCheck.includes("Isonmumbuna098@"), false);
  assert.equal(schemaCheck.includes('|| "jnnroitaftfmclegbeac"'), false);
});

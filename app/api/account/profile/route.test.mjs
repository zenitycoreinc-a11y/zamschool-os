import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const routePath = resolve(process.cwd(), "app", "api", "account", "profile", "route.ts");

test("account profile route guards missing school context before updating the profile", async () => {
  const source = await readFile(routePath, "utf8");

  assert.match(source, /if\s*\(!access\.context\.schoolId\)/);
  assert.match(source, /await updateOwnProfile\(access\.context\.userId,\s*access\.context\.schoolId,\s*payload\)/);
});

test("account profile route exposes a GET self-detail endpoint with teacher assignment data and first-login state", async () => {
  const source = await readFile(routePath, "utf8");

  assert.match(source, /export\s+async\s+function\s+GET/);
  assert.match(source, /firstLogin/);
  assert.match(source, /mustChangePassword/);
  assert.match(source, /temporaryPasswordIssuedAt/);
  assert.match(source, /buildTeacherAccountDetail|loadTeacherAccountDetail/);
  assert.match(source, /profile:/);
  assert.match(source, /teacher:/);
});

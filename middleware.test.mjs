import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const middlewarePath = resolve(process.cwd(), "webapp", "middleware.ts");

test("middleware adds API CORS handling for Expo web requests", async () => {
  const source = await readFile(middlewarePath, "utf8");

  assert.match(source, /pathname\.startsWith\("\/api\/"\)/);
  assert.match(source, /request\.method === "OPTIONS"/);
  assert.match(source, /Access-Control-Allow-Origin/);
  assert.match(source, /Access-Control-Allow-Methods/);
});

test("middleware protects legacy list routes and normalizes protected aliases before access checks", async () => {
  const source = await readFile(middlewarePath, "utf8");

  assert.match(source, /normalizeLegacyDashboardPath/);
  assert.match(source, /pathname\.startsWith\("\/list"\)/);
  assert.match(source, /pathname\.startsWith\("\/payments"\)/);
  assert.match(source, /resolveRoleAwareProtectedPath/);
});

test("middleware accepts canonical role-based routes and drops legacy /app canonicality", async () => {
  const source = await readFile(middlewarePath, "utf8");

  assert.match(source, /pathname\.startsWith\("\/admin"\)/);
  assert.match(source, /pathname\.startsWith\("\/teacher"\)/);
  assert.match(source, /pathname\.startsWith\("\/student"\)/);
  assert.match(source, /pathname\.startsWith\("\/parent"\)/);
  assert.match(source, /normalizeLegacyDashboardPath/);
  assert.match(source, /resolveRoleAwareProtectedPath/);
});

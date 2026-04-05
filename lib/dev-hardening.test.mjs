import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const devGuardPath = resolve(process.cwd(), "lib", "dev-route-guard.ts");
const envRoutePath = resolve(process.cwd(), "app", "api", "debug", "env", "route.ts");
const inspectRoutePath = resolve(process.cwd(), "app", "api", "debug", "inspect_v2", "route.ts");
const testEmailRoutePath = resolve(process.cwd(), "app", "api", "test-email", "route.ts");
const rateLimitPath = resolve(process.cwd(), "lib", "rate-limit.ts");

test("unsafe dev routes require explicit enablement and loopback-only requests", async () => {
  const source = await readFile(devGuardPath, "utf8");

  assert.match(source, /ENABLE_UNSAFE_DEV_ROUTES/);
  assert.match(source, /isLoopbackHost/);
  assert.match(source, /x-forwarded-for/);
  assert.match(source, /x-real-ip/);
});

test("debug and test routes use the shared unsafe dev route guard", async () => {
  const routes = await Promise.all([
    readFile(envRoutePath, "utf8"),
    readFile(inspectRoutePath, "utf8"),
    readFile(testEmailRoutePath, "utf8"),
  ]);

  for (const route of routes) {
    assert.match(route, /requireUnsafeLocalDevRoute/);
    assert.match(route, /const blocked = requireUnsafeLocalDevRoute\(req\)/);
  }
});

test("redis-backed upload rate limiting fails closed on backend errors", async () => {
  const source = await readFile(rateLimitPath, "utf8");

  assert.match(source, /return\s+\{\s*allowed:\s*false,\s*remaining:\s*0,\s*resetTime:\s*now \+ config\.windowMs\s*\}/);
  assert.doesNotMatch(source, /Allow request if Redis fails/);
});

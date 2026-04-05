import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const middlewarePath = resolve(process.cwd(), "middleware.ts");
const loginPagePath = resolve(process.cwd(), "app", "login", "page.tsx");

test("middleware lets /login stay reachable even when a session cookie exists", async () => {
  const source = await readFile(middlewarePath, "utf8");

  assert.match(source, /pathname\.startsWith\("\/login"\)/);
  assert.match(source, /hasSession && isAuthPage/);
  assert.match(source, /return NextResponse\.next\(\)/);
});

test("middleware does not force upgrade-insecure-requests on localhost http traffic", async () => {
  const source = await readFile(middlewarePath, "utf8");

  assert.match(source, /isLoopbackOrigin/);
  assert.match(source, /upgrade-insecure-requests/);
  assert.match(source, /buildContentSecurityPolicy/);
  assert.match(source, /shouldUpgradeInsecureRequests:\s*[\s\S]*isHttps && !isLoopbackOrigin\(request\.nextUrl\.origin\)/);
});

test("login page exposes explicit switch-account handling", async () => {
  const source = await readFile(loginPagePath, "utf8");

  assert.match(source, /Use another account/i);
  assert.match(source, /Continue to workspace/i);
  assert.match(source, /supabase\.auth\.getSession/);
  assert.match(source, /supabase\.auth\.signOut/);
});

test("login page wires auth throttle cooldown handling", async () => {
  const source = await readFile(loginPagePath, "utf8");

  assert.match(source, /getAuthRateLimitState/);
  assert.match(source, /getLoginCooldownState/);
  assert.match(source, /Too many login attempts\. Try again in/);
  assert.match(source, /disabled=\{loading \|\| switchingAccount \|\| cooldownState\.active\}/);
});

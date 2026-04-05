import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const routePath = resolve(process.cwd(), "app", "api", "admin", "audit", "route.ts");

test("admin audit route authenticates with the incoming request context", async () => {
  const source = await readFile(routePath, "utf8");

  assert.match(source, /export async function GET\(req: Request\)/);
  assert.match(source, /requireAdminContext\(req\)/);
});

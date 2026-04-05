import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const routePath = resolve(process.cwd(), "app", "api", "admin", "payments", "route.ts");

test("admin payments route uses request-scoped admin auth and the live payments table", async () => {
  const source = await readFile(routePath, "utf8");

  assert.match(source, /export async function GET/);
  assert.match(source, /export async function POST/);
  assert.match(source, /export async function PUT/);
  assert.match(source, /export async function DELETE/);
  assert.match(source, /requireAdminContext\(req\)/);
  assert.match(source, /from\("payments"\)/);
  assert.match(source, /export async function POST[\s\S]*const access = await requireAdminContext\(req\);/);
  assert.match(source, /export async function PUT[\s\S]*const access = await requireAdminContext\(req\);/);
  assert.match(source, /export async function DELETE[\s\S]*const access = await requireAdminContext\(req\);/);
});

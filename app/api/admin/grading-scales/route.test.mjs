import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const routePath = resolve(process.cwd(), "app", "api", "admin", "grading-scales", "route.ts");

test("admin grading scales route uses request-scoped admin context and live grading_scales table", async () => {
  const source = await readFile(routePath, "utf8");

  assert.match(source, /export async function GET/);
  assert.match(source, /export async function POST/);
  assert.match(source, /export async function PUT/);
  assert.match(source, /export async function DELETE/);
  assert.match(source, /requireAdminContext\(req\)/);
  assert.match(source, /export async function POST[\s\S]*const access = await requireAdminContext\(req\);/);
  assert.match(source, /export async function PUT[\s\S]*const access = await requireAdminContext\(req\);/);
  assert.match(source, /export async function DELETE[\s\S]*const access = await requireAdminContext\(req\);/);
  assert.match(source, /from\("grading_scales"\)/);
  assert.match(source, /remarks/);
  assert.doesNotMatch(source, /payload\.name =|name:\s*body\.name|description:\s*body\.description/);
  assert.match(source, /success: true, data/);
});

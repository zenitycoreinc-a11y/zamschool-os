import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const routePath = resolve(process.cwd(), "app", "api", "admin", "grades", "route.ts");

test("admin grades route handles missing live grade schema explicitly", async () => {
  const source = await readFile(routePath, "utf8");

  assert.match(source, /export async function GET/);
  assert.match(source, /isMissingGradesSchemaError/);
  assert.match(source, /success: true, data: \[\]/);
  assert.match(source, /Apply the live prerequisite migration/);
});

import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const routePath = resolve(process.cwd(), "app", "api", "student", "dashboard", "route.ts");

test("student dashboard route publishes a private cache policy for read-mostly mobile reads", async () => {
  const source = await readFile(routePath, "utf8");

  assert.match(source, /Cache-Control/);
  assert.match(source, /private, max-age=/);
});

test("student dashboard route includes assignment submission state for the signed-in student", async () => {
  const source = await readFile(routePath, "utf8");

  assert.match(source, /assignment_submissions/);
  assert.match(source, /submissionStatus/);
  assert.match(source, /submittedAt/);
});

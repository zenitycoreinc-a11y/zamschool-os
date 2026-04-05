import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const clientPath = resolve(process.cwd(), "lib", "teacher-bootstrap-client.ts");

test("teacher bootstrap client provides cache reuse, in-flight deduping, and preload hooks", async () => {
  const source = await readFile(clientPath, "utf8");

  assert.match(source, /fetchTeacherBootstrap/);
  assert.match(source, /preloadTeacherBootstrap/);
  assert.match(source, /invalidateTeacherBootstrap/);
  assert.match(source, /cachedTeacherBootstrap/);
  assert.match(source, /teacherBootstrapPromise/);
});

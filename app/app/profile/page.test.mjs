import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const pagePath = resolve(process.cwd(), "app", "app", "profile", "page.tsx");
const componentPath = resolve(
  process.cwd(),
  "components",
  "account",
  "AccountProfilePage.tsx"
);

test("generic profile page uses the shared account profile component without teacher-only copy", async () => {
  const [pageSource, componentSource] = await Promise.all([
    readFile(pagePath, "utf8"),
    readFile(componentPath, "utf8"),
  ]);

  assert.match(pageSource, /AccountProfilePage/);
  assert.match(pageSource, /pageTitle="Profile"/);
  assert.match(pageSource, /settingsHref="\/app\/settings"/);
  assert.doesNotMatch(pageSource, /Teacher Profile/);
  assert.doesNotMatch(pageSource, /Teaching assignment/);

  assert.match(componentSource, /\/api\/account\/avatar/);
  assert.match(componentSource, /Upload avatar/);
  assert.match(componentSource, /Temporary password/);
  assert.match(componentSource, /readFileAsDataUrl/);
});

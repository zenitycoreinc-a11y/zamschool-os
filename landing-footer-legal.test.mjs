import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import { resolve } from "node:path";

const footerPath = resolve(process.cwd(), "components", "landing", "LandingFooter.tsx");
const legalPages = ["privacy", "terms", "cookies"];

async function fileExists(path) {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

test("landing footer only exposes real legal links", async () => {
  const footerSource = await readFile(footerPath, "utf8");

  assert.match(footerSource, /label:\s*"Privacy Policy",\s*href:\s*"\/privacy"/);
  assert.match(footerSource, /label:\s*"Terms of Service",\s*href:\s*"\/terms"/);
  assert.match(footerSource, /label:\s*"Cookie Policy",\s*href:\s*"\/cookies"/);
  assert.ok(!footerSource.includes('label: "Documentation"'));
  assert.ok(!footerSource.includes('label: "Help Centre"'));
  assert.ok(!footerSource.includes('label: "Blog"'));
  assert.ok(!footerSource.includes('label: "Features"'));
  assert.ok(!footerSource.includes('label: "Solutions"'));
  assert.ok(!footerSource.includes('label: "Pricing"'));
  assert.ok(!footerSource.includes('label: "Changelog"'));
  assert.ok(!footerSource.includes('label: "Roadmap"'));
  assert.ok(!footerSource.includes('The smart school operating system built for modern African schools.'));
});

test("legal landing pages exist", async () => {
  for (const slug of legalPages) {
    const pagePath = resolve(process.cwd(), "app", slug, "page.tsx");
    assert.equal(await fileExists(pagePath), true, `${slug} page should exist`);
  }
});

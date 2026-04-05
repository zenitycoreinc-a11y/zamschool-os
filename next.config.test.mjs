import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const configPath = resolve(process.cwd(), "next.config.ts");

test("next image config allows remote Supabase storage avatars", async () => {
  const source = await readFile(configPath, "utf8");

  assert.match(source, /NEXT_PUBLIC_SUPABASE_URL/);
  assert.match(source, /remotePatterns/);
  assert.match(source, /storage\/v1\/object\/public\/\*\*/);
});

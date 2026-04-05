import test from "node:test";
import assert from "node:assert/strict";

import { formatLocalDateInputValue } from "./local-date.ts";

test("formatLocalDateInputValue keeps the local calendar date for early-morning times", () => {
  const value = formatLocalDateInputValue(new Date(2026, 2, 19, 0, 30, 0));
  assert.equal(value, "2026-03-19");
});

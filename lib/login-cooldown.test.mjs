import test from "node:test";
import assert from "node:assert/strict";

import {
  buildLoginCooldown,
  getLoginCooldownState,
} from "./login-cooldown.ts";

test("buildLoginCooldown starts from the retry window", () => {
  const cooldown = buildLoginCooldown(30, 1_000);

  assert.equal(cooldown.until, 31_000);
});

test("getLoginCooldownState reports the remaining seconds while active", () => {
  const state = getLoginCooldownState(31_000, 5_000);

  assert.equal(state.active, true);
  assert.equal(state.remainingSeconds, 26);
});

test("getLoginCooldownState clears after expiry", () => {
  const state = getLoginCooldownState(31_000, 31_100);

  assert.equal(state.active, false);
  assert.equal(state.remainingSeconds, 0);
});

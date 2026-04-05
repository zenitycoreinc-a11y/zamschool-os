import test from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_AUTH_RETRY_SECONDS,
  getAuthRateLimitState,
} from "./auth-rate-limit.ts";

test("getAuthRateLimitState recognizes provider throttle responses", () => {
  const result = getAuthRateLimitState({
    message: "Too many requests. Please try again in 45 seconds.",
    status: 429,
  });

  assert.equal(result.isRateLimited, true);
  assert.equal(result.retryAfterSeconds, 45);
  assert.match(result.message, /45 seconds/i);
});

test("getAuthRateLimitState falls back to the default retry window when throttle timing is missing", () => {
  const result = getAuthRateLimitState({
    message: "For security purposes, you can only request this after some time.",
  });

  assert.equal(result.isRateLimited, true);
  assert.equal(result.retryAfterSeconds, DEFAULT_AUTH_RETRY_SECONDS);
});

test("getAuthRateLimitState ignores invalid credential failures", () => {
  const result = getAuthRateLimitState({
    message: "Invalid login credentials",
    status: 400,
  });

  assert.equal(result.isRateLimited, false);
  assert.equal(result.retryAfterSeconds, 0);
});

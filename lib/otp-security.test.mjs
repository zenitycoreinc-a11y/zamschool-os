import test from "node:test";
import assert from "node:assert/strict";

import {
  generateOtpCode,
  hashOtpCode,
  isOtpCodeMatch,
  resolveOtpSecret,
} from "./otp-security.ts";

test("generateOtpCode returns a six digit string using injected randomness", () => {
  const otp = generateOtpCode({
    randomIntFn(min, max) {
      assert.equal(min, 100000);
      assert.equal(max, 1000000);
      return 123456;
    },
  });

  assert.equal(otp, "123456");
});

test("hashOtpCode is deterministic for the same secret and payload", () => {
  const first = hashOtpCode({
    email: "admin@example.com",
    userId: "00000000-0000-0000-0000-000000000001",
    otpCode: "123456",
    secret: "top-secret",
  });
  const second = hashOtpCode({
    email: "admin@example.com",
    userId: "00000000-0000-0000-0000-000000000001",
    otpCode: "123456",
    secret: "top-secret",
  });

  assert.equal(first, second);
  assert.equal(first.length > 20, true);
});

test("isOtpCodeMatch distinguishes valid and invalid OTP inputs", () => {
  const storedHash = hashOtpCode({
    email: "admin@example.com",
    userId: "00000000-0000-0000-0000-000000000001",
    otpCode: "123456",
    secret: "top-secret",
  });

  assert.equal(
    isOtpCodeMatch({
      email: "admin@example.com",
      userId: "00000000-0000-0000-0000-000000000001",
      otpCode: "123456",
      secret: "top-secret",
      storedHash,
    }),
    true
  );

  assert.equal(
    isOtpCodeMatch({
      email: "admin@example.com",
      userId: "00000000-0000-0000-0000-000000000001",
      otpCode: "654321",
      secret: "top-secret",
      storedHash,
    }),
    false
  );
});

test("resolveOtpSecret requires a dedicated OTP_SECRET", () => {
  assert.equal(resolveOtpSecret({ OTP_SECRET: "dedicated-secret" }), "dedicated-secret");

  assert.throws(
    () => resolveOtpSecret({ SUPABASE_SERVICE_ROLE_KEY: "service-role-secret" }),
    /Missing OTP_SECRET/
  );
});

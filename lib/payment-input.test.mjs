import test from "node:test";
import assert from "node:assert/strict";

import { parseStudentPaymentInput } from "./payment-input.ts";

test("parseStudentPaymentInput normalizes valid student payment submissions", () => {
  const result = parseStudentPaymentInput({
    student_id: "550e8400-e29b-41d4-a716-446655440000",
    amount: "250.50",
    payment_type: "tuition",
    payment_method: "",
    reference_number: "REF-100",
  });

  assert.deepEqual(result, {
    studentId: "550e8400-e29b-41d4-a716-446655440000",
    amount: 250.5,
    paymentType: "tuition",
    paymentMethod: "cash",
    referenceNumber: "REF-100",
  });
});

test("parseStudentPaymentInput rejects negative or zero payment amounts", () => {
  assert.throws(
    () =>
      parseStudentPaymentInput({
        student_id: "550e8400-e29b-41d4-a716-446655440000",
        amount: 0,
        payment_type: "tuition",
      }),
    /greater than zero/
  );
});

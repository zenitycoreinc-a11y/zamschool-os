import { z } from "zod";

export const studentPaymentInputSchema = z.object({
  student_id: z.string().uuid(),
  amount: z.coerce.number().finite().positive("Payment amount must be greater than zero.").max(1_000_000),
  payment_type: z.string().trim().min(1).max(64),
  payment_method: z.preprocess(
    (value) => {
      const normalized = String(value ?? "").trim();
      return normalized || undefined;
    },
    z.string().trim().min(1).max(64).optional()
  ),
  reference_number: z.preprocess(
    (value) => {
      const normalized = String(value ?? "").trim();
      return normalized || undefined;
    },
    z.string().trim().max(120).optional()
  ),
});

export function parseStudentPaymentInput(input: unknown) {
  const payload = studentPaymentInputSchema.parse(input);

  return {
    studentId: payload.student_id,
    amount: payload.amount,
    paymentType: payload.payment_type,
    paymentMethod: payload.payment_method || "cash",
    referenceNumber: payload.reference_number || null,
  };
}

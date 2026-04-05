import { supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { z } from "zod";
import { applyRateLimit, getClientIp, parseJsonWithSchema, safeErrorMessage } from "@/lib/server-guards";
import { isOtpCodeMatch, resolveOtpSecret } from "@/lib/otp-security";

const verifyOtpSchema = z.object({
  email: z.string().email(),
  userId: z.string().uuid(),
  otpCode: z.string().length(6),
});

export async function POST(req: Request) {
  try {
    const otpSecret = resolveOtpSecret();
    const ip = getClientIp(req);
    const { email, userId, otpCode } = await parseJsonWithSchema(req, verifyOtpSchema);
    const normalizedEmail = email.toLowerCase();
    const target = await loadOtpTarget(userId, normalizedEmail);
    const rate = await applyRateLimit({
      key: `verify-otp:${ip}:${target.email}:${target.userId}`,
      limit: 10,
      windowMs: 60_000,
    });
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again shortly." },
        {
          status: 429,
          headers: { "Retry-After": String(rate.retryAfterSec) },
        }
      );
    }

    // Get stored OTP
    const { data: verification, error: fetchError } = await supabaseAdmin
      .from("email_verifications")
      .select("*")
      .eq("user_id", target.userId)
      .eq("email", target.email)
      .maybeSingle();

    if (fetchError || !verification) {
      return NextResponse.json(
        { error: "Invalid or expired OTP. Please request a new one." },
        { status: 400 }
      );
    }

    // Check expiry
    if (new Date(verification.expires_at) < new Date()) {
      return NextResponse.json(
        { error: "OTP has expired. Please request a new one." },
        { status: 400 }
      );
    }

    // Check if already verified
    if (verification.verified) {
      return NextResponse.json(
        { error: "Email already verified" },
        { status: 400 }
      );
    }

    // Verify OTP
    if (
      !isOtpCodeMatch({
        email: target.email,
        userId: target.userId,
        otpCode,
        secret: otpSecret,
        storedHash: verification.otp_code,
      })
    ) {
      return NextResponse.json(
        { error: "Invalid OTP. Please try again." },
        { status: 400 }
      );
    }

    // Mark as verified
    const { error: updateError } = await supabaseAdmin
      .from("email_verifications")
      .update({ verified: true, verified_at: new Date().toISOString() })
      .eq("user_id", target.userId);

    if (updateError) {
      console.error("Verification update error:", updateError);
      return NextResponse.json(
        { error: "Failed to verify email" },
        { status: 500 }
      );
    }

    // Confirm email in Supabase Auth
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
      target.userId,
      { email_confirm: true }
    );

    if (authError) {
      console.error("Auth email confirm error:", authError);
      // Continue anyway, the verification table is our source of truth
    }

    return NextResponse.json({
      success: true,
      message: "Email verified successfully",
    });
  } catch (error: unknown) {
    console.error("Verify OTP error:", safeErrorMessage(error, "Unknown error"));
    return NextResponse.json(
      { error: safeErrorMessage(error, "Failed to verify OTP") },
      { status: 500 }
    );
  }
}

async function loadOtpTarget(userId: string, requestedEmail: string) {
  const lookup = await supabaseAdmin.auth.admin.getUserById(userId);
  const resolvedEmail = String(lookup.data.user?.email || "").trim().toLowerCase();

  if (lookup.error || !lookup.data.user || !resolvedEmail || resolvedEmail !== requestedEmail) {
    throw new Error("Invalid verification request");
  }

  return {
    userId: lookup.data.user.id,
    email: resolvedEmail,
  };
}

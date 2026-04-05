import { supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { z } from "zod";
import { applyRateLimit, getClientIp, parseJsonWithSchema, safeErrorMessage, validateRequestSecurity } from "@/lib/server-guards";
import { emailService } from "@/lib/email";
import { generateOtpCode, hashOtpCode, resolveOtpSecret } from "@/lib/otp-security";

const sendOtpSchema = z.object({
  email: z.string().email(),
  userId: z.string().uuid(),
});

export async function POST(req: Request) {
  try {
    // 1. Basic Security Guard
    const security = validateRequestSecurity(req);
    if (!security.valid) {
      return NextResponse.json({ error: security.error }, { status: 403 });
    }

    const otpSecret = resolveOtpSecret();
    const ip = getClientIp(req);
    const { email, userId } = await parseJsonWithSchema(req, sendOtpSchema);
    const normalizedEmail = email.toLowerCase();
    const target = await loadOtpTarget(userId, normalizedEmail);

    // 2. Distributed Rate Limiting (Persistent via Redis)
    const rate = await applyRateLimit({
      key: `send-otp:${ip}:${target.email}:${target.userId}`,
      limit: 5,
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

    // 3. OTP Generation & Hashing
    const otpCode = generateOtpCode();
    const otpHash = hashOtpCode({
      email: target.email,
      userId: target.userId,
      otpCode,
      secret: otpSecret,
    });
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

    // 4. Database Storage (Optimized Upsert)
    const { error: upsertError } = await supabaseAdmin
      .from("email_verifications")
      .upsert(
        {
          user_id: target.userId,
          email: target.email,
          otp_code: otpHash,
          expires_at: expiresAt.toISOString(),
          verified: false,
        },
        { onConflict: "user_id" }
      );

    if (upsertError) {
      console.error("OTP storage error:", upsertError);
      return NextResponse.json({ error: "Failed to generate OTP" }, { status: 500 });
    }

    // 5. SMTP Email Dispatch (Milliseconds Latency)
    const emailResult = await emailService.sendOtpEmail(target.email, otpCode);
    
    if (!emailResult.success) {
      console.error("Failed to send OTP email:", emailResult.error);
      return NextResponse.json(
        { error: "Failed to send verification email" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "OTP sent to your email",
    });
  } catch (error: unknown) {
    console.error("Send OTP error:", safeErrorMessage(error, "Unknown error"));
    return NextResponse.json(
      { error: safeErrorMessage(error, "Failed to send OTP") },
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

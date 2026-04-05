"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Loader2, AlertCircle, Mail, RefreshCw, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function VerifyEmailPage() {
  const [otp, setOtp] = useState<string[]>(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [email, setEmail] = useState<string>("");
  const [userId, setUserId] = useState<string>("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const loadSession = async () => {
      const emailParam = searchParams.get("email");
      const userIdParam = searchParams.get("userId");

      if (emailParam && userIdParam) {
        setEmail(emailParam);
        setUserId(userIdParam);
        sendOtp(emailParam, userIdParam);
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email && user?.id) {
          setEmail(user.email);
          setUserId(user.id);
          sendOtp(user.email, user.id);
        } else {
          router.replace("/login");
        }
      }
    };

    loadSession();
  }, [router, searchParams]);

  const sendOtp = async (targetEmail: string, targetUserId: string) => {
    setResendLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail, userId: targetUserId }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to send OTP");

      if (result.debugOtp) {
        console.log("Development OTP:", result.debugOtp);
      }
    } catch (err: any) {
      setError(err.message || "Failed to send OTP");
    } finally {
      setResendLoading(false);
    }
  };

  const handleResend = () => {
    if (email && userId) {
      sendOtp(email, userId);
    }
  };

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    if (index === 5 && value) {
      const fullOtp = [...newOtp.slice(0, 5), value].join("");
      if (fullOtp.length === 6) {
        handleVerify(fullOtp);
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      const newOtp = pasted.split("");
      setOtp(newOtp);
      handleVerify(pasted);
    }
  };

  const handleVerify = async (fullOtp: string) => {
    if (!email || !userId) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, userId, otpCode: fullOtp }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Verification failed");

      setSuccess(true);

      setTimeout(() => {
        router.replace("/login?verified=true");
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Invalid OTP");
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 p-4">
        <div className="w-full max-w-md rounded-3xl border border-white/15 bg-white/10 backdrop-blur-xl p-8 text-center text-white shadow-[0_32px_70px_rgba(2,6,23,0.5)]">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-9 h-9 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold mb-3">Email Verified!</h1>
          <p className="text-slate-300">Your email has been successfully verified. Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 p-4">
      <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)", backgroundSize: "34px 34px" }} />
      <div className="absolute -top-20 left-1/3 w-[520px] h-[520px] bg-sky-500/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-24 right-1/3 w-[460px] h-[460px] bg-violet-500/18 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative w-full max-w-md rounded-3xl border border-white/15 bg-white/10 backdrop-blur-xl p-8 text-center text-white shadow-[0_32px_70px_rgba(2,6,23,0.5)]">
        <div className="w-16 h-16 rounded-full bg-sky-100 flex items-center justify-center mx-auto mb-6">
          <Mail className="w-9 h-9 text-sky-600" />
        </div>
        <h1 className="text-2xl font-bold mb-3">Verify Your Email</h1>
        <p className="text-slate-300 mb-6">
          We&apos;ve sent a 6-digit code to<br />
          <span className="text-sky-300 font-medium">{email || "your email"}</span>
        </p>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-400/30 rounded-xl flex items-start gap-3 text-red-200 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex justify-center gap-2 mb-6" onPaste={handlePaste}>
          {otp.map((digit, index) => (
            <input
              key={index}
              ref={(el) => { inputRefs.current[index] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              disabled={loading}
              className={cn(
                "w-12 h-14 text-center text-2xl font-bold rounded-xl border-2 bg-white/10 text-white",
                "focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-transparent transition-all",
                "disabled:opacity-50",
                digit ? "border-sky-500" : "border-white/20"
              )}
            />
          ))}
        </div>

        <button
          onClick={() => handleVerify(otp.join(""))}
          disabled={loading || otp.join("").length !== 6}
          className="w-full bg-sky-500 text-white py-3 rounded-xl font-bold text-lg hover:bg-sky-400 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-sky-500/30 mb-4"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Verifying...
            </>
          ) : (
            "Verify Code"
          )}
        </button>

        <div className="flex flex-col gap-3">
          <button
            onClick={handleResend}
            disabled={resendLoading}
            className="text-sm text-slate-300 hover:text-sky-300 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {resendLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                Resend Code
              </>
            )}
          </button>

          <a href="/login" className="text-sm text-slate-400 hover:text-white transition-colors">
            Back to Login
          </a>
        </div>
      </div>
    </div>
  );
}

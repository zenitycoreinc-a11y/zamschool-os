"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import Image from "next/image";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: typeof window !== "undefined" ? `${window.location.origin}/login` : undefined,
      });

      if (error) throw error;
      setSuccess("Password reset link sent. Check your email inbox.");
    } catch (err: any) {
      setError(err?.message || "Failed to send reset link");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 p-4">
      <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)", backgroundSize: "34px 34px" }} />
      <div className="relative w-full max-w-md rounded-3xl border border-white/15 bg-white/10 backdrop-blur-xl shadow-[0_32px_70px_rgba(2,6,23,0.5)] p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl overflow-hidden shadow-md mb-3">
            <Image src="/icon.png" alt="ZamSchool OS" width={48} height={48} className="w-full h-full object-cover" priority />
          </div>
          <h1 className="text-2xl font-bold text-white">Reset Password</h1>
          <p className="text-slate-300 text-center">Enter your account email and we will send a reset link.</p>
        </div>

        {error ? (
          <div className="mb-5 p-3 rounded-xl border border-red-400/30 bg-red-500/10 text-red-200 text-sm flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5" />
            <span>{error}</span>
          </div>
        ) : null}

        {success ? (
          <div className="mb-5 p-3 rounded-xl border border-emerald-400/30 bg-emerald-500/10 text-emerald-200 text-sm flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 mt-0.5" />
            <span>{success}</span>
          </div>
        ) : null}

        <form onSubmit={onSubmit} className="space-y-4">
          <label className="block">
            <span className="block text-sm font-medium text-slate-200 mb-1">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-white/20 bg-white/10 text-white placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-300"
              placeholder="name@school.com"
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-sky-500 text-white py-3 rounded-xl font-bold hover:bg-sky-400 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</> : "Send Reset Link"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link href="/login" className="text-sky-300 hover:underline text-sm">Back to Login</Link>
        </div>
      </div>
    </div>
  );
}

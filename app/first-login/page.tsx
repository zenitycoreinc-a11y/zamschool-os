"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Eye, EyeOff, Loader2, LockKeyhole } from "lucide-react";

import { resolveOnboardingPath } from "@/lib/auth-routing";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

type AccountProfilePayload = {
  success?: boolean;
  data?: {
    profile?: {
      role?: string | null;
    } | null;
    firstLogin?: {
      mustChangePassword?: boolean;
      temporaryPasswordIssuedAt?: string | null;
    } | null;
  } | null;
  error?: string;
};

export default function FirstLoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [profileRole, setProfileRole] = useState<string | null>(null);
  const [temporaryPasswordIssuedAt, setTemporaryPasswordIssuedAt] = useState<string | null>(null);

  const helperText = useMemo(() => {
    if (!temporaryPasswordIssuedAt) {
      return "Set a new password to activate this account and continue to your workspace.";
    }

    const issuedAt = new Date(temporaryPasswordIssuedAt);
    return Number.isNaN(issuedAt.getTime())
      ? "Set a new password to activate this account and continue to your workspace."
      : `Your temporary password was issued on ${issuedAt.toLocaleString()}. Choose a new one now.`;
  }, [temporaryPasswordIssuedAt]);

  useEffect(() => {
    let active = true;

    const loadState = async () => {
      setLoading(true);
      setError("");

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!active) return;
        if (!session?.user) {
          router.replace("/login");
          return;
        }

      const response = await fetch("/api/account/profile", { cache: "no-store" });
      const payload = (await response.json()) as AccountProfilePayload;
      if (!active) return;

        if (!response.ok) {
          throw new Error(payload.error || "Failed to load account state");
        }

        const mustChangePassword =
          typeof payload.data?.firstLogin?.mustChangePassword === "boolean"
            ? payload.data.firstLogin.mustChangePassword === true
            : session.user.user_metadata?.must_change_password === true;

        const resolvedRole = String(payload.data?.profile?.role || "").trim() || null;
        setProfileRole(resolvedRole);
        setTemporaryPasswordIssuedAt(
          payload.data?.firstLogin?.temporaryPasswordIssuedAt || null
        );

        if (!mustChangePassword) {
          router.replace(
            resolveOnboardingPath({
              role: resolvedRole,
              emailVerified: Boolean(session.user.email_confirmed_at),
              hasSchool: true,
              mustChangePassword: false,
            })
          );
          router.refresh();
        }
      } catch (loadError: any) {
        if (!active) return;
        setError(loadError?.message || "Failed to load first-login state");
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadState();

    return () => {
      active = false;
    };
  }, [router]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (password.trim().length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Confirm password must match the new password.");
      return;
    }

    setSubmitting(true);

    try {
      const updateResult = await supabase.auth.updateUser({
        password,
      });
      if (updateResult.error) {
        throw updateResult.error;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) {
        throw new Error("Your session expired before the password update finished.");
      }

      const response = await fetch("/api/auth/complete-first-login", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || "Failed to complete first login");
      }

      const refreshResult = await supabase.auth.refreshSession();
      if (refreshResult.error) {
        throw refreshResult.error;
      }

      const refreshedSession = refreshResult.data.session || session;

      router.replace(
        resolveOnboardingPath({
          role: profileRole,
          emailVerified: Boolean(refreshedSession?.user?.email_confirmed_at),
          hasSchool: true,
          mustChangePassword: false,
        })
      );
      router.refresh();
    } catch (submitError: any) {
      setError(submitError?.message || "Failed to finish first-login setup");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-950 px-4">
        <div className="flex items-center gap-3 rounded-3xl border border-white/10 bg-white/5 px-6 py-5 text-sm text-slate-200 backdrop-blur">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Preparing first-login setup...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top,_#1e293b,_#020617_55%)] px-4 py-10">
      <div className="pointer-events-none absolute left-1/2 top-12 h-80 w-80 -translate-x-1/2 rounded-full bg-sky-500/15 blur-[110px]" />

      <div className="relative w-full max-w-lg rounded-[32px] border border-white/10 bg-white/8 p-8 text-white shadow-[0_32px_80px_rgba(2,6,23,0.55)] backdrop-blur-xl">
        <div className="flex items-start gap-4">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-sky-500/15 text-sky-200">
            <LockKeyhole className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-200/80">
              First Login
            </p>
            <h1 className="mt-2 text-3xl font-semibold">Activate your managed account</h1>
            <p className="mt-3 text-sm leading-6 text-slate-300">{helperText}</p>
          </div>
        </div>

        {error ? (
          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <PasswordField
            label="New password"
            value={password}
            onChange={setPassword}
            visible={showPassword}
            onToggle={() => setShowPassword((current) => !current)}
          />
          <PasswordField
            label="Confirm password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            visible={showConfirmPassword}
            onToggle={() => setShowConfirmPassword((current) => !current)}
          />

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-sky-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-400 disabled:opacity-60"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Finish first-login setup
          </button>
        </form>
      </div>
    </div>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  visible,
  onToggle,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  visible: boolean;
  onToggle: () => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-200">{label}</span>
      <div className="relative">
        <input
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={cn(
            "w-full rounded-2xl border border-white/15 bg-white/5 px-4 py-3 pr-12 text-sm text-white outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-300/30"
          )}
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-white"
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </label>
  );
}

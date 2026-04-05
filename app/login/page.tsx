"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { User } from "@supabase/supabase-js";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { AlertCircle, Eye, EyeOff, Loader2 } from "lucide-react";
import * as z from "zod";
import { getAuthRateLimitState } from "@/lib/auth-rate-limit";
import { resolveOnboardingPath } from "@/lib/auth-routing";
import { buildLoginCooldown, getLoginCooldownState } from "@/lib/login-cooldown";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormValues = z.infer<typeof loginSchema>;
const FIRST_LOGIN_PATH = "/first-login";
type ProfileSnapshot = {
  role: string | null;
  school_id: string | null;
  must_change_password?: boolean | null;
  temporary_password_issued_at?: string | null;
} | null;
type ExistingSessionState = {
  destination: string;
  email: string;
  hasSchool: boolean;
  role: string | null;
  mustChangePassword: boolean;
};

async function loadProfileSnapshot(user: User): Promise<ProfileSnapshot> {
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, school_id, must_change_password, temporary_password_issued_at")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) throw profileError;
  return profile;
}

function buildDestination(user: User, profile: ProfileSnapshot, redirectTo?: string | null) {
  const mustChangePassword =
    profile?.must_change_password === true ||
    user.user_metadata?.must_change_password === true;

  if (mustChangePassword) {
    return FIRST_LOGIN_PATH;
  }

  return resolveOnboardingPath({
    role: profile?.role,
    emailVerified: Boolean(user.email_confirmed_at),
    hasSchool: Boolean(profile?.school_id),
    mustChangePassword: false,
    redirectTo,
  });
}

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [continuingSession, setContinuingSession] = useState(false);
  const [switchingAccount, setSwitchingAccount] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [existingSession, setExistingSession] = useState<ExistingSessionState | null>(null);
  const [cooldown, setCooldown] = useState<{ email: string; until: number } | null>(null);
  const [cooldownNow, setCooldownNow] = useState(() => Date.now());
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo");

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });
  const enteredEmail = String(watch("email") || "").trim().toLowerCase();
  const cooldownState =
    cooldown && cooldown.email === enteredEmail
      ? getLoginCooldownState(cooldown.until, cooldownNow)
      : { active: false, remainingSeconds: 0 };

  useEffect(() => {
    if (!cooldown?.until) {
      return;
    }

    setCooldownNow(Date.now());
    const timer = window.setInterval(() => {
      setCooldownNow(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [cooldown?.until]);

  useEffect(() => {
    if (cooldown && !getLoginCooldownState(cooldown.until, cooldownNow).active) {
      setCooldown(null);
    }
  }, [cooldown, cooldownNow]);

  useEffect(() => {
    let active = true;

    const inspectExistingSession = async () => {
      setSessionLoading(true);

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!active) return;

        if (!session?.user) {
          setExistingSession(null);
          return;
        }

        const profile = await loadProfileSnapshot(session.user);
        if (!active) return;

        setExistingSession({
          destination: buildDestination(session.user, profile, redirectTo),
          email: session.user.email ?? "Signed-in user",
          hasSchool: Boolean(profile?.school_id),
          role: profile?.role ?? null,
          mustChangePassword:
            profile?.must_change_password === true ||
            session.user.user_metadata?.must_change_password === true,
        });
      } catch (sessionError: any) {
        if (!active) return;
        console.warn("[LoginPage.inspectExistingSession()] Session inspection failed", {
          message: sessionError?.message || "Unable to inspect current session",
        });
        setExistingSession(null);
      } finally {
        if (active) setSessionLoading(false);
      }
    };

    inspectExistingSession();

    return () => {
      active = false;
    };
  }, [redirectTo]);

  const continueToWorkspace = async () => {
    if (!existingSession?.destination) return;

    setContinuingSession(true);
    setError(null);

    try {
      router.replace(existingSession.destination);
      router.refresh();
    } finally {
      setContinuingSession(false);
    }
  };

  const handleUseAnotherAccount = async () => {
    setSwitchingAccount(true);
    setError(null);

    try {
      await supabase.auth.signOut();
      setExistingSession(null);
    } catch (signOutError: any) {
      setError(signOutError?.message || "Unable to clear the current session");
    } finally {
      setSwitchingAccount(false);
    }
  };

  const onSubmit = async (data: LoginFormValues) => {
    setLoading(true);
    setError(null);

    try {
      if (cooldownState.active) {
        setError(`Too many login attempts. Try again in ${cooldownState.remainingSeconds} seconds.`);
        return;
      }

      if (existingSession) {
        await supabase.auth.signOut();
        setExistingSession(null);
      }

      console.info("[LoginPage.onSubmit()] Attempting sign-in", {
        email: data.email.trim().toLowerCase(),
      });

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (authError) throw authError;

      const emailVerified = Boolean(authData.user.email_confirmed_at);
      console.info("[LoginPage.onSubmit()] Sign-in succeeded", {
        userId: authData.user.id,
        emailVerified,
      });

      if (!emailVerified) {
        console.info("[LoginPage.onSubmit()] Redirecting to email verification", {
          userId: authData.user.id,
        });
        router.replace(`/verify-email?email=${encodeURIComponent(data.email)}&userId=${authData.user.id}`);
        router.refresh();
        return;
      }

      const resolvedProfile = await loadProfileSnapshot(authData.user);

      console.info("[LoginPage.onSubmit()] Loaded profile snapshot", {
        userId: authData.user.id,
        role: resolvedProfile?.role || null,
        hasSchoolId: Boolean(resolvedProfile?.school_id),
      });

      const destination = buildDestination(authData.user, resolvedProfile, redirectTo);

      console.info("[LoginPage.onSubmit()] Resolved post-login destination", {
        userId: authData.user.id,
        role: resolvedProfile?.role || null,
        hasSchool: Boolean(resolvedProfile?.school_id),
        destination,
        redirectTo,
      });

      router.replace(destination);
      router.refresh();
    } catch (err: any) {
      const rateLimit = getAuthRateLimitState(err);
      if (rateLimit.isRateLimited) {
        const nextCooldown = buildLoginCooldown(rateLimit.retryAfterSeconds, Date.now());
        setCooldown({
          email: String(data.email || "").trim().toLowerCase(),
          until: nextCooldown.until,
        });
        setCooldownNow(Date.now());
        setError(rateLimit.message);
        return;
      }

      console.warn("[LoginPage.onSubmit()] Sign-in failed", {
        message: err?.message || "Invalid login credentials",
      });
      setError(err?.message || "Invalid login credentials");
    } finally {
      setLoading(false);
    }
  };
  const cooldownMessage = cooldownState.active
    ? `Too many login attempts. Try again in ${cooldownState.remainingSeconds} seconds.`
    : null;
  const authMessage = cooldownMessage || error;

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 p-4">
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{ backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)", backgroundSize: "34px 34px" }}
      />
      <div className="pointer-events-none absolute -top-20 left-1/3 h-[520px] w-[520px] rounded-full bg-sky-500/20 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-24 right-1/3 h-[460px] w-[460px] rounded-full bg-violet-500/18 blur-[120px]" />

      <div className="relative w-full max-w-md rounded-3xl border border-white/15 bg-white/10 p-8 shadow-[0_32px_70px_rgba(2,6,23,0.5)] backdrop-blur-xl">
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-3 h-12 w-12 overflow-hidden rounded-xl shadow-md">
            <Image
              src="/icon.png"
              alt="ZamSchool OS"
              width={48}
              height={48}
              className="h-full w-full object-cover"
              priority
            />
          </div>
          <h1 className="text-2xl font-bold text-white">Welcome Back</h1>
          <p className="text-slate-300">Log in to your ZamSchool OS account</p>
        </div>

        {authMessage && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-200">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{authMessage}</span>
          </div>
        )}

        {sessionLoading ? (
          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-slate-300">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Checking for an active session...</span>
          </div>
        ) : existingSession ? (
          <div className="mb-6 rounded-2xl border border-sky-300/20 bg-sky-400/10 p-4 text-slate-100">
            <p className="text-sm font-semibold text-sky-200">Active session detected</p>
            <p className="mt-2 text-sm text-slate-200">
              {existingSession.email}
              {existingSession.role ? ` is already signed in as ${existingSession.role.toLowerCase()}.` : " is already signed in."}
            </p>
            <p className="mt-1 text-xs text-slate-300">
              {existingSession.mustChangePassword
                ? "This managed account must finish first-login setup before entering the workspace."
                : existingSession.hasSchool
                ? "Continue to workspace, or switch to another account first if you want to use teacher credentials created by an admin."
                : "This account still needs onboarding. Continue to finish setup or switch accounts."}
            </p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={continueToWorkspace}
                disabled={continuingSession || switchingAccount}
                className="flex-1 rounded-xl bg-sky-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-400 disabled:opacity-70"
              >
                {continuingSession ? "Opening workspace..." : "Continue to workspace"}
              </button>
              <button
                type="button"
                onClick={handleUseAnotherAccount}
                disabled={continuingSession || switchingAccount}
                className="flex-1 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/10 disabled:opacity-70"
              >
                {switchingAccount ? "Clearing session..." : "Use another account"}
              </button>
            </div>
          </div>
        ) : null}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">Email Address</label>
            <input
              {...register("email")}
              type="email"
              className={cn(
                "w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder:text-slate-300 transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-sky-300",
                errors.email && "border-red-500 focus:ring-red-500"
              )}
              placeholder="name@school.com"
            />
            {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="block text-sm font-medium text-slate-300">Password</label>
              <Link href="/forgot-password" className="text-xs font-medium text-sky-300 hover:underline">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <input
                {...register("password")}
                type={showPassword ? "text" : "password"}
                className={cn(
                  "w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 pr-12 text-white placeholder:text-slate-300 transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-sky-300",
                  errors.password && "border-red-500 focus:ring-red-500"
                )}
                placeholder="........"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-white"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
          </div>

          <button
            type="submit"
            disabled={loading || switchingAccount || cooldownState.active}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-sky-500 py-3 text-lg font-bold text-white shadow-lg shadow-sky-500/30 transition-all hover:bg-sky-400 disabled:opacity-70"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Logging in...
              </>
            ) : (
              "Login"
            )}
          </button>
        </form>

        <div className="mt-8 border-t border-white/10 pt-6 text-center">
          <p className="text-sm text-slate-300">
            Don&apos;t have a school account?{" "}
            <Link href="/register" className="font-bold text-sky-300 hover:underline">
              Register your school
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

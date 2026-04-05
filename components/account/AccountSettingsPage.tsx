"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Loader2, LogOut, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { fetchAccountProfile, type AccountProfilePayload } from "@/lib/account-profile-client";
import { supabase } from "@/lib/supabase";
import {
  readTeacherWorkspacePreferences,
  type TeacherWorkspacePreferences,
  writeTeacherWorkspacePreferences,
} from "@/lib/teacher-workspace-preferences";

type AccountSettingsPageProps = {
  pageTitle: string;
  intro: string;
  preferencesStorageKey: string;
  sessionTitle: string;
  sessionBody: string;
};

export function AccountSettingsPage({
  pageTitle,
  intro,
  preferencesStorageKey,
  sessionTitle,
  sessionBody,
}: AccountSettingsPageProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profile, setProfile] = useState<AccountProfilePayload["data"] | null>(null);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [preferences, setPreferences] = useState<TeacherWorkspacePreferences>(() =>
    readTeacherWorkspacePreferences(preferencesStorageKey)
  );

  useEffect(() => {
    setPreferences(readTeacherWorkspacePreferences(preferencesStorageKey));
  }, [preferencesStorageKey]);

  useEffect(() => {
    void loadProfile();
  }, []);

  const canUpdate = useMemo(
    () => password.length >= 8 && password === confirmPassword,
    [password, confirmPassword]
  );

  async function loadProfile() {
    setLoadingProfile(true);

    try {
      const payload = await fetchAccountProfile();
      setProfile(payload.data || null);
    } catch (error: any) {
      toast.error(error?.message || "Failed to load account settings");
    } finally {
      setLoadingProfile(false);
    }
  }

  const onUpdatePassword = async () => {
    if (!canUpdate) {
      toast.error("Password must be at least 8 characters and match confirmation");
      return;
    }

    setSaving(true);
    const t = toast.loading("Updating password...");
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setPassword("");
      setConfirmPassword("");
      toast.success("Password updated", { id: t });
      await loadProfile();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update password", { id: t });
    } finally {
      setSaving(false);
    }
  };

  const onSavePreferences = async () => {
    setSavingPrefs(true);
    try {
      writeTeacherWorkspacePreferences(preferences, preferencesStorageKey);
      toast.success("Workspace preferences saved");
    } finally {
      setSavingPrefs(false);
    }
  };

  const onSignOut = async () => {
    setSigningOut(true);
    try {
      await supabase.auth.signOut();
      router.push("/login");
    } finally {
      setSigningOut(false);
    }
  };

  const mustChangePassword = profile?.firstLogin?.mustChangePassword === true;

  function onToggleCompactCards() {
    const nextPreferences = {
      ...preferences,
      compactCards: !preferences.compactCards,
    };
    setPreferences(nextPreferences);
    writeTeacherWorkspacePreferences(nextPreferences, preferencesStorageKey);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{pageTitle}</h1>
        <p className="mt-1 text-slate-500">{intro}</p>
      </div>

      {mustChangePassword ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
          This account is still marked as requiring a password change. Update the password below to
          clear the first-login security flag.
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr),360px]">
        <section className="space-y-6">
          <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-sky-600" />
              <h2 className="font-semibold text-slate-900">Password and security</h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="New password" type="password" value={password} onChange={setPassword} />
              <Field
                label="Confirm password"
                type="password"
                value={confirmPassword}
                onChange={setConfirmPassword}
              />
            </div>

            <button
              onClick={onUpdatePassword}
              disabled={saving || !canUpdate}
              className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-400 disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Update Password
            </button>
          </div>

          <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-sky-600" />
              <h2 className="font-semibold text-slate-900">Workspace preferences</h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label>
                <span className="mb-1 block text-xs font-medium text-slate-600">Timezone</span>
                <input
                  value={preferences.timezone}
                  onChange={(event) =>
                    setPreferences((current) => ({ ...current, timezone: event.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-200"
                />
              </label>

              <label>
                <span className="mb-1 block text-xs font-medium text-slate-600">Notification digest</span>
                <select
                  value={preferences.digestMode}
                  onChange={(event) =>
                    setPreferences((current) => ({
                      ...current,
                      digestMode: event.target.value as TeacherWorkspacePreferences["digestMode"],
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-200"
                >
                  <option value="realtime">Realtime</option>
                  <option value="daily">Daily summary</option>
                </select>
              </label>
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">Compact dashboard cards</p>
                <p className="text-xs text-slate-500">
                  Keep summary widgets tighter on smaller screens. Applies instantly in the teacher
                  workspace.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={preferences.compactCards}
                onClick={onToggleCompactCards}
                className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${
                  preferences.compactCards ? "bg-sky-600" : "bg-slate-300"
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
                    preferences.compactCards ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            <button
              onClick={onSavePreferences}
              disabled={savingPrefs}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              {savingPrefs ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Save preferences
            </button>
          </div>
        </section>

        <aside className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="font-semibold text-slate-900">Account health</h2>
            {loadingProfile ? (
              <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading account state...
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <InfoRow label="Role" value={profile?.profile?.role || "Unknown"} />
                <InfoRow label="Status" value={profile?.profile?.status || "Unknown"} />
                <InfoRow
                  label="Temporary password"
                  value={mustChangePassword ? "Needs update" : "Already rotated"}
                />
                <InfoRow
                  label="Issued"
                  value={profile?.firstLogin?.temporaryPasswordIssuedAt || "Not available"}
                />
              </div>
            )}
          </section>

          <section className="space-y-3 rounded-2xl border border-red-200 bg-white p-6">
            <h2 className="font-semibold text-slate-900">{sessionTitle}</h2>
            <p className="text-sm text-slate-500">{sessionBody}</p>
            <button
              onClick={onSignOut}
              disabled={signingOut}
              className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-60"
            >
              {signingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
              Sign Out
            </button>
          </section>
        </aside>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label>
      <span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-200"
      />
    </label>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-sm font-semibold text-slate-900">{value}</span>
    </div>
  );
}

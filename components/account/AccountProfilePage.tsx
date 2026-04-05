"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Camera, Loader2, Save, ShieldCheck, Upload, User } from "lucide-react";
import { toast } from "sonner";

import { fetchAccountProfile, type AccountProfilePayload } from "@/lib/account-profile-client";

type ProfileForm = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address: string;
  avatar_url: string;
};

type AccountProfilePageProps = {
  pageTitle: string;
  intro: string;
  securityTitle: string;
  securityNote: string;
  settingsCardTitle: string;
  settingsCardBody: string;
  settingsHref: string;
  settingsLinkLabel: string;
  detailsTitle?: string;
  assignmentTitle?: string;
  showTeacherDetails?: boolean;
  initialProfileData?: AccountProfilePayload["data"] | null;
  onProfileRefresh?: () => Promise<void> | void;
};

const EMPTY: ProfileForm = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  address: "",
  avatar_url: "",
};

export function AccountProfilePage({
  pageTitle,
  intro,
  securityTitle,
  securityNote,
  settingsCardTitle,
  settingsCardBody,
  settingsHref,
  settingsLinkLabel,
  detailsTitle = "Role details",
  assignmentTitle = "Role assignments",
  showTeacherDetails = false,
  initialProfileData = null,
  onProfileRefresh,
}: AccountProfilePageProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [loading, setLoading] = useState(!initialProfileData);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [profile, setProfile] = useState<AccountProfilePayload["data"] | null>(initialProfileData);
  const [form, setForm] = useState<ProfileForm>(() => buildFormState(initialProfileData));

  const fullName = useMemo(
    () => `${form.first_name} ${form.last_name}`.trim(),
    [form.first_name, form.last_name]
  );

  useEffect(() => {
    if (!initialProfileData) {
      void loadProfile();
    }
  }, [initialProfileData]);

  useEffect(() => {
    if (!initialProfileData) {
      return;
    }

    setProfile(initialProfileData);
    setForm(buildFormState(initialProfileData));
    setLoading(false);
  }, [initialProfileData]);

  async function loadProfile() {
    setLoading(true);

    try {
      const payload = await fetchAccountProfile();
      const profileData = payload.data || null;
      setProfile(profileData);
      setForm({
        first_name: profileData?.profile?.first_name || "",
        last_name: profileData?.profile?.last_name || "",
        email: profileData?.profile?.email || "",
        phone: profileData?.profile?.phone || "",
        address: profileData?.profile?.address || "",
        avatar_url: profileData?.profile?.avatar_url || "",
      });
    } catch (err: any) {
      toast.error(err?.message || "Failed to load profile");
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }

  async function onSave() {
    setSaving(true);
    const t = toast.loading("Saving profile...");

    try {
      const response = await fetch("/api/account/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: form.first_name.trim() || null,
          last_name: form.last_name.trim() || null,
          email: form.email.trim() || null,
          phone: form.phone.trim() || null,
          address: form.address.trim() || null,
          avatar_url: form.avatar_url.trim() || null,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to update profile");

      await loadProfile();
      await onProfileRefresh?.();
      toast.success("Profile updated", { id: t });
    } catch (err: any) {
      toast.error(err?.message || "Failed to update profile", { id: t });
    } finally {
      setSaving(false);
    }
  }

  async function onUploadAvatar(file: File) {
    setUploadingAvatar(true);
    const t = toast.loading("Uploading avatar...");

    try {
      const base64 = await readFileAsDataUrl(file);
      const response = await fetch("/api/account/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          base64,
          mimeType: file.type || "image/jpeg",
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to upload avatar");

      setForm((current) => ({ ...current, avatar_url: result.data?.avatarUrl || current.avatar_url }));
      toast.success("Avatar updated", { id: t });
    } catch (err: any) {
      toast.error(err?.message || "Failed to upload avatar", { id: t });
    } finally {
      setUploadingAvatar(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white p-10">
        <Loader2 className="h-5 w-5 animate-spin text-sky-600" />
        <span className="text-sm text-slate-500">Loading profile...</span>
      </div>
    );
  }

  const teacher = profile?.teacher;
  const mustChangePassword = profile?.firstLogin?.mustChangePassword === true;
  const showTeacherSections = showTeacherDetails && Boolean(teacher);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{pageTitle}</h1>
        <p className="mt-1 text-slate-500">{intro}</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr),420px]">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="grid h-20 w-20 place-items-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                {form.avatar_url ? (
                  <Image
                    src={form.avatar_url}
                    alt="Profile"
                    width={80}
                    height={80}
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <User className="h-8 w-8 text-slate-400" />
                )}
              </div>
              <div>
                <p className="font-semibold text-slate-900">{fullName || "Unnamed User"}</p>
                <p className="text-sm text-slate-500">{form.email || "No email"}</p>
                <p className="mt-1 text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                  {profile?.profile?.role || "Account"}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    void onUploadAvatar(file);
                  }
                  event.target.value = "";
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                {uploadingAvatar ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                Upload avatar
              </button>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <Field
              label="First name"
              value={form.first_name}
              onChange={(value) => setForm((current) => ({ ...current, first_name: value }))}
            />
            <Field
              label="Last name"
              value={form.last_name}
              onChange={(value) => setForm((current) => ({ ...current, last_name: value }))}
            />
            <Field
              label="Email"
              value={form.email}
              onChange={(value) => setForm((current) => ({ ...current, email: value }))}
            />
            <Field
              label="Phone"
              value={form.phone}
              onChange={(value) => setForm((current) => ({ ...current, phone: value }))}
            />
            <Field
              label="Address"
              value={form.address}
              onChange={(value) => setForm((current) => ({ ...current, address: value }))}
              className="md:col-span-2"
            />
            <Field
              label="Avatar URL"
              value={form.avatar_url}
              onChange={(value) => setForm((current) => ({ ...current, avatar_url: value }))}
              className="md:col-span-2"
              icon={<Camera className="h-3.5 w-3.5 text-slate-400" />}
            />
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={onSave}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-400 disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save changes
            </button>
          </div>
        </section>

        <div className="space-y-6">
          <InfoCard title="Account status">
            <InfoRow label="Status" value={profile?.profile?.status || "Unknown"} />
            <InfoRow label="Role" value={profile?.profile?.role || "Unknown"} />
            <InfoRow
              label="Temporary password"
              value={mustChangePassword ? "Needs update" : "Already updated"}
            />
            <InfoRow
              label="Issued"
              value={profile?.firstLogin?.temporaryPasswordIssuedAt || "Not recorded"}
            />
          </InfoCard>

          {showTeacherSections ? (
            <>
              <InfoCard title={detailsTitle}>
                <InfoRow label="Employee number" value={teacher?.employeeId || "Not assigned"} />
                <InfoRow label="Department" value={teacher?.department || "Not assigned"} />
                <InfoRow label="Hire date" value={teacher?.hireDate || "Not recorded"} />
                <InfoRow label="Tenure" value={teacher?.tenure?.label || "Not recorded"} />
              </InfoCard>

              <InfoCard title={assignmentTitle}>
                <InfoRow label="Specialization" value={teacher?.specialization || "Not assigned"} />
                <TagBlock
                  label="Assigned classes"
                  values={teacher?.assignedClasses?.map((item) => item.name) || []}
                  emptyLabel="No classes assigned yet."
                />
                <TagBlock
                  label="Assigned subjects"
                  values={teacher?.assignedSubjects?.map((item) => item.name) || []}
                  emptyLabel="No subjects assigned yet."
                />
                <TagBlock
                  label="Supervised classes"
                  values={teacher?.supervisedClasses?.map((item) => item.name) || []}
                  emptyLabel="No supervised classes yet."
                />
              </InfoCard>
            </>
          ) : null}

          <InfoCard title={securityTitle}>
            <div className="rounded-2xl bg-slate-50 px-4 py-4 text-sm text-slate-600">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-4 w-4 text-sky-600" />
                <p>{securityNote}</p>
              </div>
            </div>
          </InfoCard>

          <InfoCard title={settingsCardTitle}>
            <p className="text-sm text-slate-600">{settingsCardBody}</p>
            <Link href={settingsHref} className="inline-flex text-sm font-semibold text-sky-600">
              {settingsLinkLabel}
            </Link>
          </InfoCard>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  className,
  icon,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  icon?: React.ReactNode;
}) {
  return (
    <label className={className}>
      <span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>
      <div className="relative">
        {icon ? <div className="absolute left-3 top-2.5">{icon}</div> : null}
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={`w-full rounded-xl border border-slate-200 ${icon ? "pl-8" : "pl-3"} pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-200`}
        />
      </div>
    </label>
  );
}

function InfoCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
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

function TagBlock({
  label,
  values,
  emptyLabel,
}: {
  label: string;
  values: string[];
  emptyLabel: string;
}) {
  return (
    <div>
      <p className="text-sm font-medium text-slate-700">{label}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {values.length === 0 ? (
          <p className="text-sm text-slate-500">{emptyLabel}</p>
        ) : (
          values.map((value) => (
            <span
              key={value}
              className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
            >
              {value}
            </span>
          ))
        )}
      </div>
    </div>
  );
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

function buildFormState(profileData: AccountProfilePayload["data"] | null | undefined): ProfileForm {
  return {
    first_name: profileData?.profile?.first_name || "",
    last_name: profileData?.profile?.last_name || "",
    email: profileData?.profile?.email || "",
    phone: profileData?.profile?.phone || "",
    address: profileData?.profile?.address || "",
    avatar_url: profileData?.profile?.avatar_url || "",
  };
}

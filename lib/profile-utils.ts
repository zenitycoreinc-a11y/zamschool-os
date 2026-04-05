export type AppRole = "admin" | "teacher" | "student" | "parent";

export function normalizeRole(role: string | null | undefined): AppRole | null {
  const value = String(role || "").toLowerCase().trim();
  if (value === "admin" || value === "teacher" || value === "student" || value === "parent") {
    return value;
  }
  return null;
}

export function roleToPath(role: string | null | undefined): string {
  const normalized = normalizeRole(role) || "admin";
  if (normalized === "admin") return "/app/dashboard";
  return `/${normalized}`;
}

export function getDisplayName(profile: any): string {
  return (
    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ").trim() ||
    profile?.name ||
    profile?.email ||
    "User"
  );
}

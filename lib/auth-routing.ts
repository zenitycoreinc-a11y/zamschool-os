export const ADMIN_DASHBOARD_PATH = "/app/dashboard";
export const TEACHER_DASHBOARD_PATH = "/teacher";
export const PAYMENTS_DASHBOARD_PATH = "/app/payments";
const LEGACY_PROTECTED_PREFIX_REDIRECTS = [
  ["/dashboard", ADMIN_DASHBOARD_PATH],
  ["/payments", PAYMENTS_DASHBOARD_PATH],
  ["/profile", "/app/profile"],
  ["/settings", "/app/settings"],
] as const;

const SHARED_PROTECTED_PREFIXES = [
  "/app/profile",
  "/app/settings",
  "/app/messages",
  "/app/announcements",
  "/app/events",
  "/app/notifications",
];

function normalizeRole(role: string | null | undefined) {
  const value = String(role || "").toUpperCase().trim();
  if (
    value === "ADMIN" ||
    value === "TEACHER" ||
    value === "STUDENT" ||
    value === "PARENT" ||
    value === "PAYMENTS"
  ) {
    return value;
  }
  return null;
}

function roleToPath(role: string | null | undefined) {
  const normalized = normalizeRole(role) || "ADMIN";
  if (normalized === "ADMIN") return ADMIN_DASHBOARD_PATH;
  if (normalized === "TEACHER") return TEACHER_DASHBOARD_PATH;
  if (normalized === "PAYMENTS") return PAYMENTS_DASHBOARD_PATH;
  return `/${normalized.toLowerCase()}`;
}

function isSafeRedirect(redirectTo: string | null | undefined): redirectTo is string {
  return typeof redirectTo === "string" && redirectTo.startsWith("/");
}

function isSharedProtectedPath(pathname: string): boolean {
  return SHARED_PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

function mapTeacherSharedPath(pathname: string): string {
  if (pathname === "/app/profile") return "/teacher/profile";
  if (pathname.startsWith("/app/profile/")) {
    return pathname.replace("/app/profile", "/teacher/profile");
  }
  if (pathname === "/app/settings") return "/teacher/settings";
  if (pathname.startsWith("/app/settings/")) {
    return pathname.replace("/app/settings", "/teacher/settings");
  }
  return pathname;
}

export function normalizeLegacyDashboardPath(pathname: string): string {
  for (const [legacyPrefix, canonicalPrefix] of LEGACY_PROTECTED_PREFIX_REDIRECTS) {
    if (pathname === legacyPrefix) return canonicalPrefix;
    if (pathname.startsWith(`${legacyPrefix}/`)) {
      return pathname.replace(legacyPrefix, canonicalPrefix);
    }
  }
  return pathname;
}

export function resolveRoleAwareProtectedPath(
  role: string | null | undefined,
  pathname: string
): string {
  const normalized = normalizeRole(role);
  if (normalized === "TEACHER") {
    if (pathname === "/app/teacher") return TEACHER_DASHBOARD_PATH;
    if (pathname.startsWith("/app/teacher/")) {
      return pathname.replace("/app/teacher", TEACHER_DASHBOARD_PATH);
    }
    return mapTeacherSharedPath(pathname);
  }
  return pathname;
}

export function resolveProtectedRolePrefix(role: string | null | undefined): string {
  const normalized = normalizeRole(role);
  if (!normalized) return "";
  if (normalized === "ADMIN") return "/app";
  if (normalized === "TEACHER") return "/teacher";
  if (normalized === "PAYMENTS") return "/app/payments";
  return `/${normalized.toLowerCase()}`;
}

export function resolvePostLoginPath(
  role: string | null | undefined,
  redirectTo?: string | null
): string {
  const normalized = normalizeRole(role);
  if (!normalized) return "/login?error=profile_not_found";

  const fallbackPath = roleToPath(normalized);
  if (!isSafeRedirect(redirectTo)) return fallbackPath;

  const normalizedRedirect = resolveRoleAwareProtectedPath(
    normalized,
    normalizeLegacyDashboardPath(redirectTo)
  );
  if (isSharedProtectedPath(normalizedRedirect)) return normalizedRedirect;
  if (normalized === "ADMIN") return normalizedRedirect;

  const protectedPrefix = resolveProtectedRolePrefix(normalized);
  if (
    protectedPrefix &&
    (normalizedRedirect === protectedPrefix || normalizedRedirect.startsWith(`${protectedPrefix}/`))
  ) {
    return normalizedRedirect;
  }

  return fallbackPath;
}

export function resolvePostRegistrationPath(role: string | null | undefined): string {
  return resolvePostLoginPath(role);
}

export function resolveOnboardingPath({
  role,
  emailVerified,
  hasSchool,
  mustChangePassword,
  redirectTo,
}: {
  role: string | null | undefined;
  emailVerified: boolean;
  hasSchool: boolean;
  mustChangePassword?: boolean;
  redirectTo?: string | null;
}): string {
  const normalized = normalizeRole(role);

  if (!emailVerified) return "/verify-email";
  if (mustChangePassword) return "/first-login";
  if (normalized === "ADMIN" && !hasSchool) return "/app/admin/school";

  return resolvePostLoginPath(normalized, redirectTo);
}

export function resolveAppWorkspaceHome(role: string | null | undefined): string {
  const normalized = normalizeRole(role);
  if (normalized === "TEACHER") return TEACHER_DASHBOARD_PATH;
  if (normalized === "STUDENT") return "/student";
  if (normalized === "PARENT") return "/parent";
  if (normalized === "PAYMENTS") return PAYMENTS_DASHBOARD_PATH;
  return ADMIN_DASHBOARD_PATH;
}

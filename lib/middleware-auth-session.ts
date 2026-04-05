type CookieEntry = {
  name: string;
  value: string;
};

type SessionLike = {
  access_token?: string | null;
  user?: {
    role?: string | null;
    app_metadata?: Record<string, unknown> | null;
    user_metadata?: Record<string, unknown> | null;
  } | null;
};

const BASE64_PREFIX = "base64-";
const CHUNK_SUFFIX = /\.(\d+)$/;

export function getSupabaseAuthCookieName(supabaseUrl: string | null | undefined) {
  if (!supabaseUrl) return null;

  try {
    const hostname = new URL(supabaseUrl).hostname;
    const projectRef = hostname.split(".")[0];
    return projectRef ? `sb-${projectRef}-auth-token` : null;
  } catch {
    return null;
  }
}

export function combineSupabaseCookieChunks(
  cookies: CookieEntry[],
  baseName: string
) {
  const exact = cookies.find((cookie) => cookie.name === baseName);
  if (exact?.value) {
    return exact.value;
  }

  const chunks = cookies
    .map((cookie) => {
      const match = cookie.name.match(CHUNK_SUFFIX);
      if (!match) return null;
      if (cookie.name.slice(0, match.index) !== baseName) return null;
      return {
        index: Number(match[1]),
        value: cookie.value,
      };
    })
    .filter((value): value is { index: number; value: string } => Boolean(value))
    .sort((left, right) => left.index - right.index);

  if (chunks.length === 0) {
    return null;
  }

  return chunks.map((chunk) => chunk.value).join("");
}

export function decodeSupabaseSessionCookie(value: string | null | undefined): SessionLike | null {
  const normalized = String(value || "").trim();
  if (!normalized) return null;

  const decoded = normalized.startsWith(BASE64_PREFIX)
    ? decodeBase64Url(normalized.slice(BASE64_PREFIX.length))
    : normalized;
  if (!decoded) return null;

  try {
    return JSON.parse(decoded) as SessionLike;
  } catch {
    return null;
  }
}

export function resolveSupabaseSessionFromCookies(input: {
  cookies: CookieEntry[];
  supabaseUrl: string | null | undefined;
}) {
  const cookieName = getSupabaseAuthCookieName(input.supabaseUrl);
  if (!cookieName) {
    console.info("[middleware-auth-session.resolveSupabaseSessionFromCookies()] No cookie name derived", {
      hasSupabaseUrl: Boolean(input.supabaseUrl),
      cookieCount: input.cookies.length,
    });
    return null;
  }

  const cookieValue = combineSupabaseCookieChunks(input.cookies, cookieName);
  const session = decodeSupabaseSessionCookie(cookieValue);

  console.info("[middleware-auth-session.resolveSupabaseSessionFromCookies()] Session decode summary", {
    cookieName,
    hasCookieValue: Boolean(cookieValue),
    cookieChunkCount: input.cookies.filter(
      (cookie) => cookie.name === cookieName || cookie.name.startsWith(`${cookieName}.`)
    ).length,
    hasAccessToken: Boolean(session?.access_token),
    resolvedRole: resolveSessionRole(session),
  });

  return session;
}

export function resolveSessionRole(session: SessionLike | null | undefined) {
  const user = session?.user;
  const candidates = [
    user?.user_metadata?.role,
    user?.app_metadata?.role,
    user?.role,
  ];

  for (const candidate of candidates) {
    const normalized = String(candidate || "").trim().toUpperCase();
    if (["ADMIN", "TEACHER", "STUDENT", "PARENT", "PAYMENTS"].includes(normalized)) {
      return normalized;
    }
  }

  return null;
}

export function resolveSessionMustChangePassword(session: SessionLike | null | undefined) {
  const user = session?.user;
  const candidates = [
    user?.user_metadata?.must_change_password,
    user?.app_metadata?.must_change_password,
  ];

  return candidates.some((candidate) => candidate === true);
}

function decodeBase64Url(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);

  try {
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

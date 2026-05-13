import {
  normalizeLegacyDashboardPath,
  resolveRoleAwareProtectedPath,
  resolvePostLoginPath,
} from "@/lib/auth-routing";
import {
  resolveSessionRole,
  resolveSessionMustChangePassword,
  resolveSupabaseSessionFromCookies,
} from "@/lib/middleware-auth-session";
import { NextResponse, type NextRequest } from "next/server";

const API_CORS_METHODS = "GET,POST,PUT,PATCH,DELETE,OPTIONS";
const DEFAULT_ALLOWED_HEADERS = "Authorization, Content-Type";
const SECURITY_HEADERS = {
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
} as const;

function canAccessPath(role: string | null | undefined, pathname: string) {
  if (!role) return false;

  // Shared protected paths accessible to all authenticated roles
  const sharedProtectedPrefixes = [
    "/app/profile",
    "/app/settings",
    "/app/messages",
    "/app/announcements",
    "/app/events",
    "/app/notifications",
  ];

  if (
    sharedProtectedPrefixes.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    )
  ) {
    return true;
  }

  // Role-specific path restrictions
  if (pathname === "/dashboard" || pathname === "/app/dashboard") return role === "ADMIN";
  if (pathname.startsWith("/app/admin") || pathname.startsWith("/admin")) return role === "ADMIN";
  if (pathname.startsWith("/app/payments") || pathname.startsWith("/payments")) return role === "PAYMENTS";
  if (pathname.startsWith("/teacher")) return role === "TEACHER";
  if (pathname.startsWith("/student")) return role === "STUDENT";
  if (pathname.startsWith("/parent")) return role === "PARENT";
  if (pathname.startsWith("/list")) return true;

  // Default /app paths require ADMIN role
  if (pathname.startsWith("/app")) return role === "ADMIN";

  // Allow access to all other paths
  return true;
}

export function middleware(request: NextRequest) {
  const pathname = normalizeLegacyDashboardPath(request.nextUrl.pathname);

  if (pathname.startsWith("/api/")) {
    const corsHeaders = buildApiCorsHeaders(request);

    if (request.method === "OPTIONS") {
      const response = new NextResponse(null, {
        status: 204,
        headers: corsHeaders,
      });
      applySecurityHeaders(response, request);
      return response;
    }

    const response = NextResponse.next();
    applyCorsHeaders(response, corsHeaders);
    applySecurityHeaders(response, request);
    return response;
  }

  const session = resolveSupabaseSessionFromCookies({
    supabaseUrl:
      process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
    cookies: request.cookies.getAll().map((cookie) => ({
      name: cookie.name,
      value: cookie.value,
    })),
  });
  const role = resolveSessionRole(session);
  const mustChangePassword = resolveSessionMustChangePassword(session);
  const hasSession = Boolean(session?.access_token);

  const isAuthPage =
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/forgot-password");
  const isFirstLoginPage = pathname.startsWith("/first-login");
  const isDashboardPage =
    isFirstLoginPage ||
    pathname.startsWith("/app") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/list") ||
    pathname.startsWith("/teacher") ||
    pathname.startsWith("/student") ||
    pathname.startsWith("/parent");

  if (!hasSession && isDashboardPage) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirectTo", `${pathname}${request.nextUrl.search}`);
    const response = NextResponse.redirect(loginUrl);
    applySecurityHeaders(response, request);
    return response;
  }

  if (hasSession && pathname !== request.nextUrl.pathname) {
    const response = NextResponse.redirect(
      new URL(`${pathname}${request.nextUrl.search}`, request.url)
    );
    applySecurityHeaders(response, request);
    return response;
  }

  const canonicalRolePath = resolveRoleAwareProtectedPath(role, pathname);
  if (hasSession && canonicalRolePath !== pathname) {
    const response = NextResponse.redirect(
      new URL(`${canonicalRolePath}${request.nextUrl.search}`, request.url)
    );
    applySecurityHeaders(response, request);
    return response;
  }

  if (hasSession && mustChangePassword && isDashboardPage && !isFirstLoginPage) {
    const response = NextResponse.redirect(new URL("/first-login", request.url));
    applySecurityHeaders(response, request);
    return response;
  }

  if (hasSession && isDashboardPage && role && !canAccessPath(role, pathname)) {
    const response = NextResponse.redirect(
      new URL(resolvePostLoginPath(role, pathname), request.url)
    );
    applySecurityHeaders(response, request);
    return response;
  }

  if (hasSession && isAuthPage) {
    if (pathname.startsWith("/login")) {
      return NextResponse.next();
    }

    if (!role && pathname.startsWith("/register")) {
      return NextResponse.next();
    }

    const response = NextResponse.redirect(
      new URL(resolvePostLoginPath(role), request.url)
    );
    applySecurityHeaders(response, request);
    return response;
  }

  const response = NextResponse.next();
  applySecurityHeaders(response, request);
  return response;
}

function buildApiCorsHeaders(request: NextRequest) {
  const headers = new Headers();
  const allowedOrigin = resolveAllowedApiOrigin(request);

  if (!allowedOrigin) {
    return headers;
  }

  headers.set("Access-Control-Allow-Origin", allowedOrigin);
  headers.set("Access-Control-Allow-Methods", API_CORS_METHODS);
  headers.set(
    "Access-Control-Allow-Headers",
    request.headers.get("access-control-request-headers") || DEFAULT_ALLOWED_HEADERS
  );
  headers.set("Vary", "Origin, Access-Control-Request-Headers");

  return headers;
}

function applyCorsHeaders(response: NextResponse, headers: Headers) {
  headers.forEach((value, key) => {
    response.headers.set(key, value);
  });
}

function applySecurityHeaders(response: NextResponse, request: NextRequest) {
  const isHttps =
    request.headers.get("x-forwarded-proto") === "https" ||
    request.nextUrl.protocol === "https:" ||
    request.nextUrl.hostname.endsWith(".vercel.app");

  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  response.headers.set(
    "Content-Security-Policy",
    buildContentSecurityPolicy({
      shouldUpgradeInsecureRequests:
        isHttps && !isLoopbackOrigin(request.nextUrl.origin),
    })
  );

  if (isHttps) {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload"
    );
  }
}

function buildContentSecurityPolicy(input: {
  shouldUpgradeInsecureRequests: boolean;
}) {
  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data: https:",
    // SECURITY FIX: Removed 'unsafe-eval' - only keep 'unsafe-inline' for styles
    // If eval is absolutely needed, consider using trusted-types or web workers
    "style-src 'self' 'unsafe-inline' https:",
    // SECURITY FIX: Removed 'unsafe-eval' from script-src
    // Applications should avoid eval() and use safer alternatives
    "script-src 'self' 'unsafe-inline' https:",
    "connect-src 'self' https: wss:",
    "object-src 'none'",
  ];

  if (input.shouldUpgradeInsecureRequests) {
    directives.push("upgrade-insecure-requests");
  }

  return directives.join("; ");
}

function resolveAllowedApiOrigin(request: NextRequest) {
  const requestOrigin = normalizeOrigin(request.headers.get("origin"));
  if (!requestOrigin) {
    return null;
  }

  if (isLoopbackOrigin(requestOrigin)) {
    return requestOrigin;
  }

  const configuredOrigins = [
    process.env.CORS_ALLOWED_ORIGINS,
    process.env.NEXT_PUBLIC_APP_ORIGIN,
    process.env.NEXT_PUBLIC_WEB_ORIGIN,
    process.env.NEXT_PUBLIC_WEBAPP_ORIGIN,
    process.env.NEXT_PUBLIC_WEBAPP_PREVIEW_ORIGIN,
    process.env.EXPO_PUBLIC_WEBAPP_ORIGIN,
    process.env.EXPO_PUBLIC_WEBAPP_PREVIEW_ORIGIN,
  ]
    .flatMap((value) => String(value || "").split(","))
    .map((value) => normalizeOrigin(value))
    .filter((value): value is string => Boolean(value));

  return configuredOrigins.includes(requestOrigin) ? requestOrigin : null;
}

function normalizeOrigin(origin: string | null | undefined) {
  const value = String(origin || "").trim().replace(/\/+$/, "");
  if (!value) {
    return null;
  }

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function isLoopbackOrigin(origin: string) {
  try {
    const url = new URL(origin);
    const hostname = String(url.hostname || "").trim().toLowerCase();
    return hostname === "127.0.0.1" || hostname === "localhost" || hostname === "0.0.0.0";
  } catch {
    return false;
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

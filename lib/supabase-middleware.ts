import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  normalizeLegacyDashboardPath,
  resolvePostLoginPath,
} from "@/lib/auth-routing";

function normalizeRole(role: string | null | undefined) {
  const value = String(role || "").toUpperCase().trim();
  if (["ADMIN", "TEACHER", "STUDENT", "PARENT", "PAYMENTS"].includes(value)) {
    return value;
  }
  return null;
}

function isSharedWorkspacePath(pathname: string) {
  return [
    "/app/profile",
    "/app/settings",
    "/app/messages",
    "/app/announcements",
    "/app/events",
    "/app/notifications",
  ].some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function canAccessPath(role: string | null | undefined, pathname: string) {
  const normalizedRole = normalizeRole(role);
  if (!normalizedRole) return false;
  if (isSharedWorkspacePath(pathname)) return true;
  if (pathname === "/dashboard" || pathname === "/app/dashboard") return normalizedRole === "ADMIN";
  if (pathname.startsWith("/app/admin") || pathname.startsWith("/admin")) return normalizedRole === "ADMIN";
  if (pathname.startsWith("/app/payments") || pathname.startsWith("/payments")) return normalizedRole === "PAYMENTS";
  if (pathname.startsWith("/teacher")) return normalizedRole === "TEACHER";
  if (pathname.startsWith("/student")) return normalizedRole === "STUDENT";
  if (pathname.startsWith("/parent")) return normalizedRole === "PARENT";
  if (pathname.startsWith("/list")) return true;
  if (pathname.startsWith("/app")) return normalizedRole === "ADMIN";
  return true;
}

export async function updateSession(request: NextRequest) {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing Supabase env. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: "",
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value: "",
            ...options,
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = normalizeLegacyDashboardPath(request.nextUrl.pathname);

  // Protected routes logic
  const isAuthPage =
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/forgot-password");
  const isDashboardPage =
    pathname.startsWith("/app") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/list") ||
    pathname.startsWith("/teacher") ||
    pathname.startsWith("/student") ||
    pathname.startsWith("/parent");

  if (!user && isDashboardPage) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set(
      "redirectTo",
      `${pathname}${request.nextUrl.search}`
    );
    return NextResponse.redirect(loginUrl);
  }

  if (user && isDashboardPage) {
    if (pathname !== request.nextUrl.pathname) {
      return NextResponse.redirect(new URL(pathname, request.url));
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (!canAccessPath(profile?.role, pathname)) {
      return NextResponse.redirect(
        new URL(resolvePostLoginPath(profile?.role, pathname), request.url)
      );
    }
  }

  if (user && pathname !== request.nextUrl.pathname && request.nextUrl.pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL(pathname, request.url));
  }

  if (user && isAuthPage) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile?.role && pathname.startsWith("/register")) {
      return response;
    }

    return NextResponse.redirect(
      new URL(resolvePostLoginPath(profile?.role), request.url)
    );
  }

  return response;
}

import { NextResponse } from "next/server";

import { normalizeRole } from "@/lib/server-auth";
import { safeErrorMessage } from "@/lib/server-guards";
import { supabaseAdmin } from "@/lib/supabase";

const READ_MOSTLY_PRIVATE_CACHE = "private, max-age=30, stale-while-revalidate=120";

function readBearerToken(req: Request) {
  const header = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!header) {
    return null;
  }

  const [scheme, token] = header.split(" ");
  if (!/^Bearer$/i.test(scheme || "") || !token) {
    return "";
  }

  return token.trim();
}

export async function GET(req: Request) {
  try {
    const bearerToken = readBearerToken(req);
    if (bearerToken == null || !bearerToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabaseAdmin.auth.getUser(bearerToken);
    if (error || !data.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(Math.max(Number(searchParams.get("limit") || 30), 1), 60);

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("school_id, role")
      .eq("id", data.user.id)
      .maybeSingle();

    if (profileError) {
      throw profileError;
    }

    const schoolId = profile?.school_id || null;
    if (!schoolId) {
      return NextResponse.json({ error: "No school linked to this account" }, { status: 403 });
    }

    const role =
      normalizeRole(profile?.role) || normalizeRole(data.user.user_metadata?.role) || null;
    const rows = await loadAnnouncements(schoolId, limit);

    return jsonWithPrivateCache({
      data: rows
        .filter((row: any) => isAnnouncementVisibleToRole(row.target_role, role))
        .map((row: any) => ({
          ...row,
          body: row.body || row.content || "",
          content: row.content || row.body || "",
        })),
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Failed to fetch account announcements") },
      { status: 500 }
    );
  }
}

async function loadAnnouncements(schoolId: string, limit: number) {
  const queryAttempts = [
    () =>
      supabaseAdmin
        .from("announcements")
        .select("id, title, body, content, target_role, created_at, published_at")
        .eq("school_id", schoolId)
        .order("published_at", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(limit),
    () =>
      supabaseAdmin
        .from("announcements")
        .select("id, title, body, target_role, created_at, published_at")
        .eq("school_id", schoolId)
        .order("published_at", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(limit),
    () =>
      supabaseAdmin
        .from("announcements")
        .select("id, title, content, target_role, created_at, published_at")
        .eq("school_id", schoolId)
        .order("published_at", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(limit),
    () =>
      supabaseAdmin
        .from("announcements")
        .select("id, title, body, content, created_at, published_at")
        .eq("school_id", schoolId)
        .order("published_at", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(limit),
  ];

  for (const runQuery of queryAttempts) {
    const result = await runQuery();
    if (!result.error) {
      return result.data || [];
    }
  }

  return [];
}

function isAnnouncementVisibleToRole(targetRole: string | null | undefined, role: string | null) {
  const normalizedTargetRole = String(targetRole || "").trim().toUpperCase();
  if (!normalizedTargetRole || normalizedTargetRole === "ALL" || normalizedTargetRole === "GENERAL") {
    return true;
  }

  return normalizedTargetRole === String(role || "").trim().toUpperCase();
}

function jsonWithPrivateCache(payload: unknown) {
  const response = NextResponse.json(payload);
  response.headers.set("Cache-Control", READ_MOSTLY_PRIVATE_CACHE);
  return response;
}

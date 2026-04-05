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
    const upcomingOnly = searchParams.get("upcomingOnly") === "true";

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
    const rows = await loadEvents({ schoolId, limit, upcomingOnly });

    return jsonWithPrivateCache({
      data: rows.filter((row: any) => isEventVisibleToRole(row.target_role, role)),
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Failed to fetch account events") },
      { status: 500 }
    );
  }
}

async function loadEvents({
  schoolId,
  limit,
  upcomingOnly,
}: {
  schoolId: string;
  limit: number;
  upcomingOnly: boolean;
}) {
  const today = new Date().toISOString().slice(0, 10);

  const queryAttempts = [
    () =>
      buildEventsQuery("id, title, description, event_date, start_time, end_time, location, target_role, created_at", schoolId, limit, upcomingOnly, today),
    () =>
      buildEventsQuery("id, title, description, event_date, start_time, end_time, location, created_at", schoolId, limit, upcomingOnly, today),
  ];

  for (const runQuery of queryAttempts) {
    const result = await runQuery();
    if (!result.error) {
      return result.data || [];
    }
  }

  return [];
}

function buildEventsQuery(
  selectClause: string,
  schoolId: string,
  limit: number,
  upcomingOnly: boolean,
  today: string
) {
  let query = supabaseAdmin
    .from("events")
    .select(selectClause)
    .eq("school_id", schoolId)
    .order("event_date", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (upcomingOnly) {
    query = query.gte("event_date", today);
  }

  return query;
}

function isEventVisibleToRole(targetRole: string | null | undefined, role: string | null) {
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

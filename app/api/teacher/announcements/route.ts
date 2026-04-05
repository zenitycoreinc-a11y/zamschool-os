import { NextResponse } from "next/server";

import {
  isVisibleToRole,
  jsonWithPrivateCache,
  READ_MOSTLY_PRIVATE_CACHE,
} from "@/lib/teacher-route-common";
import { requireTeacherContext } from "@/lib/server-auth";
import { safeErrorMessage } from "@/lib/server-guards";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: Request) {
  try {
    const access = await requireTeacherContext(req);
    if (!access.ok) return access.response;
    if (!access.context.schoolId) {
      return NextResponse.json({ error: "No school linked to this account" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(Math.max(Number(searchParams.get("limit") || 30), 1), 60);
    const rows = await loadAnnouncements(access.context.schoolId, limit);

    const response = jsonWithPrivateCache({
      data: rows
        .filter((row: any) => isVisibleToRole(row.target_role, access.context.role))
        .map((row: any) => ({
          ...row,
          body: row.body || row.content || "",
          content: row.content || row.body || "",
        })),
    });
    response.headers.set("Cache-Control", READ_MOSTLY_PRIVATE_CACHE);
    return response;
  } catch (error: unknown) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Failed to fetch teacher announcements") },
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
    if (!result.error) return result.data || [];
  }

  return [];
}

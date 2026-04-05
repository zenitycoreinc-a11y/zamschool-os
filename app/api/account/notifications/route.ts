import { NextResponse } from "next/server";

import { safeErrorMessage } from "@/lib/server-guards";
import { supabaseAdmin } from "@/lib/supabase";

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
    const limit = Math.min(Math.max(Number(searchParams.get("limit") || 50), 1), 100);
    const rows = await loadNotifications(data.user.id, limit);

    return NextResponse.json({
      data: rows.map((row: any) => ({
        ...row,
        message: row.message || row.body || "",
      })),
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Failed to fetch account notifications") },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
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
    const id = searchParams.get("id");
    const body = await req.json().catch(() => ({}));

    if (body?.markAll) {
      const updatedCount = await markAllNotificationsRead(data.user.id);
      return NextResponse.json({ success: true, data: { updatedCount } });
    }

    if (!id) {
      return NextResponse.json({ error: "Notification ID is required" }, { status: 400 });
    }

    const notificationId = id;
    const updated = await markNotificationRead(notificationId, data.user.id);
    if (!updated) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Failed to mark account notification as read") },
      { status: 500 }
    );
  }
}

async function loadNotifications(userId: string, limit: number) {
  const queryAttempts = [
    () =>
      supabaseAdmin
        .from("notifications")
        .select("id, title, message, type, is_read, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit),
    () =>
      supabaseAdmin
        .from("notifications")
        .select("id, title, body, type, is_read, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit),
    () =>
      supabaseAdmin
        .from("notifications")
        .select("id, title, message, type, is_read, created_at")
        .eq("recipient_id", userId)
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

async function markNotificationRead(id: string, userId: string) {
  const mutationAttempts = [
    () =>
      supabaseAdmin
        .from("notifications")
        .update({ is_read: true })
        .eq("id", id)
        .eq("user_id", userId)
        .select("id")
        .maybeSingle(),
    () =>
      supabaseAdmin
        .from("notifications")
        .update({ is_read: true })
        .eq("id", id)
        .eq("recipient_id", userId)
        .select("id")
        .maybeSingle(),
  ];

  for (const runMutation of mutationAttempts) {
    const result = await runMutation();
    if (!result.error) {
      return Boolean(result.data?.id);
    }
  }

  return false;
}

async function markAllNotificationsRead(userId: string) {
  const mutationAttempts = [
    () =>
      supabaseAdmin
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", userId)
        .eq("is_read", false)
        .select("id"),
    () =>
      supabaseAdmin
        .from("notifications")
        .update({ is_read: true })
        .eq("recipient_id", userId)
        .eq("is_read", false)
        .select("id"),
  ];

  for (const runMutation of mutationAttempts) {
    const result = await runMutation();
    if (!result.error) {
      return Array.isArray(result.data) ? result.data.length : 0;
    }
  }

  return 0;
}

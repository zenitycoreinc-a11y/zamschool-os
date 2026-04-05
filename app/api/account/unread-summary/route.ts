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

    const userId = data.user.id;
    const [messagesResult, notifications] = await Promise.all([
      supabaseAdmin
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("recipient_id", userId)
        .eq("is_read", false),
      loadUnreadNotificationCount(userId),
    ]);

    if (messagesResult.error) {
      throw messagesResult.error;
    }

    return NextResponse.json({
      data: {
        notifications,
        messages: messagesResult.count || 0,
      },
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Failed to load unread summary") },
      { status: 500 }
    );
  }
}

async function loadUnreadNotificationCount(userId: string) {
  const queryAttempts = [
    () =>
      supabaseAdmin
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("is_read", false),
    () =>
      supabaseAdmin
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("recipient_id", userId)
        .eq("is_read", false),
  ];

  for (const runQuery of queryAttempts) {
    const result = await runQuery();
    if (!result.error) {
      return result.count || 0;
    }
  }

  return 0;
}

import { NextResponse } from "next/server";
import { z } from "zod";

import {
  assertTeacherMessageRecipientAllowed,
  loadTeacherMessagingAccess,
} from "@/lib/teacher-message-access";
import { requireTeacherContext } from "@/lib/server-auth";
import { safeErrorMessage } from "@/lib/server-guards";
import { supabaseAdmin } from "@/lib/supabase";

const createMessageSchema = z.object({
  recipientId: z.string().min(1),
  subject: z.string().trim().min(1).max(160),
  body: z.string().trim().min(1).max(4_000),
});

const markMessagesReadSchema = z.object({
  ids: z.array(z.string().min(1)).optional(),
  conversationId: z.string().min(1).optional(),
  markAll: z.boolean().optional(),
});

export async function GET(req: Request) {
  try {
    const access = await requireTeacherContext(req);
    if (!access.ok) return access.response;

    const { searchParams } = new URL(req.url);
    const limit = Math.min(Math.max(Number(searchParams.get("limit") || 50), 1), 100);
    const accessData = await loadTeacherMessagingAccess({
      schoolId: access.context.schoolId || "",
      actorProfileId: access.context.userId,
    });

    return NextResponse.json({
      data: await loadMessagesForTeacher(
        access.context.userId,
        access.context.schoolId || "",
        limit,
        accessData.allowedProfileIds
      ),
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Failed to fetch teacher messages") },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const access = await requireTeacherContext(req);
    if (!access.ok) return access.response;
    if (!access.context.schoolId) {
      return NextResponse.json({ error: "No school linked to this account" }, { status: 403 });
    }

    const payload = createMessageSchema.parse(await req.json());
    const accessData = await loadTeacherMessagingAccess({
      schoolId: access.context.schoolId,
      actorProfileId: access.context.userId,
    });
    if (!assertTeacherMessageRecipientAllowed(accessData, payload.recipientId)) {
      return NextResponse.json({ error: "Recipient not authorized for this teacher" }, { status: 403 });
    }

    const recipient = await loadRecipientProfile(access.context.schoolId, payload.recipientId);
    if (!recipient) {
      return NextResponse.json({ error: "Recipient not found" }, { status: 404 });
    }

    const { data: inserted, error } = await supabaseAdmin
      .from("messages")
      .insert({
        sender_id: access.context.userId,
        recipient_id: payload.recipientId,
        subject: payload.subject,
        body: payload.body,
        is_read: false,
        school_id: access.context.schoolId,
      })
      .select("id, sender_id, recipient_id, body, subject, created_at, is_read")
      .single();

    if (error) throw error;

    return NextResponse.json({
      data: serializeMessages([inserted], access.context.userId, new Map([[recipient.id, recipient]]))[0],
    });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", details: error.issues }, { status: 400 });
    }

    return NextResponse.json(
      { error: safeErrorMessage(error, "Failed to send teacher message") },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const access = await requireTeacherContext(req);
    if (!access.ok) return access.response;

    const payload = markMessagesReadSchema.parse(await req.json().catch(() => ({})));
    const updatedCount = await markMessagesAsRead(access.context.userId, payload);

    return NextResponse.json({
      success: true,
      data: { updatedCount },
    });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", details: error.issues }, { status: 400 });
    }

    return NextResponse.json(
      { error: safeErrorMessage(error, "Failed to update teacher messages") },
      { status: 500 }
    );
  }
}

async function loadMessagesForTeacher(
  userId: string,
  schoolId: string,
  limit: number,
  allowedProfileIds: string[]
) {
  const { data: rows, error } = await supabaseAdmin
    .from("messages")
    .select("id, sender_id, recipient_id, body, subject, created_at, is_read, school_id")
    .eq("school_id", schoolId)
    .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;

  const allowedSet = new Set(allowedProfileIds);
  const filteredRows = (rows || []).filter((row: any) => {
    const otherId = row.sender_id === userId ? row.recipient_id : row.sender_id;
    return allowedSet.has(String(otherId || "").trim());
  });

  const participantIds = Array.from(
    new Set(filteredRows.flatMap((row: any) => [row.sender_id, row.recipient_id]).filter(Boolean))
  );
  const profilesById = await loadProfilesByIds(participantIds, schoolId);
  return serializeMessages(filteredRows, userId, profilesById);
}

function serializeMessages(rows: any[], userId: string, profilesById: Map<string, any>) {
  return rows.map((row: any) => {
    const isFromMe = row.sender_id === userId;
    const otherId = isFromMe ? row.recipient_id : row.sender_id;

    return {
      ...row,
      receiver_id: row.recipient_id,
      content: row.body,
      isFromMe,
      other: profilesById.get(otherId || "") || null,
    };
  });
}

async function loadProfilesByIds(ids: string[], schoolId: string) {
  if (ids.length === 0) return new Map<string, any>();

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id, first_name, last_name, email, role, school_id")
    .eq("school_id", schoolId)
    .in("id", ids);

  if (error) throw error;
  return new Map((data || []).map((row: any) => [row.id, row]));
}

async function loadRecipientProfile(schoolId: string, recipientId: string) {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id, first_name, last_name, email, role, school_id")
    .eq("id", recipientId)
    .eq("school_id", schoolId)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

async function markMessagesAsRead(userId: string, payload: z.infer<typeof markMessagesReadSchema>) {
  const targetIds = Array.from(new Set((payload.ids || []).filter(Boolean)));

  let query = supabaseAdmin
    .from("messages")
    .update({ is_read: true })
    .eq("recipient_id", userId)
    .eq("is_read", false);

  if (targetIds.length > 0) {
    query = query.in("id", targetIds);
  } else if (payload.conversationId) {
    query = query.eq("sender_id", payload.conversationId);
  } else if (!payload.markAll) {
    return 0;
  }

  const { data, error } = await query.select("id");
  if (error) throw error;
  return Array.isArray(data) ? data.length : 0;
}

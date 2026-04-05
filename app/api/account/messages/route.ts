import { NextResponse } from "next/server";
import { z } from "zod";

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

type AuthenticatedActor = {
  userId: string;
  schoolId: string;
};

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
    const actor = await authenticateAccountRequest(req);
    if ("response" in actor) return actor.response;

    const { searchParams } = new URL(req.url);
    const limit = Math.min(Math.max(Number(searchParams.get("limit") || 50), 1), 100);

    return NextResponse.json({
      data: await loadMessagesForActor(actor.userId, limit),
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Failed to fetch account messages") },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const actor = await authenticateAccountRequest(req);
    if ("response" in actor) return actor.response;

    const payload = createMessageSchema.parse(await req.json());
    const recipient = await loadRecipientProfile(actor.schoolId, payload.recipientId);
    if (!recipient) {
      return NextResponse.json({ error: "Recipient not found" }, { status: 404 });
    }

    const { data: inserted, error } = await supabaseAdmin
      .from("messages")
      .insert({
        sender_id: actor.userId,
        recipient_id: payload.recipientId,
        subject: payload.subject,
        body: payload.body,
        is_read: false,
      })
      .select("id, sender_id, recipient_id, body, subject, created_at, is_read")
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      data: serializeMessages([inserted], actor.userId, new Map([[recipient.id, recipient]]))[0],
    });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: safeErrorMessage(error, "Failed to send message") },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const actor = await authenticateAccountRequest(req);
    if ("response" in actor) return actor.response;

    const payload = markMessagesReadSchema.parse(await req.json().catch(() => ({})));
    const updatedCount = await markMessagesAsRead(actor.userId, payload);

    return NextResponse.json({
      success: true,
      data: {
        updatedCount,
      },
    });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: safeErrorMessage(error, "Failed to update account messages") },
      { status: 500 }
    );
  }
}

async function authenticateAccountRequest(
  req: Request
): Promise<AuthenticatedActor | { response: NextResponse }> {
  const bearerToken = readBearerToken(req);
  if (bearerToken == null || !bearerToken) {
    return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const { data, error } = await supabaseAdmin.auth.getUser(bearerToken);
  if (error || !data.user) {
    return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("school_id")
    .eq("id", data.user.id)
    .maybeSingle();

  if (profileError) {
    throw profileError;
  }

  const schoolId = String(profile?.school_id || "").trim();
  if (!schoolId) {
    return {
      response: NextResponse.json({ error: "No school linked to this account" }, { status: 403 }),
    };
  }

  return {
    userId: data.user.id,
    schoolId,
  };
}

async function loadMessagesForActor(userId: string, limit: number) {
  const { data: rows, error: messageError } = await supabaseAdmin
    .from("messages")
    .select("id, sender_id, recipient_id, body, subject, created_at, is_read")
    .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (messageError) {
    throw messageError;
  }

  const participantIds = Array.from(
    new Set(
      (rows || [])
        .flatMap((row: any) => [row.sender_id, row.recipient_id])
        .filter(Boolean)
    )
  );
  const profilesById = await loadProfilesByIds(participantIds);

  return serializeMessages(rows || [], userId, profilesById);
}

function serializeMessages(
  rows: any[],
  userId: string,
  profilesById: Map<string, any>
) {
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

async function loadProfilesByIds(ids: string[]) {
  if (ids.length === 0) {
    return new Map<string, any>();
  }

  const { data: profiles, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("id, first_name, last_name, email, role, school_id")
    .in("id", ids);

  if (profileError) {
    throw profileError;
  }

  return new Map((profiles || []).map((row: any) => [row.id, row]));
}

async function loadRecipientProfile(schoolId: string, recipientId: string) {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id, first_name, last_name, email, role, school_id")
    .eq("id", recipientId)
    .eq("school_id", schoolId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data || null;
}

async function markMessagesAsRead(
  userId: string,
  payload: z.infer<typeof markMessagesReadSchema>
) {
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
  if (error) {
    throw error;
  }

  return Array.isArray(data) ? data.length : 0;
}

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { z } from "zod";
import { applyRateLimit, getClientIp, parseJsonWithSchema, safeErrorMessage } from "@/lib/server-guards";
import { requireAdminContext } from "@/lib/server-auth";

const createMessageSchema = z.object({
  recipientId: z.string().min(1),
  subject: z.string().optional(),
  body: z.string().min(1),
});

export async function GET(req: Request) {
  try {
    const access = await requireAdminContext(req);
    if (!access.ok) return access.response;
    const { schoolId } = access.context;
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const unreadOnly = searchParams.get("unreadOnly") === "true";
    const asSender = searchParams.get("asSender") === "true";

    let query = supabaseAdmin
      .from("messages")
      .select(`
        *,
        sender:sender_id(first_name, last_name, email, role),
        recipient:recipient_id(first_name, last_name, email, role)
      `)
      .eq("school_id", schoolId);

    if (userId) {
      if (asSender) {
        query = query.eq("sender_id", userId);
      } else {
        query = query.eq("recipient_id", userId);
      }
    }

    if (unreadOnly) {
      query = query.eq("is_read", false);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    return NextResponse.json({ error: safeErrorMessage(error, "Failed to fetch messages") }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const access = await requireAdminContext(req);
    if (!access.ok) return access.response;
    const { schoolId, userId } = access.context;
    const ip = getClientIp(req);
    const rate = await applyRateLimit({
      key: `admin-messages:${ip}`,
      limit: 50,
      windowMs: 60_000,
    });
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again shortly." },
        { status: 429, headers: { "Retry-After": String(rate.retryAfterSec) } }
      );
    }

    const body = await parseJsonWithSchema(req, createMessageSchema);

    const payload: Record<string, any> = {
      school_id: schoolId,
      sender_id: userId,
      recipient_id: body.recipientId,
      subject: body.subject?.trim() || null,
      body: body.body.trim(),
    };

    const { data, error } = await supabaseAdmin
      .from("messages")
      .insert(payload)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    return NextResponse.json({ error: safeErrorMessage(error, "Failed to send message") }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const access = await requireAdminContext(req);
    if (!access.ok) return access.response;
    const { schoolId } = access.context;
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Message ID is required" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("messages")
      .update({ is_read: true })
      .eq("id", id)
      .eq("school_id", schoolId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: safeErrorMessage(error, "Failed to mark message as read") }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const access = await requireAdminContext(req);
    if (!access.ok) return access.response;
    const { schoolId } = access.context;
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Message ID is required" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("messages")
      .delete()
      .eq("id", id)
      .eq("school_id", schoolId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: safeErrorMessage(error, "Failed to delete message") }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { z } from "zod";
import { applyRateLimit, getClientIp, parseJsonWithSchema, safeErrorMessage } from "@/lib/server-guards";
import { requireAdminContext } from "@/lib/server-auth";
import {
  normalizeAudienceForStorage,
  normalizeTargetRoleForResponse,
  normalizeTargetRoleForStorage,
} from "@/lib/audience-targeting";

const createAnnouncementSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  targetRole: z.string().optional().nullable(),
  targetClassId: z.string().optional().nullable(),
  isPinned: z.boolean().optional().default(false),
  expiresAt: z.string().optional().nullable(),
});

const updateAnnouncementSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).optional(),
  content: z.string().min(1).optional(),
  targetRole: z.string().optional().nullable(),
  targetClassId: z.string().optional().nullable(),
  isPinned: z.boolean().optional(),
  expiresAt: z.string().optional().nullable(),
});

export async function GET(req: Request) {
  try {
    const access = await requireAdminContext(req);
    if (!access.ok) return access.response;
    const { schoolId } = access.context;
    if (!schoolId) {
      return NextResponse.json({ error: "No school linked to this account" }, { status: 403 });
    }
    const { searchParams } = new URL(req.url);
    const targetRole = normalizeTargetRoleForResponse(searchParams.get("targetRole"));
    const targetClassId = searchParams.get("targetClassId");

    const { data, error } = await supabaseAdmin
      .from("announcements")
      .select("*")
      .eq("school_id", schoolId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const normalized = normalizeAnnouncementRows(data || []).filter((row) => {
      if (targetRole && row.target_role !== targetRole) return false;
      if (targetClassId && row.target_class_id !== targetClassId) return false;
      return true;
    });

    normalized.sort((left, right) => {
      if (left.is_pinned === right.is_pinned) return 0;
      return left.is_pinned ? -1 : 1;
    });

    return NextResponse.json({ success: true, data: normalized });
  } catch (error: unknown) {
    return NextResponse.json({ error: safeErrorMessage(error, "Failed to fetch announcements") }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const access = await requireAdminContext(req);
    if (!access.ok) return access.response;
    const { schoolId, userId } = access.context;
    if (!schoolId) {
      return NextResponse.json({ error: "No school linked to this account" }, { status: 403 });
    }
    const ip = getClientIp(req);
    const rate = await applyRateLimit({
      key: `admin-announcements:${ip}`,
      limit: 20,
      windowMs: 60_000,
    });
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again shortly." },
        { status: 429, headers: { "Retry-After": String(rate.retryAfterSec) } }
      );
    }

    const body = await parseJsonWithSchema(req, createAnnouncementSchema);
    const payload = buildAnnouncementPayload({ schoolId, userId, body });
    const data = await safeInsertWithMissingColumnRetry("announcements", payload);

    return NextResponse.json({ success: true, data: normalizeAnnouncementRow(data) });
  } catch (error: unknown) {
    return NextResponse.json({ error: safeErrorMessage(error, "Failed to create announcement") }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const access = await requireAdminContext(req);
    if (!access.ok) return access.response;
    const { schoolId } = access.context;
    if (!schoolId) {
      return NextResponse.json({ error: "No school linked to this account" }, { status: 403 });
    }
    const ip = getClientIp(req);
    const rate = await applyRateLimit({
      key: `admin-announcements:${ip}`,
      limit: 20,
      windowMs: 60_000,
    });
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again shortly." },
        { status: 429, headers: { "Retry-After": String(rate.retryAfterSec) } }
      );
    }

    const body = await parseJsonWithSchema(req, updateAnnouncementSchema);
    const payload = buildAnnouncementPayload({ schoolId, userId: null, body, includeRequired: false });
    const data = await safeUpdateWithMissingColumnRetry("announcements", body.id, schoolId, payload);

    return NextResponse.json({ success: true, data: normalizeAnnouncementRow(data) });
  } catch (error: unknown) {
    return NextResponse.json({ error: safeErrorMessage(error, "Failed to update announcement") }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const access = await requireAdminContext(req);
    if (!access.ok) return access.response;
    const { schoolId } = access.context;
    if (!schoolId) {
      return NextResponse.json({ error: "No school linked to this account" }, { status: 403 });
    }
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Announcement ID is required" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("announcements")
      .delete()
      .eq("id", id)
      .eq("school_id", schoolId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: safeErrorMessage(error, "Failed to delete announcement") }, { status: 500 });
  }
}

function buildAnnouncementPayload(input: {
  schoolId: string;
  userId: string | null;
  body: z.infer<typeof createAnnouncementSchema> | z.infer<typeof updateAnnouncementSchema>;
  includeRequired?: boolean;
}) {
  const includeRequired = input.includeRequired !== false;
  return compactRecord({
    ...(includeRequired ? { school_id: input.schoolId } : {}),
    title: "title" in input.body && input.body.title !== undefined ? input.body.title.trim() : undefined,
    content: "content" in input.body && input.body.content !== undefined ? input.body.content.trim() : undefined,
    target_role:
      "targetRole" in input.body
        ? normalizeTargetRoleForStorage(input.body.targetRole)
        : undefined,
    target_class_id: "targetClassId" in input.body ? input.body.targetClassId || null : undefined,
    created_by: includeRequired ? input.userId : undefined,
    is_pinned: "isPinned" in input.body ? Boolean(input.body.isPinned) : undefined,
    expires_at: "expiresAt" in input.body ? input.body.expiresAt || null : undefined,
    audience:
      "targetRole" in input.body
        ? normalizeAudienceForStorage(input.body.targetRole)
        : undefined,
  });
}

function normalizeAnnouncementRows(rows: any[]) {
  return rows.map(normalizeAnnouncementRow);
}

function normalizeAnnouncementRow(row: any) {
  return {
    ...row,
    target_role: normalizeTargetRoleForResponse(row?.target_role ?? row?.audience),
    target_class_id: row?.target_class_id ?? null,
    is_pinned: row?.is_pinned === true,
    expires_at: row?.expires_at ?? null,
  };
}

function extractMissingColumn(message?: string) {
  if (!message) return null;
  const match = message.match(/column ([^.]+\.)?([a-zA-Z0-9_]+) does not exist/i);
  if (match?.[2]) return match[2];
  const missing = message.match(/Could not find the '([^']+)' column/i);
  return missing?.[1] || null;
}

async function safeInsertWithMissingColumnRetry(table: string, payload: Record<string, any>) {
  let working = { ...payload };
  for (let index = 0; index < 10; index += 1) {
    const result = await supabaseAdmin.from(table).insert(working).select().single();
    if (!result.error) return result.data;

    const missingColumn = extractMissingColumn(result.error.message);
    if (!missingColumn || !(missingColumn in working)) throw result.error;
    delete working[missingColumn];
  }

  throw new Error(`Failed to insert ${table}`);
}

async function safeUpdateWithMissingColumnRetry(table: string, id: string, schoolId: string, payload: Record<string, any>) {
  let working = { ...payload };
  for (let index = 0; index < 10; index += 1) {
    const result = await supabaseAdmin
      .from(table)
      .update(working)
      .eq("id", id)
      .eq("school_id", schoolId)
      .select()
      .single();

    if (!result.error) return result.data;

    const missingColumn = extractMissingColumn(result.error.message);
    if (!missingColumn || !(missingColumn in working)) throw result.error;
    delete working[missingColumn];
  }

  throw new Error(`Failed to update ${table}`);
}

function compactRecord(record: Record<string, any>) {
  return Object.fromEntries(
    Object.entries(record).filter(([, value]) => value !== undefined)
  );
}

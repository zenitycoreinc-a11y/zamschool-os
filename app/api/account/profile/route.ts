import { NextResponse } from "next/server";
import { z } from "zod";

import { loadTeacherAccountDetail } from "@/lib/teacher-account-detail";
import { parseJsonWithSchema, safeErrorMessage } from "@/lib/server-guards";
import { requireActorContext } from "@/lib/server-auth";
import { supabaseAdmin } from "@/lib/supabase";

const updateProfileSchema = z.object({
  first_name: z.string().trim().max(120).optional().nullable(),
  last_name: z.string().trim().max(120).optional().nullable(),
  email: z.string().trim().email().optional().nullable(),
  phone: z.string().trim().max(40).optional().nullable(),
  address: z.string().trim().max(300).optional().nullable(),
  avatar_url: z.string().trim().url().optional().nullable().or(z.literal("")),
});

export async function GET(req: Request) {
  try {
    const access = await requireActorContext(
      {
        allowedRoles: ["ADMIN", "TEACHER", "STUDENT", "PARENT"],
        requireSchool: true,
      },
      req
    );
    if (!access.ok) return access.response;
    if (!access.context.schoolId) {
      return NextResponse.json({ error: "No school linked to this account" }, { status: 403 });
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", access.context.userId)
      .eq("school_id", access.context.schoolId)
      .maybeSingle();

    if (profileError) {
      throw profileError;
    }

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const normalizedRole = String(profile.role || access.context.role || "").trim().toUpperCase();
    const roleLower = normalizedRole.toLowerCase();
    const teacher =
      normalizedRole === "TEACHER"
        ? await loadTeacherAccountDetail({
            schoolId: access.context.schoolId,
            profileId: access.context.userId,
            baseProfile: {
              profileId: profile.id,
              role: roleLower,
              displayName: buildDisplayName(profile),
              email: profile.email || null,
              avatarUrl: profile.avatar_url || profile.photo_url || null,
              status: profile.is_active === false ? "INACTIVE" : "ACTIVE",
              updatedAt: profile.updated_at || profile.created_at || null,
            },
          })
        : null;

    return NextResponse.json({
      success: true,
      data: {
        profile: {
          first_name: profile.first_name || "",
          last_name: profile.last_name || "",
          email: profile.email || "",
          phone: profile.phone || "",
          address: profile.address || "",
          avatar_url: profile.avatar_url || "",
          role: normalizedRole || access.context.role,
          status: profile.is_active === false ? "INACTIVE" : "ACTIVE",
        },
        firstLogin: {
          mustChangePassword: profile.must_change_password === true,
          temporaryPasswordIssuedAt: profile.temporary_password_issued_at || null,
        },
        teacher: teacher,
      },
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Failed to load profile") },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const access = await requireActorContext(
      {
        allowedRoles: ["ADMIN", "TEACHER", "STUDENT", "PARENT"],
        requireSchool: true,
      },
      req
    );
    if (!access.ok) return access.response;
    if (!access.context.schoolId) {
      return NextResponse.json({ error: "No school linked to this account" }, { status: 403 });
    }

    const body = await parseJsonWithSchema(req, updateProfileSchema);
    const payload = compactRecord({
      first_name: normalizeOptionalString(body.first_name),
      last_name: normalizeOptionalString(body.last_name),
      email: normalizeOptionalString(body.email)?.toLowerCase() || null,
      phone: normalizeOptionalString(body.phone),
      address: normalizeOptionalString(body.address),
      avatar_url: normalizeOptionalString(body.avatar_url),
    });

    await updateOwnProfile(access.context.userId, access.context.schoolId, payload);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Failed to update profile") },
      { status: 500 }
    );
  }
}

async function updateOwnProfile(
  userId: string,
  schoolId: string,
  payload: Record<string, string | null>
) {
  let working = { ...payload };

  for (let index = 0; index < 10; index += 1) {
    const { error } = await supabaseAdmin
      .from("profiles")
      .update(working)
      .eq("id", userId)
      .eq("school_id", schoolId);

    if (!error) {
      return;
    }

    const unknown = extractMissingColumn(error.message);
    if (!unknown || !(unknown in working)) {
      throw error;
    }

    delete working[unknown];
  }

  throw new Error("Failed to update profile");
}

function compactRecord(record: Record<string, string | null>) {
  return Object.fromEntries(
    Object.entries(record).filter(([, value]) => value !== undefined)
  );
}

function normalizeOptionalString(value: string | null | undefined) {
  const trimmed = String(value || "").trim();
  return trimmed ? trimmed : null;
}

function extractMissingColumn(message?: string) {
  if (!message) return null;
  const match = message.match(/Could not find the '([^']+)' column/i);
  return match?.[1] || null;
}

function buildDisplayName(row: any) {
  return (
    [row?.first_name, row?.last_name].filter(Boolean).join(" ").trim() ||
    row?.name ||
    row?.email ||
    "User"
  );
}

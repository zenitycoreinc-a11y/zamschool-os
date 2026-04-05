import { NextResponse } from "next/server";
import { z } from "zod";

import { parseJsonWithSchema, safeErrorMessage } from "@/lib/server-guards";
import { requireActorContext } from "@/lib/server-auth";
import { supabaseAdmin } from "@/lib/supabase";

const uploadAvatarSchema = z.object({
  base64: z.string().min(1),
  mimeType: z.string().min(1).default("image/jpeg"),
});

const AVATAR_BUCKET = "profile-avatars";
const MAX_AVATAR_BYTES = 3 * 1024 * 1024;

export async function POST(req: Request) {
  try {
    const access = await requireActorContext(
      {
        allowedRoles: ["ADMIN", "TEACHER", "STUDENT", "PARENT"],
        requireSchool: true,
      },
      req
    );
    if (!access.ok) return access.response;

    const body = await parseJsonWithSchema(req, uploadAvatarSchema);
    const mimeType = body.mimeType.startsWith("image/") ? body.mimeType : "image/jpeg";
    const bytes = Buffer.from(stripDataUrlPrefix(body.base64), "base64");

    if (!bytes.length) {
      return NextResponse.json({ error: "Avatar image is empty" }, { status: 400 });
    }

    if (bytes.length > MAX_AVATAR_BYTES) {
      return NextResponse.json(
        { error: "Avatar image is too large. Use an image under 3MB." },
        { status: 400 }
      );
    }

    const objectPath = `${access.context.userId}/avatar.${extensionForMimeType(mimeType)}`;
    await uploadAvatarObject(objectPath, bytes, mimeType);

    const { data: publicUrlData } = supabaseAdmin.storage
      .from(AVATAR_BUCKET)
      .getPublicUrl(objectPath);
    const avatarUrl = `${publicUrlData.publicUrl}?updated=${Date.now()}`;

    await persistAvatarUrl(access.context.userId, avatarUrl);

    return NextResponse.json({
      success: true,
      data: {
        avatarUrl,
      },
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Failed to upload avatar") },
      { status: 500 }
    );
  }
}

async function uploadAvatarObject(
  objectPath: string,
  bytes: Buffer,
  mimeType: string
) {
  const firstAttempt = await supabaseAdmin.storage.from(AVATAR_BUCKET).upload(objectPath, bytes, {
    contentType: mimeType,
    upsert: true,
  });

  if (!firstAttempt.error) {
    return;
  }

  if (!String(firstAttempt.error.message || "").toLowerCase().includes("bucket")) {
    throw firstAttempt.error;
  }

  const { error: bucketError } = await supabaseAdmin.storage.createBucket(AVATAR_BUCKET, {
    public: true,
    fileSizeLimit: `${MAX_AVATAR_BYTES}`,
  });

  if (bucketError && !String(bucketError.message || "").toLowerCase().includes("exists")) {
    throw bucketError;
  }

  const retry = await supabaseAdmin.storage.from(AVATAR_BUCKET).upload(objectPath, bytes, {
    contentType: mimeType,
    upsert: true,
  });

  if (retry.error) throw retry.error;
}

async function persistAvatarUrl(userId: string, avatarUrl: string) {
  const legacy = await supabaseAdmin
    .from("profiles")
    .update({ avatar_url: avatarUrl })
    .eq("id", userId)
    .select("id")
    .maybeSingle();

  if (!legacy.error) {
    return;
  }

  if (!isMissingColumnError(legacy.error)) {
    throw legacy.error;
  }

  const latest = await supabaseAdmin
    .from("profiles")
    .update({ photo_url: avatarUrl })
    .eq("id", userId)
    .select("id")
    .maybeSingle();

  if (latest.error) throw latest.error;
}

function stripDataUrlPrefix(value: string) {
  return String(value || "").replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, "");
}

function extensionForMimeType(mimeType: string) {
  if (mimeType.includes("png")) return "png";
  if (mimeType.includes("webp")) return "webp";
  return "jpg";
}

function isMissingColumnError(error: { code?: string; message?: string } | null | undefined) {
  const message = String(error?.message || "");
  return error?.code === "42703" || message.includes("does not exist");
}

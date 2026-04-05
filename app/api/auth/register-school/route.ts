import { supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import { applyRateLimit, getClientIp, parseJsonWithSchema, safeErrorMessage } from "@/lib/server-guards";
import { requireAdminSetupContext } from "@/lib/server-auth";

const registerSchoolSchema = z.object({
  email: z.string().email(),
  schoolName: z.string().min(2).max(120),
  schoolCode: z.string().min(4).max(50),
  adminName: z.string().min(2).max(120),
  phone: z.string().min(1).max(40),
  address: z.string().min(1).max(300),
  logoUrl: z.string().url().optional().or(z.literal("")),
  emisCode: z.string().min(1).max(60),
  province: z.string().min(1).max(120),
  district: z.string().min(1).max(120),
  schoolType: z.string().min(1).max(120),
  ownershipType: z.string().min(1).max(120),
});

export async function POST(req: Request) {
  try {
    const access = await requireAdminSetupContext(req);
    if (!access.ok) return access.response;
    const { userId } = access.context;
    const ip = getClientIp(req);
    const rate = await applyRateLimit({
      key: `register-school:${ip}`,
      limit: 10,
      windowMs: 60_000,
    });
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again shortly." },
        {
          status: 429,
          headers: { "Retry-After": String(rate.retryAfterSec) },
        }
      );
    }

    const { email, schoolName, schoolCode, adminName, phone, address, logoUrl, emisCode, province, district, schoolType, ownershipType } = await parseJsonWithSchema(
      req,
      registerSchoolSchema
    );

    if (!email || !schoolName || !schoolCode || !adminName || !phone || !address || !emisCode || !province || !district || !schoolType || !ownershipType) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const normalizedCode = String(schoolCode || "")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 12);

    if (normalizedCode.length < 4) {
      return NextResponse.json({ error: "Invalid school code" }, { status: 400 });
    }

    // 1. Ensure code is unique, fallback only if needed
    let finalCode = normalizedCode;
    const { data: existing } = await supabaseAdmin
      .from("schools")
      .select("id")
      .eq("code", finalCode)
      .maybeSingle();

    if (existing) {
      finalCode = `${normalizedCode.slice(0, 8)}${nanoid(4).toUpperCase()}`;
    }

    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("id, school_id")
      .eq("id", userId)
      .maybeSingle();

    if (existingProfile?.school_id) {
      return NextResponse.json({ error: "This admin already belongs to a school" }, { status: 409 });
    }

    // 2. Create the school
    const { data: school, error: schoolError } = await supabaseAdmin
      .from("schools")
      .insert({
        name: schoolName,
        code: finalCode,
        phone,
        email,
        address,
        logo_url: logoUrl || null,
        emis_code: emisCode,
        province,
        district,
        school_type: schoolType,
        ownership_type: ownershipType,
      })
      .select()
      .single();

    if (schoolError) throw schoolError;

    await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: {
        school_id: school.id,
        role: "admin",
        admin_name: adminName,
      },
    });

    // 3. Create the admin profile
    // We use id: resolvedUserId which works in both old and new schema versions
    // as id is always the primary key. We don't set auth_user_id here
    // to avoid errors if the column hasn't been added yet.
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .upsert({
        id: userId,
        school_id: school.id,
        role: "admin",
        first_name: adminName.split(" ").slice(0, -1).join(" ") || adminName,
        last_name: adminName.split(" ").slice(-1).join(" ") || "",
        email: email,
        phone,
      }, { onConflict: "id" });

    if (profileError) {
      console.error("Profile creation error details:", JSON.stringify(profileError, null, 2));
      // Rollback school creation if profile fails
      await supabaseAdmin.from("schools").delete().eq("id", school.id);
      throw new Error(profileError.message || "Failed to create admin profile");
    }

    return NextResponse.json({ success: true, schoolCode: finalCode });
  } catch (error: unknown) {
    console.error("Registration API error:", safeErrorMessage(error, "Unknown registration error"));
    return NextResponse.json({ 
      error: safeErrorMessage(error, "An unexpected error occurred during registration")
    }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { safeErrorMessage } from "@/lib/server-guards";
import { requireAdminContext } from "@/lib/server-auth";

export async function GET(req: Request) {
  try {
    const access = await requireAdminContext(req);
    if (!access.ok) return access.response;
    const { schoolId } = access.context;
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const action = searchParams.get("action");
    const entityType = searchParams.get("entityType");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const limit = parseInt(searchParams.get("limit") || "100", 10);

    let query = supabaseAdmin
      .from("audit_logs")
      .select(`
        *,
        profiles:user_id(first_name, last_name, email, role)
      `)
      .eq("school_id", schoolId);

    if (userId) {
      query = query.eq("user_id", userId);
    }

    if (action) {
      query = query.eq("action", action);
    }

    if (entityType) {
      query = query.eq("entity_type", entityType);
    }

    if (startDate) {
      query = query.gte("created_at", startDate);
    }

    if (endDate) {
      query = query.lte("created_at", endDate);
    }

    const { data, error } = await query
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    return NextResponse.json({ error: safeErrorMessage(error, "Failed to fetch audit logs") }, { status: 500 });
  }
}

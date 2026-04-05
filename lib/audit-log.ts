import { supabaseAdmin } from "@/lib/supabase";

export async function createAuditLog(params: {
  schoolId: string;
  userId: string;
  action: string;
  entityType: string;
  entityId?: string;
  oldData?: Record<string, any>;
  newData?: Record<string, any>;
  ipAddress?: string;
}) {
  try {
    const { error } = await supabaseAdmin.from("audit_logs").insert({
      school_id: params.schoolId,
      user_id: params.userId,
      action: params.action,
      entity_type: params.entityType,
      entity_id: params.entityId || null,
      old_data: params.oldData || null,
      new_data: params.newData || null,
      ip_address: params.ipAddress || null,
    });

    if (error) {
      console.error("Failed to create audit log:", error);
    }
  } catch (err) {
    console.error("Failed to create audit log:", err);
  }
}

import { buildAcademicContextLabel } from "@/lib/live-schema-adapters";
import { supabase } from "@/lib/supabase";

type DashboardScope = {
  schoolId: string;
  academicLabel: string;
};

export async function loadDashboardScope(): Promise<DashboardScope | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("school_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    throw profileError;
  }

  const schoolId = typeof profile?.school_id === "string" ? profile.school_id : "";
  if (!schoolId) {
    return null;
  }

  const [yearResult, termResult] = await Promise.all([
    supabase
      .from("academic_years")
      .select("name")
      .eq("school_id", schoolId)
      .eq("is_active", true)
      .maybeSingle(),
    supabase
      .from("terms")
      .select("name")
      .eq("school_id", schoolId)
      .eq("is_active", true)
      .maybeSingle(),
  ]);

  const yearName = yearResult.error ? null : yearResult.data?.name;
  const termName = termResult.error ? null : termResult.data?.name;

  return {
    schoolId,
    academicLabel: buildAcademicContextLabel(yearName, termName),
  };
}

export function getRoleVariants(role: string) {
  const normalized = String(role || "").trim();
  if (!normalized) {
    return [];
  }

  return Array.from(new Set([normalized.toLowerCase(), normalized.toUpperCase()]));
}

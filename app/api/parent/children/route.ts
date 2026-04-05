import { NextResponse } from "next/server";

import { buildParentLinkedStudentProfiles } from "@/lib/live-schema-adapters";
import { requireParentContext } from "@/lib/server-auth";
import { safeErrorMessage } from "@/lib/server-guards";
import { supabaseAdmin } from "@/lib/supabase";

const READ_MOSTLY_PRIVATE_CACHE = "private, max-age=30, stale-while-revalidate=120";

export async function GET(req: Request) {
  try {
    const access = await requireParentContext(req);
    if (!access.ok) return access.response;
    const { userId, schoolId } = access.context;

    const parentRecord = await getParentRecord({
      profileId: userId,
      schoolId,
    });

    if (!parentRecord) {
      return jsonWithPrivateCache({ success: true, data: [] });
    }

    const linked = await getLinkedStudents({
      parentRecordId: parentRecord.id,
      parentProfileId: userId,
      schoolId,
      fallbackRelationship: parentRecord.relation_type || null,
    });

    if (linked.profileIds.length === 0) {
      return jsonWithPrivateCache({ success: true, data: [] });
    }

    const { data: studentRows, error: studentError } = await supabaseAdmin
      .from("profiles")
      .select("id, school_id, first_name, last_name, email")
      .eq("school_id", schoolId)
      .in("id", linked.profileIds)
      .order("first_name", { ascending: true });

    if (studentError) throw studentError;

    const classIds = Array.from(
      new Set(
        linked.profileIds
          .map((profileId) => linked.classIdByProfileId.get(profileId))
          .filter(Boolean)
      )
    ) as string[];

    const classesById = await getClassesById(schoolId, classIds);
    const data = (studentRows || []).map((row: any) => {
      const classId = linked.classIdByProfileId.get(row.id) || null;
      return {
        id: row.id,
        displayName: buildDisplayName(row),
        admissionNumber: linked.studentNumberByProfileId.get(row.id) || null,
        classId,
        className: buildClassLabel(classesById.get(classId || "")),
        relationship:
          linked.relationshipByProfileId.get(row.id) || parentRecord.relation_type || null,
        email: row.email || null,
      };
    });

    return jsonWithPrivateCache({ success: true, data });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Failed to load parent children") },
      { status: 500 }
    );
  }
}

function jsonWithPrivateCache(payload: unknown) {
  const response = NextResponse.json(payload);
  response.headers.set("Cache-Control", READ_MOSTLY_PRIVATE_CACHE);
  return response;
}

async function getLinkedStudents(input: {
  parentRecordId: string;
  parentProfileId: string;
  schoolId: string | null;
  fallbackRelationship: string | null;
}) {
  const [{ data: parentRows, error: parentError }, { data: links, error: linkError }] =
    await Promise.all([
      supabaseAdmin
        .from("parents")
        .select("id, profile_id")
        .eq("school_id", input.schoolId)
        .in("id", [input.parentRecordId]),
      supabaseAdmin
        .from("parent_students")
        .select("parent_id, student_id, relationship")
        .in("parent_id", [input.parentRecordId, input.parentProfileId]),
    ]);

  if (parentError) throw parentError;
  if (linkError) throw linkError;

  const studentIds = Array.from(
    new Set((links || []).map((row: any) => row.student_id).filter(Boolean))
  );

  let students: any[] = [];
  if (studentIds.length > 0) {
    const { data, error } = await supabaseAdmin
      .from("students")
      .select("id, profile_id, school_id, class_id, student_number")
      .eq("school_id", input.schoolId)
      .in("id", studentIds);

    if (error) throw error;
    students = data || [];
  }

  const mapped = buildParentLinkedStudentProfiles({
    actorProfileId: input.parentProfileId,
    actorSchoolId: input.schoolId,
    parents: parentRows || [],
    students,
    links: links || [],
  });

  if (mapped.profileIds.length > 0) {
    const classIdByProfileId = new Map<string, string | null>();
    const studentNumberByProfileId = new Map<string, string | null>();

    for (const student of students) {
      const profileId = student.profile_id || student.id;
      if (!mapped.relationshipByProfileId.has(profileId)) continue;
      classIdByProfileId.set(profileId, student.class_id || null);
      studentNumberByProfileId.set(profileId, student.student_number || null);
    }

    return {
      profileIds: mapped.profileIds,
      relationshipByProfileId: mapped.relationshipByProfileId,
      classIdByProfileId,
      studentNumberByProfileId,
    };
  }

  const { data: legacyStudents, error: legacyError } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("school_id", input.schoolId)
    .eq("parent_id", input.parentProfileId);

  if (legacyError) throw legacyError;

  const relationshipByProfileId = new Map<string, string | null>();
  const classIdByProfileId = new Map<string, string | null>();
  const studentNumberByProfileId = new Map<string, string | null>();

  const profileIds = (legacyStudents || []).map((row: any) => row.id);
  for (const profileId of profileIds) {
    relationshipByProfileId.set(profileId, input.fallbackRelationship);
    classIdByProfileId.set(profileId, null);
    studentNumberByProfileId.set(profileId, null);
  }

  return {
    profileIds,
    relationshipByProfileId,
    classIdByProfileId,
    studentNumberByProfileId,
  };
}

async function getParentRecord(input: {
  profileId: string;
  schoolId: string | null;
}) {
  const { data, error } = await supabaseAdmin
    .from("parents")
    .select("id, relation_type")
    .eq("profile_id", input.profileId)
    .eq("school_id", input.schoolId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function getClassesById(schoolId: string | null, classIds: string[]) {
  if (!schoolId || classIds.length === 0) {
    return new Map<string, any>();
  }

  const legacy = await supabaseAdmin
    .from("classes")
    .select("id, name, grade_level")
    .eq("school_id", schoolId)
    .in("id", classIds);

  if (!legacy.error) {
    return new Map((legacy.data || []).map((row: any) => [row.id, row]));
  }

  const modern = await supabaseAdmin
    .from("classes")
    .select("id, name, grades(name, level)")
    .eq("school_id", schoolId)
    .in("id", classIds);

  if (modern.error) throw modern.error;

  return new Map((modern.data || []).map((row: any) => [row.id, row]));
}

function buildClassLabel(classRow: any) {
  if (!classRow) return "Unassigned class";

  const gradeName =
    typeof classRow?.grades?.name === "string"
      ? classRow.grades.name.trim()
      : buildGradeLevelLabel(classRow?.grade_level);
  const className = typeof classRow?.name === "string" ? classRow.name.trim() : "";

  return [gradeName, className].filter(Boolean).join(" - ") || className || "Class";
}

function buildGradeLevelLabel(value: string | number | null | undefined) {
  const level = String(value || "").trim();
  return level ? `Grade ${level}` : "";
}

function buildDisplayName(row: {
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
}) {
  return (
    [row.first_name, row.last_name].filter(Boolean).join(" ").trim() ||
    row.email ||
    "Student"
  );
}

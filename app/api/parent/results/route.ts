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
    const { searchParams } = new URL(req.url);
    const selectedStudentId = searchParams.get("studentId");

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
    });

    if (linked.profileIds.length === 0) {
      return jsonWithPrivateCache({ success: true, data: [] });
    }

    if (selectedStudentId && !linked.profileIds.includes(selectedStudentId)) {
      return NextResponse.json(
        { error: "Requested child is not linked to this parent account" },
        { status: 403 }
      );
    }

    const scopedProfileIds = selectedStudentId ? [selectedStudentId] : linked.profileIds;
    const scopedStudentRowIds = scopedProfileIds
      .map((profileId) => linked.studentRowIdByProfileId.get(profileId))
      .filter(Boolean) as string[];

    if (scopedStudentRowIds.length === 0) {
      return jsonWithPrivateCache({ success: true, data: [] });
    }

    const { data: resultRows, error: resultError } = await supabaseAdmin
      .from("results")
      .select("id, student_id, assignment_id, exam_id, score, grade, remarks, created_at, published_at, published_by")
      .eq("school_id", schoolId)
      .in("student_id", scopedStudentRowIds)
      .not("published_at", "is", null)
      .order("published_at", { ascending: false })
      .order("created_at", { ascending: false });

    if (resultError) throw resultError;

    const assignmentIds = Array.from(new Set((resultRows || []).map((row: any) => row.assignment_id).filter(Boolean)));
    const studentRows = await getStudentsByIds(schoolId, scopedStudentRowIds);
    const assignmentsById = await getAssignmentsByIds(schoolId, assignmentIds);
    const classIds = Array.from(new Set(Array.from(assignmentsById.values()).map((row: any) => row.class_id).filter(Boolean)));
    const subjectIds = Array.from(new Set(Array.from(assignmentsById.values()).map((row: any) => row.subject_id).filter(Boolean)));
    const classById = await getClassesById(schoolId, classIds);
    const subjectById = await getSubjectsById(schoolId, subjectIds);

    const data = (resultRows || []).map((row: any) => {
      const student = studentRows.get(row.student_id);
      const assignment = assignmentsById.get(row.assignment_id);
      return {
        id: row.id,
        studentId: student?.profile_id || row.student_id,
        studentName: buildDisplayName(student?.profile),
        assignmentId: row.assignment_id,
        assignmentTitle: assignment?.title || "Result",
        className: classById.get(assignment?.class_id || "")?.name || "Class",
        subjectName: subjectById.get(assignment?.subject_id || "")?.name || "Subject",
        score: row.score == null ? null : Number(row.score),
        grade: row.grade || null,
        remarks: row.remarks || null,
        createdAt: row.created_at,
        publishedAt: row.published_at,
      };
    });

    return jsonWithPrivateCache({ success: true, data });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Failed to load parent results") },
      { status: 500 }
    );
  }
}

function jsonWithPrivateCache(payload: unknown) {
  const response = NextResponse.json(payload);
  response.headers.set("Cache-Control", READ_MOSTLY_PRIVATE_CACHE);
  return response;
}

async function getParentRecord(input: {
  profileId: string;
  schoolId: string | null;
}) {
  const { data, error } = await supabaseAdmin
    .from("parents")
    .select("id")
    .eq("profile_id", input.profileId)
    .eq("school_id", input.schoolId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function getLinkedStudents(input: {
  parentRecordId: string;
  parentProfileId: string;
  schoolId: string | null;
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

  const studentIds = Array.from(new Set((links || []).map((row: any) => row.student_id).filter(Boolean)));
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

  return buildParentLinkedStudentProfiles({
    actorProfileId: input.parentProfileId,
    actorSchoolId: input.schoolId,
    parents: parentRows || [],
    students,
    links: links || [],
  });
}

async function getStudentsByIds(schoolId: string | null, studentIds: string[]) {
  if (!schoolId || studentIds.length === 0) return new Map<string, any>();

  const { data, error } = await supabaseAdmin
    .from("students")
    .select("id, profile_id")
    .eq("school_id", schoolId)
    .in("id", studentIds);

  if (error) throw error;

  const profileIds = Array.from(new Set((data || []).map((row: any) => row.profile_id).filter(Boolean)));
  const { data: profiles, error: profileError } = profileIds.length > 0
    ? await supabaseAdmin.from("profiles").select("id, first_name, last_name, email").in("id", profileIds)
    : { data: [], error: null };

  if (profileError) throw profileError;

  const profileById = new Map((profiles || []).map((row: any) => [row.id, row]));
  return new Map(
    (data || []).map((row: any) => [
      row.id,
      {
        ...row,
        profile: profileById.get(row.profile_id || "") || null,
      },
    ])
  );
}

async function getAssignmentsByIds(schoolId: string | null, assignmentIds: string[]) {
  if (!schoolId || assignmentIds.length === 0) return new Map<string, any>();

  const { data, error } = await supabaseAdmin
    .from("assignments")
    .select("id, title, class_id, subject_id")
    .eq("school_id", schoolId)
    .in("id", assignmentIds);

  if (error) throw error;
  return new Map((data || []).map((row: any) => [row.id, row]));
}

async function getClassesById(schoolId: string | null, classIds: string[]) {
  if (!schoolId || classIds.length === 0) return new Map<string, any>();

  const { data, error } = await supabaseAdmin
    .from("classes")
    .select("id, name")
    .eq("school_id", schoolId)
    .in("id", classIds);

  if (error) throw error;
  return new Map((data || []).map((row: any) => [row.id, row]));
}

async function getSubjectsById(schoolId: string | null, subjectIds: string[]) {
  if (!schoolId || subjectIds.length === 0) return new Map<string, any>();

  const { data, error } = await supabaseAdmin
    .from("subjects")
    .select("id, name")
    .eq("school_id", schoolId)
    .in("id", subjectIds);

  if (error) throw error;
  return new Map((data || []).map((row: any) => [row.id, row]));
}

function buildDisplayName(
  row:
    | {
        first_name?: string | null;
        last_name?: string | null;
        email?: string | null;
      }
    | null
    | undefined
) {
  return (
    [row?.first_name, row?.last_name].filter(Boolean).join(" ").trim() ||
    row?.email ||
    "Student"
  );
}

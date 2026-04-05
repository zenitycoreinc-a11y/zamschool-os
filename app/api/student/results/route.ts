import { NextResponse } from "next/server";

import { requireStudentContext } from "@/lib/server-auth";
import { safeErrorMessage } from "@/lib/server-guards";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: Request) {
  try {
    const access = await requireStudentContext(req);
    if (!access.ok) return access.response;
    const { userId, schoolId } = access.context;

    const studentRecord = await getStudentRecord(userId, schoolId);
    if (!studentRecord) {
      return NextResponse.json({ success: true, data: [] });
    }

    const { data: resultRows, error: resultError } = await supabaseAdmin
      .from("results")
      .select("id, student_id, assignment_id, exam_id, score, grade, remarks, created_at, published_at, published_by")
      .eq("school_id", schoolId)
      .eq("student_id", studentRecord.id)
      .not("published_at", "is", null)
      .order("published_at", { ascending: false })
      .order("created_at", { ascending: false });

    if (resultError) throw resultError;

    const assignmentIds = Array.from(new Set((resultRows || []).map((row: any) => row.assignment_id).filter(Boolean)));
    const assignmentsById = await getAssignmentsByIds(schoolId, assignmentIds);
    const classIds = Array.from(new Set(Array.from(assignmentsById.values()).map((row: any) => row.class_id).filter(Boolean)));
    const subjectIds = Array.from(new Set(Array.from(assignmentsById.values()).map((row: any) => row.subject_id).filter(Boolean)));
    const classById = await getClassesById(schoolId, classIds);
    const subjectById = await getSubjectsById(schoolId, subjectIds);

    const data = (resultRows || []).map((row: any) => {
      const assignment = assignmentsById.get(row.assignment_id);
      return {
        id: row.id,
        student_id: userId,
        assignment_id: row.assignment_id,
        exam_id: row.exam_id,
        score: row.score == null ? null : Number(row.score),
        grade: row.grade || null,
        remarks: row.remarks || null,
        created_at: row.created_at,
        published_at: row.published_at,
        published_by: row.published_by,
        assignmentTitle: assignment?.title || "Result",
        className: classById.get(assignment?.class_id || "")?.name || "Class",
        subjectName: subjectById.get(assignment?.subject_id || "")?.name || "Subject",
      };
    });

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Failed to load student results") },
      { status: 500 }
    );
  }
}

async function getStudentRecord(profileId: string, schoolId: string | null) {
  const { data, error } = await supabaseAdmin
    .from("students")
    .select("id, profile_id")
    .eq("school_id", schoolId)
    .eq("profile_id", profileId)
    .maybeSingle();

  if (error) throw error;
  return data;
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

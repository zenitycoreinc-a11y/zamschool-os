import { NextResponse } from "next/server";
import { z } from "zod";

import { buildResultNotificationPayloads } from "@/lib/result-notifications";
import { loadTeacherAssignmentScope } from "@/lib/teacher-assignment-scope-server";
import { requireTeacherContext } from "@/lib/server-auth";
import { parseJsonWithSchema, safeErrorMessage } from "@/lib/server-guards";
import { supabaseAdmin } from "@/lib/supabase";

const publishSchema = z
  .object({
    assignmentId: z.string().uuid().optional(),
    resultIds: z.array(z.string().uuid()).min(1).optional(),
  })
  .refine((value) => value.assignmentId || value.resultIds?.length, {
    message: "assignmentId or resultIds is required",
  });

export async function POST(req: Request) {
  try {
    const access = await requireTeacherContext(req);
    if (!access.ok) return access.response;

    const { userId, schoolId } = access.context;
    if (!schoolId) {
      return NextResponse.json(
        { error: "No school linked to this account" },
        { status: 403 }
      );
    }

    const body = await parseJsonWithSchema(req, publishSchema);
    const assignmentScope = await loadTeacherAssignmentScope({
      schoolId,
      actorProfileId: userId,
    });

    if (
      assignmentScope.actorTeacherIds.length === 0 ||
      assignmentScope.allowedClassIds.length === 0
    ) {
      return NextResponse.json({ error: "No assigned result scope found" }, { status: 403 });
    }

    let query = supabaseAdmin
      .from("results")
      .select(
        `
          id,
          student_id,
          assignment_id,
          assignments!inner(
            id,
            title,
            class_id,
            subject_id,
            teacher_id
          )
        `
      )
      .eq("school_id", schoolId);

    if (body.assignmentId) {
      query = query.eq("assignment_id", body.assignmentId);
    }

    if (body.resultIds?.length) {
      query = query.in("id", body.resultIds);
    }

    const { data: resultRows, error: resultError } = await query;
    if (resultError) throw resultError;

    const scopedResults = (resultRows || []).filter((row: any) => {
      const assignment = normalizeRelation(row.assignments);
      return (
        assignment &&
        assignmentScope.actorTeacherIds.includes(assignment.teacher_id) &&
        assignmentScope.allowedClassIds.includes(assignment.class_id)
      );
    });

    if (scopedResults.length === 0) {
      return NextResponse.json({ error: "No publishable results found in assigned scope" }, { status: 404 });
    }

    const publishedAt = new Date().toISOString();
    const resultIds = scopedResults.map((row: any) => row.id);

    const { error: publishError } = await supabaseAdmin
      .from("results")
      .update({
        published_at: publishedAt,
        published_by: userId,
      })
      .in("id", resultIds)
      .eq("school_id", schoolId);

    if (publishError) throw publishError;

    await syncResultNotifications({
      schoolId,
      teacherId: userId,
      publishedAt,
      rows: scopedResults,
    });

    return NextResponse.json({
      success: true,
      data: {
        publishedCount: resultIds.length,
        publishedAt,
        resultIds,
      },
    });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: safeErrorMessage(error, "Failed to publish results") },
      { status: 500 }
    );
  }
}

async function syncResultNotifications(input: {
  schoolId: string;
  teacherId: string;
  publishedAt: string;
  rows: any[];
}) {
  const studentIds = Array.from(
    new Set(input.rows.map((row) => row.student_id).filter(Boolean))
  );
  const assignmentRows = input.rows.map((row) => ({
    resultId: row.id,
    studentId: row.student_id,
    assignment: normalizeRelation(row.assignments),
  }));

  const [
    teacherProfileResult,
    studentRowsResult,
    parentLinksResult,
  ] = await Promise.all([
    supabaseAdmin
      .from("profiles")
      .select("id, first_name, last_name, email")
      .eq("id", input.teacherId)
      .maybeSingle(),
    supabaseAdmin
      .from("students")
      .select("id, profile_id, school_id, class_id")
      .eq("school_id", input.schoolId)
      .in("id", studentIds),
    supabaseAdmin
      .from("parent_students")
      .select("parent_id, student_id")
      .in("student_id", studentIds),
  ]);

  if (teacherProfileResult.error) throw teacherProfileResult.error;
  if (studentRowsResult.error) throw studentRowsResult.error;
  if (parentLinksResult.error) throw parentLinksResult.error;

  const studentRows = studentRowsResult.data || [];
  const parentLinks = parentLinksResult.data || [];
  const classIds = Array.from(new Set(studentRows.map((row: any) => row.class_id).filter(Boolean)));
  const subjectIds = Array.from(
    new Set(assignmentRows.map((row) => row.assignment?.subject_id).filter(Boolean))
  );
  const parentIds = Array.from(new Set(parentLinks.map((row: any) => row.parent_id).filter(Boolean)));
  const studentProfileIds = Array.from(new Set(studentRows.map((row: any) => row.profile_id).filter(Boolean)));

  const [studentProfilesResult, parentRowsResult, classesResult, subjectsResult] = await Promise.all([
    studentProfileIds.length > 0
      ? supabaseAdmin
          .from("profiles")
          .select("id, first_name, last_name, email")
          .in("id", studentProfileIds)
      : Promise.resolve({ data: [], error: null }),
    parentIds.length > 0
      ? supabaseAdmin
          .from("parents")
          .select("id, profile_id, school_id")
          .eq("school_id", input.schoolId)
          .in("id", parentIds)
      : Promise.resolve({ data: [], error: null }),
    classIds.length > 0
      ? supabaseAdmin
          .from("classes")
          .select("id, name")
          .eq("school_id", input.schoolId)
          .in("id", classIds)
      : Promise.resolve({ data: [], error: null }),
    subjectIds.length > 0
      ? supabaseAdmin
          .from("subjects")
          .select("id, name")
          .eq("school_id", input.schoolId)
          .in("id", subjectIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (studentProfilesResult.error) throw studentProfilesResult.error;
  if (parentRowsResult.error) throw parentRowsResult.error;
  if (classesResult.error) throw classesResult.error;
  if (subjectsResult.error) throw subjectsResult.error;

  const teacherName = buildDisplayName(teacherProfileResult.data, "Teacher");
  const studentById = new Map((studentRows || []).map((row: any) => [row.id, row]));
  const studentProfileById = new Map((studentProfilesResult.data || []).map((row: any) => [row.id, row]));
  const classById = new Map((classesResult.data || []).map((row: any) => [row.id, row]));
  const subjectById = new Map((subjectsResult.data || []).map((row: any) => [row.id, row]));
  const parentProfileIdByParentId = new Map(
    (parentRowsResult.data || []).map((row: any) => [row.id, row.profile_id])
  );

  const parentProfileIdsByStudentId = new Map<string, string[]>();
  for (const link of parentLinks) {
    const parentProfileId = parentProfileIdByParentId.get(link.parent_id);
    if (!parentProfileId) continue;

    const current = parentProfileIdsByStudentId.get(link.student_id) || [];
    current.push(parentProfileId);
    parentProfileIdsByStudentId.set(link.student_id, current);
  }

  const payloads = assignmentRows.flatMap((row) => {
    const student = studentById.get(row.studentId);
    const studentProfile = student?.profile_id
      ? studentProfileById.get(student.profile_id)
      : null;
    if (!student?.profile_id || !studentProfile) {
      return [];
    }

    return buildResultNotificationPayloads({
      studentUserId: student.profile_id,
      studentId: row.studentId,
      resultId: row.resultId,
      parents: Array.from(new Set(parentProfileIdsByStudentId.get(row.studentId) || [])).map((id) => ({ id })),
      studentName: buildDisplayName(studentProfile, "Student"),
      className: classById.get(student.class_id || "")?.name || "Class",
      subjectName: subjectById.get(row.assignment?.subject_id || "")?.name || "Subject",
      assignmentTitle: row.assignment?.title || "Result",
      teacherName,
      publishedAt: input.publishedAt,
    });
  });

  if (payloads.length === 0) {
    return;
  }

  const { error } = await supabaseAdmin.from("notifications").upsert(
    payloads.map((payload) => ({
      school_id: input.schoolId,
      user_id: payload.user_id,
      dedupe_key: payload.dedupe_key,
      title: payload.title,
      message: payload.message,
      type: payload.type,
      is_read: false,
    })),
    { onConflict: "school_id,dedupe_key" }
  );

  if (error) throw error;
}

function normalizeRelation<T>(value: T | T[] | null | undefined) {
  if (Array.isArray(value)) return value[0] || null;
  return value || null;
}

function buildDisplayName(
  row:
    | {
        first_name?: string | null;
        last_name?: string | null;
        email?: string | null;
      }
    | null
    | undefined,
  fallback: string
) {
  return (
    [row?.first_name, row?.last_name].filter(Boolean).join(" ").trim() ||
    row?.email ||
    fallback
  );
}

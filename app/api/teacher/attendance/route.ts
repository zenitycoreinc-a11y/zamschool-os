import { NextResponse } from "next/server";
import { z } from "zod";

import { buildStudentRosterScope, canTeacherAccessLesson } from "@/lib/attendance-access";
import { buildAttendanceNotificationPayloads } from "@/lib/attendance-notifications";
import { buildAttendanceWindow, summarizeAttendance } from "@/lib/attendance-summary";
import { buildAttendanceUpsertRows } from "@/lib/attendance-upsert";
import { loadTeacherAssignmentScope } from "@/lib/teacher-assignment-scope-server";
import { requireTeacherContext } from "@/lib/server-auth";
import {
  applyRateLimit,
  getClientIp,
  parseJsonWithSchema,
  safeErrorMessage,
} from "@/lib/server-guards";
import { supabaseAdmin } from "@/lib/supabase";

const attendanceStatusSchema = z.enum([
  "PRESENT",
  "ABSENT",
  "LATE",
  "EXCUSED",
]);

const createAttendanceSchema = z.object({
  lessonId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  statuses: z
    .array(
      z.object({
        studentId: z.string().min(1),
        status: attendanceStatusSchema,
        remarks: z.string().optional().nullable(),
      })
    )
    .min(1),
});

export async function GET(req: Request) {
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

    const { searchParams } = new URL(req.url);
    const requestedClassId = String(searchParams.get("classId") || "").trim();
    const query = String(searchParams.get("query") || "").trim().toLowerCase();
    const window = buildAttendanceWindow(
      searchParams.get("range"),
      searchParams.get("endDate")
    );

    const assignmentScope = await loadTeacherAssignmentScope({
      schoolId,
      actorProfileId: userId,
    });

    const allowedClassIds = requestedClassId
      ? assignmentScope.allowedClassIds.filter((classId) => classId === requestedClassId)
      : assignmentScope.allowedClassIds;

    if (allowedClassIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          window,
          summary: {
            totalRecords: 0,
            classes: 0,
            students: 0,
            ...summarizeAttendance([]),
          },
          classOptions: [],
          records: [],
        },
      });
    }

    const [classMap, attendanceRows] = await Promise.all([
      getClassesByIds(schoolId, allowedClassIds),
      loadAttendanceWindowRows({
        schoolId,
        classIds: allowedClassIds,
        startDate: window.startDate,
        endDate: window.endDate,
      }),
    ]);

    const studentMap = await getStudentsByIds(
      schoolId,
      uniqueValues(attendanceRows.map((row) => row.student_id).filter(Boolean))
    );

    const records = attendanceRows
      .map((row) => {
        const student = studentMap.get(row.student_id || "");
        const classRow = classMap.get(row.class_id || "");
        const status = normalizeAttendanceStatus(row.status);
        const date = String(row.record_date || "").trim();

        return {
          id: row.id,
          date,
          classId: row.class_id || "",
          className: buildClassLabel(classRow),
          studentId: row.student_id || "",
          studentName: buildDisplayName(student?.profile, "Student"),
          admissionNumber: student?.student_number || null,
          email: student?.profile?.email || null,
          status,
          remarks: row.remarks || row.notes || null,
          sessionName: row.session_name || "Lesson",
          sessionTime: row.session_time || null,
          recordedAt: row.created_at || null,
        };
      })
      .filter((row) => {
        if (!query) return true;
        return [
          row.className,
          row.studentName,
          row.admissionNumber,
          row.email,
          row.sessionName,
          row.status,
          row.remarks,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(query);
      });

    const summary = summarizeAttendance(records);

    return NextResponse.json({
      success: true,
      data: {
        window,
        summary: {
          totalRecords: records.length,
          classes: uniqueValues(records.map((row) => row.classId).filter(Boolean)).length,
          students: uniqueValues(records.map((row) => row.studentId).filter(Boolean)).length,
          ...summary,
        },
        classOptions: Array.from(classMap.entries()).map(([id, value]) => ({
          id,
          label: buildClassLabel(value),
        })),
        records,
      },
    });
  } catch (error: unknown) {
    console.error("Teacher attendance GET error", error);
    return NextResponse.json(
      { error: safeErrorMessage(error, "Failed to load attendance history") },
      { status: 500 }
    );
  }
}

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

    const ip = getClientIp(req);
    const rate = await applyRateLimit({
      key: `teacher-attendance:${userId}:${ip}`,
      limit: 60,
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

    const body = await parseJsonWithSchema(req, createAttendanceSchema);

    const assignmentScope = await loadTeacherAssignmentScope({
      schoolId,
      actorProfileId: userId,
    });

    const { data: lesson, error: lessonError } = await supabaseAdmin
      .from("lessons")
      .select(
        `
          id,
          school_id,
          class_id,
          teacher_id,
          subject_id,
          title,
          start_time,
          end_time,
          subjects(name, code)
        `
      )
      .eq("id", body.lessonId)
      .maybeSingle();

    if (lessonError) throw lessonError;
    if (!lesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }

    const classRow = await getClassById({
      schoolId,
      classId: lesson.class_id,
    });

    const hasLessonAccess = assignmentScope.actorTeacherIds.some((actorTeacherId) =>
      canTeacherAccessLesson({
        actorId: actorTeacherId,
        lessonTeacherId: lesson.teacher_id,
        classSupervisorId: classRow?.supervisor_id || null,
        lessonSchoolId: lesson.school_id,
        actorSchoolId: schoolId,
      })
    );

    if (!hasLessonAccess) {
      return NextResponse.json(
        { error: "Forbidden - lesson access denied" },
        { status: 403 }
      );
    }

    const rosterRows = await getStudentsByClassId({
      schoolId,
      classId: lesson.class_id,
    });

    const rosterStudentIds = buildStudentRosterScope({
      classId: lesson.class_id,
      students: rosterRows.map((row) => ({
        id: row.id,
        classId: row.class_id,
      })),
    });

    if (rosterStudentIds.length === 0) {
      return NextResponse.json(
        { error: "No students are assigned to this lesson's class" },
        { status: 400 }
      );
    }

    const submittedIds = body.statuses.map((row) => row.studentId);
    const duplicateIds = getDuplicateIds(submittedIds);
    if (duplicateIds.length > 0) {
      return NextResponse.json(
        { error: `Duplicate student statuses submitted: ${duplicateIds.join(", ")}` },
        { status: 400 }
      );
    }

    const submittedIdSet = new Set(submittedIds);
    const rosterIdSet = new Set(rosterStudentIds);
    const missingStudentIds = rosterStudentIds.filter(
      (studentId) => !submittedIdSet.has(studentId)
    );
    if (missingStudentIds.length > 0) {
      return NextResponse.json(
        {
          error:
            "Attendance is incomplete. Every roster student must have a submitted status.",
          missingStudentIds,
        },
        { status: 400 }
      );
    }

    const unexpectedStudentIds = submittedIds.filter(
      (studentId) => !rosterIdSet.has(studentId)
    );
    if (unexpectedStudentIds.length > 0) {
      return NextResponse.json(
        {
          error:
            "Attendance payload includes students outside the assigned lesson roster.",
          unexpectedStudentIds,
        },
        { status: 400 }
      );
    }

    const sessionName = lesson.title || getSubjectField(lesson.subjects, "name") || "Lesson";
    const rows = buildAttendanceUpsertRows({
      schoolId,
      classId: lesson.class_id,
      markedBy: userId,
      date: body.date,
      sessionName,
      sessionTime: lesson.start_time,
      statuses: body.statuses,
    });

    const { data: savedRows, error: saveError } = await supabaseAdmin
      .from("attendance")
      .upsert(rows, {
        onConflict:
          "school_id,class_id,student_id,attendance_date,session_name,session_time",
      })
      .select();

    if (saveError) throw saveError;

    await syncAttendanceNotifications({
      schoolId,
      teacherId: userId,
      lesson,
      classRow,
      rosterRows,
      statuses: body.statuses,
      date: body.date,
    });

    return NextResponse.json({
      success: true,
      data: {
        lessonId: lesson.id,
        classId: lesson.class_id,
        savedCount: savedRows?.length || rows.length,
        date: body.date,
      },
    });
  } catch (error: unknown) {
    console.error("Teacher attendance POST error", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: safeErrorMessage(error, "Failed to save attendance") },
      { status: 500 }
    );
  }
}

async function getStudentsByClassId(input: {
  schoolId: string;
  classId: string;
}) {
  const { data: students, error: studentsError } = await supabaseAdmin
    .from("students")
    .select("id, profile_id, class_id, school_id, student_number")
    .eq("school_id", input.schoolId)
    .eq("class_id", input.classId)
    .order("student_number", { ascending: true });

  if (studentsError) throw studentsError;

  const profileIds = Array.from(
    new Set((students || []).map((row: any) => row.profile_id).filter(Boolean))
  );

  let profileById = new Map<string, any>();
  if (profileIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from("profiles")
      .select("id, first_name, last_name, email")
      .in("id", profileIds);

    if (profilesError) throw profilesError;
    profileById = new Map((profiles || []).map((row: any) => [row.id, row]));
  }

  return (students || []).map((row: any) => ({
    ...row,
    profile: profileById.get(row.profile_id || "") || null,
  }));
}

async function getStudentsByIds(schoolId: string, studentIds: string[]) {
  if (studentIds.length === 0) {
    return new Map<string, any>();
  }

  const { data: students, error: studentsError } = await supabaseAdmin
    .from("students")
    .select("id, profile_id, student_number")
    .eq("school_id", schoolId)
    .in("id", studentIds);

  if (studentsError) throw studentsError;

  const profileIds = Array.from(
    new Set((students || []).map((row: any) => row.profile_id).filter(Boolean))
  );

  let profileById = new Map<string, any>();
  if (profileIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from("profiles")
      .select("id, first_name, last_name, email")
      .in("id", profileIds);

    if (profilesError) throw profilesError;
    profileById = new Map((profiles || []).map((row: any) => [row.id, row]));
  }

  return new Map(
    (students || []).map((row: any) => [
      row.id,
      {
        ...row,
        profile: profileById.get(row.profile_id || "") || null,
      },
    ])
  );
}

async function loadAttendanceWindowRows(input: {
  schoolId: string;
  classIds: string[];
  startDate: string;
  endDate: string;
}) {
  if (input.classIds.length === 0) {
    return [];
  }

  const queryAttempts = [
    async () => {
      const { data, error } = await supabaseAdmin
        .from("attendance")
        .select(
          "id, class_id, student_id, attendance_date, status, remarks, notes, session_name, session_time, created_at"
        )
        .eq("school_id", input.schoolId)
        .in("class_id", input.classIds)
        .gte("attendance_date", input.startDate)
        .lte("attendance_date", input.endDate)
        .order("attendance_date", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data || []).map((row: any) => ({
        ...row,
        record_date: row.attendance_date,
      }));
    },
    async () => {
      const { data, error } = await supabaseAdmin
        .from("attendance")
        .select(
          "id, class_id, student_id, date, status, remarks, notes, session_name, session_time, created_at"
        )
        .eq("school_id", input.schoolId)
        .in("class_id", input.classIds)
        .gte("date", input.startDate)
        .lte("date", input.endDate)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data || []).map((row: any) => ({
        ...row,
        record_date: row.date,
      }));
    },
  ];

  for (const runQuery of queryAttempts) {
    try {
      return await runQuery();
    } catch {
      continue;
    }
  }

  return [];
}

async function getClassById(input: {
  schoolId: string;
  classId: string;
}) {
  const legacy = await supabaseAdmin
    .from("classes")
    .select("id, name, grade_level, supervisor_id")
    .eq("school_id", input.schoolId)
    .eq("id", input.classId)
    .maybeSingle();

  if (!legacy.error) {
    return legacy.data;
  }

  const modern = await supabaseAdmin
    .from("classes")
    .select("id, name, supervisor_id, grades(name, level)")
    .eq("school_id", input.schoolId)
    .eq("id", input.classId)
    .maybeSingle();

  if (modern.error) throw modern.error;
  return modern.data;
}

async function getClassesByIds(schoolId: string, classIds: string[]) {
  if (classIds.length === 0) {
    return new Map<string, any>();
  }

  const legacy = await supabaseAdmin
    .from("classes")
    .select("id, name, grade_level, supervisor_id")
    .eq("school_id", schoolId)
    .in("id", classIds);

  if (!legacy.error) {
    return new Map((legacy.data || []).map((row: any) => [row.id, row]));
  }

  const modern = await supabaseAdmin
    .from("classes")
    .select("id, name, supervisor_id, grades(name, level)")
    .eq("school_id", schoolId)
    .in("id", classIds);

  if (modern.error) throw modern.error;
  return new Map((modern.data || []).map((row: any) => [row.id, row]));
}

function getDuplicateIds(ids: string[]) {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const id of ids) {
    if (seen.has(id)) {
      duplicates.add(id);
    } else {
      seen.add(id);
    }
  }

  return Array.from(duplicates);
}

async function syncAttendanceNotifications(input: {
  schoolId: string;
  teacherId: string;
  lesson: any;
  classRow: any;
  rosterRows: any[];
  statuses: Array<{ studentId: string; status: string; remarks?: string | null }>;
  date: string;
}) {
  const studentIds = input.statuses.map((row) => row.studentId);
  if (studentIds.length === 0) {
    return;
  }

  const [{ data: teacherProfile, error: teacherError }, { data: parentLinks, error: parentLinkError }] =
    await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("first_name, last_name, email")
        .eq("id", input.teacherId)
        .maybeSingle(),
      supabaseAdmin
        .from("parent_students")
        .select("parent_id, student_id")
        .in("student_id", studentIds),
    ]);

  if (teacherError) throw teacherError;
  if (parentLinkError) throw parentLinkError;

  const parentIds = Array.from(
    new Set((parentLinks || []).map((row: any) => row.parent_id).filter(Boolean))
  );

  let parentRows: Array<{ id: string; profile_id: string; school_id: string }> = [];
  if (parentIds.length > 0) {
    const { data, error: parentError } = await supabaseAdmin
      .from("parents")
      .select("id, profile_id, school_id")
      .eq("school_id", input.schoolId)
      .in("id", parentIds);

    if (parentError) throw parentError;
    parentRows = data || [];
  }

  const parentProfileIdByParentId = new Map<string, string>();
  for (const row of parentRows) {
    if (row.id && row.profile_id) {
      parentProfileIdByParentId.set(row.id, row.profile_id);
    }
  }

  const parentProfileIdsByStudentId = new Map<string, string[]>();
  for (const link of parentLinks || []) {
    const parentProfileId = parentProfileIdByParentId.get(link.parent_id);
    if (!parentProfileId) continue;

    const existing = parentProfileIdsByStudentId.get(link.student_id) || [];
    existing.push(parentProfileId);
    parentProfileIdsByStudentId.set(link.student_id, existing);
  }

  const studentById = new Map<string, any>();
  for (const row of input.rosterRows) {
    studentById.set(row.id, row);
  }

  const teacherName = buildDisplayName(teacherProfile || undefined, "Teacher");
  const className = buildClassLabel(input.classRow);
  const lessonName =
    input.lesson.title || getSubjectField(input.lesson.subjects, "name") || "Lesson";
  const timeLabel = input.lesson.start_time || null;

  const payloads = input.statuses.flatMap((row) => {
    const parentProfileIds = Array.from(
      new Set(parentProfileIdsByStudentId.get(row.studentId) || [])
    );

    const student = studentById.get(row.studentId);
    const studentProfileId = student?.profile_id || null;
    if (!studentProfileId) {
      return [];
    }

    return buildAttendanceNotificationPayloads({
      studentUserId: studentProfileId,
      studentId: row.studentId,
      lessonId: input.lesson.id,
      parents: parentProfileIds.map((id) => ({ id })),
      studentName: buildDisplayName(student?.profile, "Student"),
      className,
      lessonName,
      teacherName,
      date: input.date,
      timeLabel,
      status: row.status as "PRESENT" | "ABSENT" | "LATE" | "EXCUSED",
    });
  });

  if (payloads.length === 0) {
    return;
  }

  await upsertAttendanceNotifications(input.schoolId, payloads);
}

async function upsertAttendanceNotifications(
  schoolId: string,
  payloads: Array<{
    user_id: string;
    dedupe_key: string;
    title: string;
    message: string;
    type: string;
  }>
) {
  const rows = payloads.map((payload) => ({
    school_id: schoolId,
    user_id: payload.user_id,
    dedupe_key: payload.dedupe_key,
    title: payload.title,
    message: payload.message,
    type: payload.type,
    is_read: false,
  }));

  const { error } = await supabaseAdmin
    .from("notifications")
    .upsert(rows, { onConflict: "school_id,dedupe_key" });

  if (error) throw error;
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

function normalizeAttendanceStatus(status: string | null | undefined) {
  const normalized = String(status || "").trim().toUpperCase();
  if (
    normalized === "PRESENT" ||
    normalized === "ABSENT" ||
    normalized === "LATE" ||
    normalized === "EXCUSED"
  ) {
    return normalized;
  }
  return normalized || "UNMARKED";
}

function buildClassLabel(classRow: any) {
  const className = typeof classRow?.name === "string" ? classRow.name.trim() : "";
  const gradeName =
    typeof classRow?.grades?.name === "string"
      ? classRow.grades.name.trim()
      : buildGradeLevelLabel(classRow?.grade_level);

  return [gradeName, className].filter(Boolean).join(" - ") || className || "Class";
}

function buildGradeLevelLabel(value: string | number | null | undefined) {
  const level = String(value || "").trim();
  return level ? `Grade ${level}` : "";
}

function getSubjectField(
  subject: { name?: string | null; code?: string | null } | Array<{ name?: string | null; code?: string | null }> | null | undefined,
  field: "name" | "code"
) {
  if (Array.isArray(subject)) {
    return subject[0]?.[field] || null;
  }

  return subject?.[field] || null;
}

function uniqueValues(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

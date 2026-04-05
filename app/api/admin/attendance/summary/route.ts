import { NextResponse } from "next/server";

import { buildAttendanceWindow, summarizeAttendance } from "@/lib/attendance-summary";
import {
  buildAttendanceSessionKey,
  buildTeacherActorIds,
} from "@/lib/live-schema-adapters";
import { requireAdminContext } from "@/lib/server-auth";
import { safeErrorMessage } from "@/lib/server-guards";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: Request) {
  try {
    const access = await requireAdminContext(req);
    if (!access.ok) return access.response;
    const { schoolId } = access.context;
    const { searchParams } = new URL(req.url);
    const classId = searchParams.get("classId");
    const teacherId = searchParams.get("teacherId");
    const studentId = searchParams.get("studentId");
    const { range, startDate, endDate } = buildAttendanceWindow(
      searchParams.get("range"),
      searchParams.get("endDate")
    );

    const teacherFilter = teacherId
      ? await resolveTeacherFilter({ schoolId, teacherId })
      : {
          lessonTeacherIds: [] as string[],
          recordedByProfileIds: [] as string[],
        };

    if (teacherId && teacherFilter.lessonTeacherIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          range,
          startDate,
          endDate,
          summary: summarizeAttendance([]),
          classBreakdown: [],
          teacherBreakdown: [],
          rows: [],
        },
      });
    }

    const lessonsBySessionKey = await getLessonsBySessionKey({
      schoolId,
      classId,
      teacherIds: teacherFilter.lessonTeacherIds,
    });

    let attendanceQuery = supabaseAdmin
      .from("attendance")
      .select(
        "id, student_id, class_id, date, attendance_date, status, remarks, notes, recorded_by, session_name, session_time, created_at"
      )
      .eq("school_id", schoolId)
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false });

    if (classId) {
      attendanceQuery = attendanceQuery.eq("class_id", classId);
    }

    if (studentId) {
      attendanceQuery = attendanceQuery.eq("student_id", studentId);
    }

    if (teacherFilter.recordedByProfileIds.length > 0) {
      attendanceQuery = attendanceQuery.in(
        "recorded_by",
        teacherFilter.recordedByProfileIds
      );
    }

    const { data: attendanceRows, error: attendanceError } = await attendanceQuery;
    if (attendanceError) throw attendanceError;

    const studentIds = Array.from(
      new Set((attendanceRows || []).map((row: any) => row.student_id).filter(Boolean))
    );
    const classIds = Array.from(
      new Set(
        (attendanceRows || [])
          .map((row: any) => row.class_id)
          .concat(
            Array.from(lessonsBySessionKey.values()).map((lesson: any) => lesson.class_id)
          )
          .filter(Boolean)
      )
    ) as string[];
    const teacherProfileIds = Array.from(
      new Set((attendanceRows || []).map((row: any) => row.recorded_by).filter(Boolean))
    );

    const [studentsById, teachersById, classesById] = await Promise.all([
      getStudentProfilesByStudentRowIds(studentIds),
      getProfilesById(teacherProfileIds),
      getClassesById(schoolId, classIds),
    ]);

    const rows = (attendanceRows || []).map((row: any) => {
      const lesson = lessonsBySessionKey.get(
        buildSessionLookupKey({
          classId: row.class_id,
          sessionName: row.session_name,
          sessionTime: row.session_time,
        })
      );

      return buildAttendanceDetail({
        row,
        student: studentsById.get(row.student_id || ""),
        lesson,
        teacher: teachersById.get(row.recorded_by || ""),
        classRow: classesById.get((row.class_id || lesson?.class_id || "") as string),
      });
    });

    const classBreakdown = buildGroupedBreakdown({
      rows,
      key: "classId",
      nameKey: "className",
    });
    const teacherBreakdown = buildGroupedBreakdown({
      rows,
      key: "teacherId",
      nameKey: "teacherName",
    });

    return NextResponse.json({
      success: true,
      data: {
        range,
        startDate,
        endDate,
        summary: summarizeAttendance(rows),
        classBreakdown,
        teacherBreakdown,
        rows,
      },
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Failed to load attendance summary") },
      { status: 500 }
    );
  }
}

async function resolveTeacherFilter(input: {
  schoolId: string | null;
  teacherId: string;
}) {
  if (!input.schoolId || !input.teacherId) {
    return {
      lessonTeacherIds: [] as string[],
      recordedByProfileIds: [] as string[],
    };
  }

  const { data, error } = await supabaseAdmin
    .from("teachers")
    .select("id, profile_id")
    .eq("school_id", input.schoolId)
    .or(`id.eq.${input.teacherId},profile_id.eq.${input.teacherId}`);

  if (error) throw error;

  const lessonTeacherIds = buildTeacherActorIds({
    actorProfileId: input.teacherId,
    teachers: data || [],
  }).filter((value) => (data || []).some((row: any) => row.id === value));

  const recordedByProfileIds = Array.from(
    new Set(
      [input.teacherId, ...(data || []).map((row: any) => row.profile_id).filter(Boolean)].filter(
        Boolean
      )
    )
  );

  return { lessonTeacherIds, recordedByProfileIds };
}

async function getLessonsBySessionKey(input: {
  schoolId: string | null;
  classId: string | null;
  teacherIds: string[];
}) {
  if (!input.schoolId) {
    return new Map<string, any>();
  }

  let query = supabaseAdmin
    .from("lessons")
    .select(
      `
        id,
        class_id,
        teacher_id,
        subject_id,
        title,
        start_time,
        end_time,
        subjects(name, code)
      `
    )
    .eq("school_id", input.schoolId);

  if (input.classId) {
    query = query.eq("class_id", input.classId);
  }

  if (input.teacherIds.length > 0) {
    query = query.in("teacher_id", input.teacherIds);
  }

  const { data, error } = await query;
  if (error) throw error;

  return new Map(
    (data || []).map((row: any) => [
      buildSessionLookupKey({
        classId: row.class_id,
        sessionName: row.title || getSubjectField(row.subjects, "name") || "Lesson",
        sessionTime: row.start_time,
      }),
      row,
    ])
  );
}

async function getStudentProfilesByStudentRowIds(studentIds: string[]) {
  if (studentIds.length === 0) {
    return new Map<string, any>();
  }

  const { data: students, error: studentError } = await supabaseAdmin
    .from("students")
    .select("id, profile_id")
    .in("id", studentIds);

  if (studentError) throw studentError;

  const profileIds = Array.from(
    new Set((students || []).map((row: any) => row.profile_id).filter(Boolean))
  );
  const profilesById = await getProfilesById(profileIds);

  return new Map(
    (students || []).map((row: any) => [
      row.id,
      profilesById.get(row.profile_id || "") || null,
    ])
  );
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

async function getProfilesById(profileIds: string[]) {
  if (profileIds.length === 0) {
    return new Map<string, any>();
  }

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id, first_name, last_name, email")
    .in("id", profileIds);

  if (error) throw error;
  return new Map((data || []).map((row: any) => [row.id, row]));
}

function buildAttendanceDetail(input: {
  row: any;
  student: any;
  lesson: any;
  teacher: any;
  classRow: any;
}) {
  return {
    id: input.row.id,
    date: input.row.date || input.row.attendance_date,
    status: normalizeAttendanceStatus(input.row.status),
    remarks: input.row.remarks || input.row.notes || null,
    studentId: input.row.student_id,
    studentName: buildDisplayName(input.student),
    lessonId: input.lesson?.id || null,
    classId: input.row.class_id || input.lesson?.class_id || null,
    className: buildClassLabel(input.classRow),
    teacherId: input.row.recorded_by || null,
    teacherName: buildDisplayName(input.teacher),
    subjectName:
      input.lesson?.title ||
      getSubjectField(input.lesson?.subjects, "name") ||
      input.row.session_name ||
      "Attendance",
    subjectCode: getSubjectField(input.lesson?.subjects, "code"),
    startTime: input.row.session_time || input.lesson?.start_time || null,
    endTime: input.lesson?.end_time || null,
    room: null,
  };
}

function buildGroupedBreakdown(input: {
  rows: any[];
  key: "classId" | "teacherId";
  nameKey: "className" | "teacherName";
}) {
  const groups = new Map<
    string,
    { id: string; name: string; rows: any[]; lessons: Set<string> }
  >();

  for (const row of input.rows) {
    const id = row[input.key];
    if (!id) continue;

    const existing =
      groups.get(id) ||
      ({
        id,
        name: row[input.nameKey] || "Unknown",
        rows: [] as any[],
        lessons: new Set<string>(),
      } as { id: string; name: string; rows: any[]; lessons: Set<string> });

    existing.rows.push(row);
    if (row.lessonId) {
      existing.lessons.add(row.lessonId);
    }
    groups.set(id, existing);
  }

  return Array.from(groups.values())
    .map((group) => ({
      id: group.id,
      name: group.name,
      attendanceCount: group.rows.length,
      lessonCount: group.lessons.size,
      summary: summarizeAttendance(group.rows),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function buildClassLabel(classRow: any) {
  if (!classRow) return "Unknown class";

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
  if (!row) return "Unknown";

  return (
    [row.first_name, row.last_name].filter(Boolean).join(" ").trim() ||
    row.email ||
    "Unknown"
  );
}

function buildSessionLookupKey(input: {
  classId: string | null | undefined;
  sessionName: string | null | undefined;
  sessionTime: string | null | undefined;
}) {
  return buildAttendanceSessionKey({
    classId: input.classId || "",
    studentId: "*",
    sessionName: input.sessionName,
    sessionTime: input.sessionTime,
  });
}

function getSubjectField(
  subject:
    | { name?: string | null; code?: string | null }
    | Array<{ name?: string | null; code?: string | null }>
    | null
    | undefined,
  field: "name" | "code"
) {
  if (Array.isArray(subject)) {
    return subject[0]?.[field] || null;
  }

  return subject?.[field] || null;
}

function normalizeAttendanceStatus(status: string | null | undefined) {
  const value = String(status || "").trim().toUpperCase();
  return value || "UNKNOWN";
}

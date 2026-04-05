import { NextResponse } from "next/server";

import { buildAttendanceWindow, summarizeAttendance } from "@/lib/attendance-summary";
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
    const { range, startDate, endDate } = buildAttendanceWindow(
      searchParams.get("range"),
      searchParams.get("endDate")
    );

    const parentRecord = await getParentRecord({
      profileId: userId,
      schoolId,
    });

    if (!parentRecord) {
      return jsonWithPrivateCache({
        success: true,
        data: {
          range,
          startDate,
          endDate,
          summary: summarizeAttendance([]),
          children: [],
          rows: [],
        },
      });
    }

    const linked = await getLinkedStudents({
      parentRecordId: parentRecord.id,
      parentProfileId: userId,
      schoolId,
      fallbackRelationship: parentRecord.relation_type || null,
    });

    if (linked.profileIds.length === 0) {
      return jsonWithPrivateCache({
        success: true,
        data: {
          range,
          startDate,
          endDate,
          summary: summarizeAttendance([]),
          children: [],
          rows: [],
        },
      });
    }

    if (selectedStudentId && !linked.profileIds.includes(selectedStudentId)) {
      return NextResponse.json(
        { error: "Requested child is not linked to this parent account" },
        { status: 403 }
      );
    }

    const scopedProfileIds = selectedStudentId
      ? [selectedStudentId]
      : linked.profileIds;
    const scopedStudentRowIds = scopedProfileIds
      .map((profileId) => linked.studentRowIdByProfileId.get(profileId))
      .filter(Boolean) as string[];

    const { data: studentRows, error: studentError } = await supabaseAdmin
      .from("profiles")
      .select("id, school_id, first_name, last_name, email")
      .eq("school_id", schoolId)
      .in("id", scopedProfileIds)
      .order("first_name", { ascending: true });

    if (studentError) throw studentError;

    const classIds = Array.from(
      new Set(
        scopedProfileIds
          .map((profileId) => linked.classIdByProfileId.get(profileId))
          .filter(Boolean)
      )
    ) as string[];

    const classesById = await getClassesById(schoolId, classIds);
    const { data: attendanceRows, error: attendanceError } = await supabaseAdmin
      .from("attendance")
      .select(
        "id, student_id, class_id, date, attendance_date, status, remarks, notes, recorded_by, session_name, session_time, created_at"
      )
      .eq("school_id", schoolId)
      .in("student_id", scopedStudentRowIds)
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false });

    if (attendanceError) throw attendanceError;

    const recordedByIds = Array.from(
      new Set((attendanceRows || []).map((row: any) => row.recorded_by).filter(Boolean))
    );
    const teachersById = await getProfilesById(recordedByIds);
    const studentsById = new Map((studentRows || []).map((row: any) => [row.id, row]));
    const studentProfileIdByStudentRowId = linked.profileIdByStudentRowId;

    const rows = (attendanceRows || []).flatMap((row: any) => {
      const studentProfileId = studentProfileIdByStudentRowId.get(row.student_id);
      if (!studentProfileId) {
        return [];
      }

      const student = studentsById.get(studentProfileId);
      const classId =
        linked.classIdByProfileId.get(studentProfileId) ||
        row.class_id ||
        null;

      return [
        buildAttendanceDetail({
          row,
          studentProfileId,
          student,
          teacher: teachersById.get(row.recorded_by || ""),
          classRow: classesById.get(classId || ""),
        }),
      ];
    });

    const children = (studentRows || []).map((student: any) => {
      const childRows = rows.filter((row: any) => row.studentId === student.id);
      return {
        id: student.id,
        displayName: buildDisplayName(student),
        admissionNumber: linked.studentNumberByProfileId.get(student.id) || null,
        classId: linked.classIdByProfileId.get(student.id) || null,
        className: buildClassLabel(
          classesById.get(linked.classIdByProfileId.get(student.id) || "")
        ),
        relationship:
          linked.relationshipByProfileId.get(student.id) || parentRecord.relation_type || null,
        summary: summarizeAttendance(childRows),
      };
    });

    return jsonWithPrivateCache({
      success: true,
      data: {
        range,
        startDate,
        endDate,
        summary: summarizeAttendance(rows),
        children,
        rows,
      },
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Failed to load parent attendance") },
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
    .select("id, relation_type")
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
      studentRowIdByProfileId: mapped.studentRowIdByProfileId,
      profileIdByStudentRowId: mapped.profileIdByStudentRowId,
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
  const studentRowIdByProfileId = new Map<string, string>();
  const profileIdByStudentRowId = new Map<string, string>();
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
    studentRowIdByProfileId,
    profileIdByStudentRowId,
    classIdByProfileId,
    studentNumberByProfileId,
  };
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
  studentProfileId: string;
  student: any;
  teacher: any;
  classRow: any;
}) {
  return {
    id: input.row.id,
    date: input.row.date || input.row.attendance_date,
    status: normalizeAttendanceStatus(input.row.status),
    remarks: input.row.remarks || input.row.notes || null,
    studentId: input.studentProfileId,
    studentName: buildDisplayName(input.student),
    lessonId: null,
    classId: input.classRow?.id || input.row.class_id || null,
    className: buildClassLabel(input.classRow),
    teacherId: input.row.recorded_by || null,
    teacherName: buildDisplayName(input.teacher),
    subjectName: input.row.session_name || "Attendance",
    subjectCode: null,
    startTime: input.row.session_time || null,
    endTime: null,
    room: null,
  };
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
  return (
    [row?.first_name, row?.last_name].filter(Boolean).join(" ").trim() ||
    row?.email ||
    "Student"
  );
}

function normalizeAttendanceStatus(status: string | null | undefined) {
  const normalized = String(status || "").trim().toUpperCase();
  if (["PRESENT", "ABSENT", "LATE", "EXCUSED"].includes(normalized)) {
    return normalized;
  }
  return "ABSENT";
}

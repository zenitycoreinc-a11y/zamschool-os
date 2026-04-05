import { NextResponse } from "next/server";

import { formatLocalDateInputValue } from "@/lib/local-date";
import { buildAttendanceSessionKey } from "@/lib/live-schema-adapters";
import { requireTeacherContext } from "@/lib/server-auth";
import { safeErrorMessage } from "@/lib/server-guards";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveLessonDayOfWeek } from "@/lib/lesson-day";
import { loadTeacherAssignmentScope } from "@/lib/teacher-assignment-scope-server";
import { buildTeacherTenure } from "@/lib/teacher-oversight";
import {
  buildAcademicContextLabel,
  buildDisplayName,
  isVisibleToRole,
  jsonWithPrivateCache,
} from "@/lib/teacher-route-common";

type LoadedTeacherProfile = {
  id?: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  avatar_url?: string | null;
  photo_url?: string | null;
  is_active?: boolean | null;
  must_change_password?: boolean | null;
  temporary_password_issued_at?: string | null;
} | null;

type LoadedTeacherRecord = {
  id?: string | null;
  profile_id?: string | null;
  employee_id?: string | null;
  employee_number?: string | null;
  department?: string | null;
  specialization?: string | null;
  hire_date?: string | null;
} | null;

type NamedRecord = {
  name?: string | null;
} | null;

type TeacherSpecializationRow = {
  subject_id?: string | null;
};

type TeacherAssignmentRow = {
  class_id?: string | null;
  subject_id?: string | null;
};

type SupervisedClassRow = {
  id?: string | null;
  name?: string | null;
  grade_level?: string | number | null;
  supervisor_id?: string | null;
};

type LessonRow = {
  id?: string | null;
  class_id?: string | null;
  teacher_id?: string | null;
  subject_id?: string | null;
  day_of_week?: number | null;
  start_time?: string | null;
  title?: string | null;
};

type AttendanceRow = {
  class_id?: string | null;
  session_name?: string | null;
  session_time?: string | null;
};

export async function GET(req: Request) {
  try {
    const access = await requireTeacherContext(req);
    if (!access.ok) return access.response;
    if (!access.context.schoolId) {
      return NextResponse.json({ error: "No school linked to this account" }, { status: 403 });
    }

    const schoolId = access.context.schoolId;
    const profileId = access.context.userId;
    const todayDate = formatLocalDateInputValue(new Date());
    const lessonDayOfWeek = resolveLessonDayOfWeek(todayDate);
    const assignmentScope = await loadTeacherAssignmentScope({
      schoolId,
      actorProfileId: profileId,
    });

    const [
      profile,
      teacherRecord,
      schoolRecord,
      activeYear,
      activeTerm,
      specializationRows,
      teachingAssignments,
      supervisedClasses,
      taughtLessons,
      supervisedLessons,
      unreadSummary,
      pendingGrades,
      draftResults,
      upcomingEvents,
    ] = await Promise.all([
      loadProfile(profileId, schoolId),
      loadTeacherRecord(profileId, schoolId),
      loadSchoolRecord(schoolId),
      loadActiveAcademicYear(schoolId),
      loadActiveTerm(schoolId),
      loadTeacherSpecializationRows(schoolId, profileId),
      loadTeacherClassSubjectAssignments(schoolId, profileId),
      loadSupervisedClasses(schoolId, assignmentScope.actorTeacherIds),
      fetchLessonsByTeacherIds({
        schoolId,
        dayOfWeek: lessonDayOfWeek,
        teacherIds: assignmentScope.actorTeacherIds,
      }),
      fetchLessonsByClassIds({
        schoolId,
        dayOfWeek: lessonDayOfWeek,
        classIds: assignmentScope.supervisedClassIds,
      }),
      loadUnreadSummary(profileId),
      loadPendingGrades(schoolId, assignmentScope),
      loadDraftResults(schoolId, assignmentScope),
      loadUpcomingEvents(schoolId, access.context.role),
    ]);

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const lessons = dedupeLessonsById([...(taughtLessons || []), ...(supervisedLessons || [])]);
    const classIds = Array.from(
      new Set(
        [
          ...lessons.map((lesson: any) => lesson.class_id),
          ...teachingAssignments.map((assignment: any) => assignment.class_id),
          ...supervisedClasses.map((classRow: any) => classRow.id),
        ].filter(Boolean)
      )
    );
    const subjectIds = Array.from(
      new Set(
        [
          ...lessons.map((lesson: any) => lesson.subject_id),
          ...teachingAssignments.map((assignment: any) => assignment.subject_id),
          ...specializationRows.map((row: any) => row.subject_id),
        ].filter(Boolean)
      )
    );

    const [studentCount, attendanceRows, classMap, subjectMap] = await Promise.all([
      countStudentsByClassIds(schoolId, classIds),
      loadAttendanceRows(schoolId, classIds, todayDate),
      loadClassMap(schoolId, classIds),
      loadSubjectMap(schoolId, subjectIds),
    ]);

    const completedSessionKeys = new Set(
      (attendanceRows || []).map((row: any) =>
        buildAttendanceSessionKey({
          classId: row.class_id,
          studentId: "*",
          sessionName: row.session_name || "Lesson",
          sessionTime: row.session_time || null,
        })
      )
    );
    const lessonSessionKeys = new Set(
      lessons.map((lesson: any) =>
        buildAttendanceSessionKey({
          classId: lesson.class_id,
          studentId: "*",
          sessionName:
            lesson.title || subjectMap.get(String(lesson.subject_id || ""))?.name || "Lesson",
          sessionTime: lesson.start_time || null,
        })
      )
    );

    const assignedClasses = dedupeNamedRows([
      ...teachingAssignments.map((assignment: any) => ({
        id: String(assignment.class_id || ""),
        name: buildClassLabel(classMap.get(String(assignment.class_id || "")) || null),
      })),
      ...lessons.map((lesson: any) => ({
        id: String(lesson.class_id || ""),
        name: buildClassLabel(classMap.get(String(lesson.class_id || "")) || null),
      })),
    ]);
    const assignedSubjects = dedupeNamedRows([
      ...specializationRows.map((row: any) => ({
        id: String(row.subject_id || ""),
        name: subjectMap.get(String(row.subject_id || ""))?.name || "Subject",
      })),
      ...teachingAssignments.map((assignment: any) => ({
        id: String(assignment.subject_id || ""),
        name: subjectMap.get(String(assignment.subject_id || ""))?.name || "Subject",
      })),
      ...lessons.map((lesson: any) => ({
        id: String(lesson.subject_id || ""),
        name: subjectMap.get(String(lesson.subject_id || ""))?.name || "Subject",
      })),
    ]);
    const compactSupervisedClasses = dedupeNamedRows(
      supervisedClasses.map((row: any) => ({
        id: String(row.id || ""),
        name: buildClassLabel(row),
      }))
    );

    const completed = Math.min(completedSessionKeys.size, lessonSessionKeys.size);
    const pending = Math.max(lessonSessionKeys.size - completed, 0);
    const displayName = buildDisplayName(profile, "Your Account");

    return jsonWithPrivateCache({
      success: true,
      data: {
        displayName,
        schoolName: schoolRecord?.name || "Your School",
        yearTerm: buildAcademicContextLabel([activeYear?.name, activeTerm?.name]),
        profile: {
          first_name: profile.first_name || "",
          last_name: profile.last_name || "",
          email: profile.email || "",
          phone: profile.phone || "",
          address: profile.address || "",
          avatar_url: profile.avatar_url || profile.photo_url || "",
          role: "TEACHER",
          status: profile.is_active === false ? "INACTIVE" : "ACTIVE",
        },
        firstLogin: {
          mustChangePassword: profile.must_change_password === true,
          temporaryPasswordIssuedAt: profile.temporary_password_issued_at || null,
        },
        teacher: {
          employeeId: teacherRecord?.employee_id || teacherRecord?.employee_number || null,
          department: teacherRecord?.department || null,
          specialization:
            teacherRecord?.specialization || joinNames(assignedSubjects.map((subject) => subject.name)),
          hireDate: teacherRecord?.hire_date || null,
          tenure: buildTeacherTenure(teacherRecord?.hire_date || null),
          assignedClasses,
          assignedSubjects,
          supervisedClasses: compactSupervisedClasses,
          pendingRollCalls: pending,
        },
        stats: {
          lessons: lessonSessionKeys.size,
          students: studentCount,
          completed,
          pending,
        },
        workload: {
          unreadMessages: unreadSummary.messages,
          unreadNotifications: unreadSummary.notifications,
          pendingGrades,
          draftResults,
          upcomingEvents,
        },
      },
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Failed to load teacher bootstrap") },
      { status: 500 }
    );
  }
}

async function loadProfile(profileId: string, schoolId: string): Promise<LoadedTeacherProfile> {
  const selectAttempts = [
    "id, first_name, last_name, email, phone, address, avatar_url, photo_url, is_active, must_change_password, temporary_password_issued_at",
    "id, first_name, last_name, email, phone, address, avatar_url, is_active, must_change_password, temporary_password_issued_at",
    "id, first_name, last_name, email, phone, address, avatar_url, is_active, must_change_password",
    "id, first_name, last_name, email, phone, address, avatar_url, is_active",
  ];

  for (const selectClause of selectAttempts) {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select(selectClause)
      .eq("id", profileId)
      .eq("school_id", schoolId)
      .maybeSingle();

    if (!error) {
      return data as LoadedTeacherProfile;
    }

    if (!isMissingColumnError(error)) {
      throw error;
    }
  }

  return null;
}

async function loadTeacherRecord(profileId: string, schoolId: string): Promise<LoadedTeacherRecord> {
  const selectAttempts = [
    "id, profile_id, employee_id, employee_number, department, specialization, hire_date",
    "id, profile_id, employee_number, department, specialization, hire_date",
    "id, profile_id, department, specialization, hire_date",
  ];

  for (const selectClause of selectAttempts) {
    const { data, error } = await supabaseAdmin
      .from("teachers")
      .select(selectClause)
      .eq("school_id", schoolId)
      .or(`profile_id.eq.${profileId},id.eq.${profileId}`)
      .limit(1);

    if (!error) {
      return (Array.isArray(data) ? data[0] || null : data || null) as LoadedTeacherRecord;
    }

    if (!isMissingColumnError(error)) {
      return null;
    }
  }

  return null;
}

async function loadSchoolRecord(schoolId: string): Promise<NamedRecord> {
  const { data, error } = await supabaseAdmin
    .from("schools")
    .select("name")
    .eq("id", schoolId)
    .maybeSingle();

  if (error) return null;
  return data as NamedRecord;
}

async function loadActiveAcademicYear(schoolId: string): Promise<NamedRecord> {
  const { data, error } = await supabaseAdmin
    .from("academic_years")
    .select("name")
    .eq("school_id", schoolId)
    .eq("is_active", true)
    .maybeSingle();

  if (error) return null;
  return data as NamedRecord;
}

async function loadActiveTerm(schoolId: string): Promise<NamedRecord> {
  const { data, error } = await supabaseAdmin
    .from("terms")
    .select("name")
    .eq("school_id", schoolId)
    .eq("is_active", true)
    .maybeSingle();

  if (error) return null;
  return data as NamedRecord;
}

async function loadTeacherSpecializationRows(
  schoolId: string,
  profileId: string
): Promise<TeacherSpecializationRow[]> {
  const { data, error } = await supabaseAdmin
    .from("teacher_subject_specializations")
    .select("subject_id")
    .eq("school_id", schoolId)
    .eq("teacher_profile_id", profileId);

  if (error) return [];
  return (data || []) as TeacherSpecializationRow[];
}

async function loadTeacherClassSubjectAssignments(
  schoolId: string,
  profileId: string
): Promise<TeacherAssignmentRow[]> {
  const { data, error } = await supabaseAdmin
    .from("teacher_class_subject_assignments")
    .select("class_id, subject_id")
    .eq("school_id", schoolId)
    .eq("teacher_profile_id", profileId);

  if (error) return [];
  return (data || []) as TeacherAssignmentRow[];
}

async function loadSupervisedClasses(
  schoolId: string,
  teacherIds: string[]
): Promise<SupervisedClassRow[]> {
  if (teacherIds.length === 0) {
    return [];
  }

  const { data, error } = await supabaseAdmin
    .from("classes")
    .select("id, name, grade_level, supervisor_id")
    .eq("school_id", schoolId)
    .in("supervisor_id", teacherIds)
    .order("name", { ascending: true });

  if (error) return [];
  return (data || []) as SupervisedClassRow[];
}

async function fetchLessonsByTeacherIds(input: {
  schoolId: string;
  dayOfWeek: number;
  teacherIds: string[];
}): Promise<LessonRow[]> {
  if (input.teacherIds.length === 0) {
    return [];
  }

  const { data, error } = await supabaseAdmin
    .from("lessons")
    .select("id, class_id, teacher_id, subject_id, day_of_week, start_time, title")
    .eq("school_id", input.schoolId)
    .eq("day_of_week", input.dayOfWeek)
    .in("teacher_id", input.teacherIds)
    .order("start_time", { ascending: true });

  if (error) return [];
  return (data || []) as LessonRow[];
}

async function fetchLessonsByClassIds(input: {
  schoolId: string;
  dayOfWeek: number;
  classIds: string[];
}): Promise<LessonRow[]> {
  if (input.classIds.length === 0) {
    return [];
  }

  const { data, error } = await supabaseAdmin
    .from("lessons")
    .select("id, class_id, teacher_id, subject_id, day_of_week, start_time, title")
    .eq("school_id", input.schoolId)
    .eq("day_of_week", input.dayOfWeek)
    .in("class_id", input.classIds)
    .order("start_time", { ascending: true });

  if (error) return [];
  return (data || []) as LessonRow[];
}

function dedupeLessonsById(rows: any[]) {
  const seen = new Set<string>();
  return rows.filter((row) => {
    const id = String(row?.id || "").trim();
    if (!id || seen.has(id)) {
      return false;
    }

    seen.add(id);
    return true;
  });
}

async function countStudentsByClassIds(schoolId: string, classIds: string[]) {
  if (classIds.length === 0) {
    return 0;
  }

  const { count, error } = await supabaseAdmin
    .from("students")
    .select("id", { count: "exact", head: true })
    .eq("school_id", schoolId)
    .in("class_id", classIds);

  if (error) return 0;
  return count || 0;
}

async function loadAttendanceRows(
  schoolId: string,
  classIds: string[],
  date: string
): Promise<AttendanceRow[]> {
  if (classIds.length === 0) {
    return [];
  }

  const { data, error } = await supabaseAdmin
    .from("attendance")
    .select("class_id, session_name, session_time")
    .eq("school_id", schoolId)
    .eq("date", date)
    .in("class_id", classIds);

  if (error) return [];
  return (data || []) as AttendanceRow[];
}

async function loadClassMap(schoolId: string, classIds: string[]) {
  if (classIds.length === 0) {
    return new Map<string, any>();
  }

  const { data, error } = await supabaseAdmin
    .from("classes")
    .select("id, name, grade_level, grades(name, level)")
    .eq("school_id", schoolId)
    .in("id", classIds);

  if (error) {
    const fallback = await supabaseAdmin
      .from("classes")
      .select("id, name, grade_level")
      .eq("school_id", schoolId)
      .in("id", classIds);

    if (fallback.error) {
      return new Map<string, any>();
    }

    return new Map((fallback.data || []).map((row: any) => [String(row.id), row]));
  }

  return new Map((data || []).map((row: any) => [String(row.id), row]));
}

async function loadSubjectMap(schoolId: string, subjectIds: string[]) {
  if (subjectIds.length === 0) {
    return new Map<string, any>();
  }

  const { data, error } = await supabaseAdmin
    .from("subjects")
    .select("id, name, code")
    .eq("school_id", schoolId)
    .in("id", subjectIds);

  if (error) return new Map<string, any>();
  return new Map((data || []).map((row: any) => [String(row.id), row]));
}

async function loadUnreadSummary(userId: string) {
  const [messagesResult, notifications] = await Promise.all([
    supabaseAdmin
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("recipient_id", userId)
      .eq("is_read", false),
    loadUnreadNotificationCount(userId),
  ]);

  if (messagesResult.error) {
    return { messages: 0, notifications };
  }

  return {
    messages: messagesResult.count || 0,
    notifications,
  };
}

async function loadUnreadNotificationCount(userId: string) {
  const queryAttempts = [
    () =>
      supabaseAdmin
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("is_read", false),
    () =>
      supabaseAdmin
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("recipient_id", userId)
        .eq("is_read", false),
  ];

  for (const runQuery of queryAttempts) {
    const result = await runQuery();
    if (!result.error) {
      return result.count || 0;
    }
  }

  return 0;
}

async function loadPendingGrades(
  schoolId: string,
  assignmentScope: { actorTeacherIds: string[]; allowedClassIds: string[] }
) {
  const assignmentIds = await loadAssignmentIds(schoolId, assignmentScope);
  if (assignmentIds.length === 0) {
    return 0;
  }

  const { data, error } = await supabaseAdmin
    .from("results")
    .select("id, score, grade")
    .eq("school_id", schoolId)
    .in("assignment_id", assignmentIds);

  if (error) return 0;

  return (data || []).filter((row: any) => row.score == null && !row.grade).length;
}

async function loadDraftResults(
  schoolId: string,
  assignmentScope: { actorTeacherIds: string[]; allowedClassIds: string[] }
) {
  const assignmentIds = await loadAssignmentIds(schoolId, assignmentScope);
  if (assignmentIds.length === 0) {
    return 0;
  }

  const { data, error } = await supabaseAdmin
    .from("results")
    .select("id, published_at")
    .eq("school_id", schoolId)
    .in("assignment_id", assignmentIds);

  if (error) return 0;

  return (data || []).filter((row: any) => !row.published_at).length;
}

async function loadAssignmentIds(
  schoolId: string,
  assignmentScope: { actorTeacherIds: string[]; allowedClassIds: string[] }
) {
  if (assignmentScope.actorTeacherIds.length === 0 || assignmentScope.allowedClassIds.length === 0) {
    return [];
  }

  const { data, error } = await supabaseAdmin
    .from("assignments")
    .select("id")
    .eq("school_id", schoolId)
    .in("teacher_id", assignmentScope.actorTeacherIds)
    .in("class_id", assignmentScope.allowedClassIds);

  if (error) return [];
  return Array.from(new Set((data || []).map((row: any) => String(row.id || "")).filter(Boolean)));
}

async function loadUpcomingEvents(schoolId: string, role: string) {
  const today = new Date().toISOString().slice(0, 10);
  const queryAttempts = [
    () =>
      supabaseAdmin
        .from("events")
        .select("id, target_role, event_date")
        .eq("school_id", schoolId)
        .gte("event_date", today),
    () =>
      supabaseAdmin
        .from("events")
        .select("id, event_date")
        .eq("school_id", schoolId)
        .gte("event_date", today),
  ];

  for (const runQuery of queryAttempts) {
    const result = await runQuery();
    if (!result.error) {
      return (result.data || []).filter((row: any) => isVisibleToRole(row.target_role, role)).length;
    }
  }

  return 0;
}

function dedupeNamedRows(rows: Array<{ id: string; name: string }>) {
  const seen = new Set<string>();

  return rows.filter((row) => {
    const id = String(row.id || "").trim();
    const name = String(row.name || "").trim();
    if (!id || !name || seen.has(id)) {
      return false;
    }

    seen.add(id);
    return true;
  });
}

function buildClassLabel(classRow: any) {
  const className = typeof classRow?.name === "string" ? classRow.name.trim() : "";
  const gradeName =
    typeof classRow?.grades?.name === "string"
      ? classRow.grades.name.trim()
      : buildGradeLevelLabel(classRow?.grade_level || classRow?.grades?.level);

  return [gradeName, className].filter(Boolean).join(" - ") || className || "Class";
}

function buildGradeLevelLabel(value: string | number | null | undefined) {
  const level = String(value || "").trim();
  return level ? `Grade ${level}` : "";
}

function joinNames(values: string[]) {
  const uniqueValues = Array.from(new Set(values.map((value) => String(value || "").trim()).filter(Boolean)));
  return uniqueValues.length > 0 ? uniqueValues.join(", ") : null;
}

function isMissingColumnError(error: { code?: string | null; message?: string | null } | null | undefined) {
  const code = String(error?.code || "").trim();
  const message = String(error?.message || "").toLowerCase();
  return code === "42703" || message.includes("does not exist");
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "../../../../lib/supabase";
import {
  applyRateLimit,
  getClientIp,
  parseJsonWithSchema,
  safeErrorMessage,
} from "../../../../lib/server-guards";
import { requireAdminContext } from "../../../../lib/server-auth";
import {
  buildCreatedAuthUserMetadata,
  buildCreatedProfilePayload,
  generateTemporaryPassword,
} from "../../../../lib/account-state";
import {
  buildUserWritePlan,
  normalizeProfileGender,
  toActiveFlag,
} from "../../../../lib/admin-user-directory";
import { loadTeacherAccountDetail } from "../../../../lib/teacher-account-detail";

const ROLE_VALUES = ["admin", "teacher", "student", "parent"] as const;

const teacherAssignmentSchema = z.object({
  classId: z.string().min(1),
  subjectId: z.string().min(1),
});

const createUserSchema = z.object({
  role: z.enum(ROLE_VALUES),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional().nullable(),
  profileExtras: z.record(z.string(), z.any()).optional(),
  parentExtras: z.record(z.string(), z.any()).optional(),
  specializationSubjectIds: z.array(z.string().min(1)).optional(),
  teachingAssignments: z.array(teacherAssignmentSchema).optional(),
  supervisedClassIds: z.array(z.string().min(1)).optional(),
});

const updateUserSchema = z.object({
  profileId: z.string().min(1),
  role: z.enum(["teacher", "student", "parent"]),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional().nullable(),
  gender: z.string().optional().nullable(),
  status: z.string().optional().nullable(),
  admissionNumber: z.string().optional().nullable(),
  classId: z.string().optional().nullable(),
  enrollmentDate: z.string().optional().nullable(),
  employeeId: z.string().optional().nullable(),
  department: z.string().optional().nullable(),
  specialization: z.string().optional().nullable(),
  hireDate: z.string().optional().nullable(),
  relationType: z.string().optional().nullable(),
  occupation: z.string().optional().nullable(),
  specializationSubjectIds: z.array(z.string().min(1)).optional(),
  teachingAssignments: z.array(teacherAssignmentSchema).optional(),
  supervisedClassIds: z.array(z.string().min(1)).optional(),
});

export async function GET(req: Request) {
  try {
    const access = await requireAdminContext(req);
    if (!access.ok) return access.response;
    const { schoolId } = access.context;
    if (!schoolId) {
      return NextResponse.json({ error: "No school linked to this admin account" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const profileId = String(searchParams.get("profileId") || "").trim();
    const requestedRole = normalizeRoleValue(searchParams.get("role"));

    if (!profileId) {
      return NextResponse.json({ error: "Profile ID is required" }, { status: 400 });
    }

    const profile = await loadPersonProfile(profileId, schoolId);
    if (!profile) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 });
    }

    const role = requestedRole || normalizeRoleValue(profile.role);
    const baseProfile = {
      profileId: profile.id,
      role,
      displayName: buildDisplayName(profile),
      email: profile.email || null,
      avatarUrl: profile.avatar_url || profile.photo_url || null,
      status: profile.is_active === false ? "INACTIVE" : "ACTIVE",
      updatedAt: profile.updated_at || profile.created_at || null,
    };

    if (role === "student") {
      return NextResponse.json({
        success: true,
        data: await buildStudentDetail(baseProfile, schoolId),
      });
    }

    if (role === "teacher") {
      return NextResponse.json({
        success: true,
        data: await buildTeacherDetail(baseProfile, schoolId),
      });
    }

    if (role === "parent") {
      return NextResponse.json({
        success: true,
        data: await buildParentDetail(baseProfile, schoolId),
      });
    }

    return NextResponse.json({ success: true, data: baseProfile });
  } catch (error: unknown) {
    return NextResponse.json({ error: safeErrorMessage(error, "Failed to load user details") }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const access = await requireAdminContext(req);
    if (!access.ok) return access.response;
    const { schoolId } = access.context;
    if (!schoolId) {
      return NextResponse.json({ error: "No school linked to this admin account" }, { status: 403 });
    }
    const ip = getClientIp(req);
    const rate = await applyRateLimit({
      key: `admin-users:${ip}`,
      limit: 250,
      windowMs: 60_000,
      failOpen: true,
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

    const body = await parseJsonWithSchema(req, createUserSchema);

    const role = String(body.role || "").trim().toLowerCase() as (typeof ROLE_VALUES)[number];
    const firstName = String(body.firstName || "").trim();
    const lastName = String(body.lastName || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const phone = body.phone ? String(body.phone).trim() : null;
    const teacherAssignments =
      role === "teacher"
        ? await validateTeacherAssignmentInput({
            schoolId,
            specializationSubjectIds: body.specializationSubjectIds,
            teachingAssignments: body.teachingAssignments,
            supervisedClassIds: body.supervisedClassIds,
          })
        : emptyTeacherAssignmentInput();
    const profileExtras = sanitizeProfileExtras(role, {
      ...(body.profileExtras || {}),
      specialization: teacherAssignments.specializationSummary || body.profileExtras?.specialization,
    });
    const parentExtras = sanitizeParentExtras(body.parentExtras);

    if (!ROLE_VALUES.includes(role) || !firstName || !lastName || !email) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const tempPassword = generateTemporaryPassword();

    const createAuth = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: buildCreatedAuthUserMetadata({
        firstName,
        lastName,
        role,
      }),
    });

    if (createAuth.error || !createAuth.data.user) {
      throw new Error(createAuth.error?.message || "Failed to create auth user");
    }

    const authUserId = createAuth.data.user.id;

    const profilePayload = buildCreatedProfilePayload({
      authUserId,
      schoolId,
      role,
      firstName,
      lastName,
      email,
      phone,
      profileExtras,
    });

    try {
      await safeInsert("profiles", profilePayload);
    } catch (profileErr) {
      await supabaseAdmin.auth.admin.deleteUser(authUserId);
      throw profileErr;
    }

    if (role === "parent") {
      const parentPayload: Record<string, any> = {
        profile_id: authUserId,
        school_id: schoolId,
        phone,
        ...parentExtras,
      };
      await safeInsertIfTableExists("parents", parentPayload);
    }

    if (role === "teacher") {
      await safeInsertIfTableExists("teachers", {
        profile_id: authUserId,
        school_id: schoolId,
        employee_number: profileExtras.employee_id || null,
        employee_id: profileExtras.employee_id || null,
        department: profileExtras.department || null,
        specialization: teacherAssignments.specializationSummary || profileExtras.specialization || null,
        hire_date: profileExtras.hire_date || null,
        phone,
        is_active: profileExtras.is_active ?? true,
      });
      await syncTeacherSpecializationRows({
        schoolId,
        teacherProfileId: authUserId,
        subjectIds: teacherAssignments.specializationSubjectIds,
      });
      await syncTeacherClassSubjectAssignments({
        schoolId,
        teacherProfileId: authUserId,
        teachingAssignments: teacherAssignments.teachingAssignments,
      });
      await syncTeacherSupervisedClasses({
        schoolId,
        teacherProfileId: authUserId,
        supervisedClassIds: teacherAssignments.supervisedClassIds,
      });
    }

    if (role === "student") {
      await safeInsertIfTableExists("students", {
        profile_id: authUserId,
        school_id: schoolId,
        admission_number: profileExtras.admission_number || null,
        student_number: profileExtras.admission_number || null,
        class_id: profileExtras.class_id || null,
        enrollment_date: profileExtras.enrollment_date || null,
        is_active: profileExtras.is_active ?? true,
      });
    }

    return NextResponse.json({
      success: true,
      userId: authUserId,
      email,
      temporaryPassword: tempPassword,
    });
  } catch (error: unknown) {
    console.error("Admin users POST error", error);
    return NextResponse.json({ error: safeErrorMessage(error, "Failed to create user") }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const access = await requireAdminContext(req);
    if (!access.ok) return access.response;
    const { schoolId } = access.context;
    if (!schoolId) {
      return NextResponse.json({ error: "No school linked to this admin account" }, { status: 403 });
    }
    const ip = getClientIp(req);
    const rate = await applyRateLimit({
      key: `admin-users-update:${ip}`,
      limit: 30,
      windowMs: 60_000,
      failOpen: true,
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

    const body = await parseJsonWithSchema(req, updateUserSchema);
    const role = body.role;
    const profile = await loadPersonProfile(body.profileId, schoolId);
    if (!profile) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 });
    }
    const shouldSyncTeacherAssignments =
      role === "teacher" &&
      (
        body.specializationSubjectIds !== undefined ||
        body.teachingAssignments !== undefined ||
        body.supervisedClassIds !== undefined
      );
    const teacherAssignments =
      shouldSyncTeacherAssignments
        ? await validateTeacherAssignmentInput({
            schoolId,
            specializationSubjectIds: body.specializationSubjectIds,
            teachingAssignments: body.teachingAssignments,
            supervisedClassIds: body.supervisedClassIds,
          })
        : null;

    const writePlan = buildUserWritePlan({
      role,
      schoolId,
      profileId: body.profileId,
      form: {
        first_name: body.firstName,
        last_name: body.lastName,
        email: body.email,
        phone: body.phone || "",
        gender: body.gender || "",
        status: body.status || "ACTIVE",
        admission_number: body.admissionNumber || "",
        class_id: body.classId || "",
        enrollment_date: body.enrollmentDate || "",
        employee_id: body.employeeId || "",
        department: body.department || "",
        specialization: teacherAssignments?.specializationSummary || body.specialization || "",
        hire_date: body.hireDate || "",
        relation_type: body.relationType || "",
        occupation: body.occupation || "",
      },
    });

    await safeUpdateScoped("profiles", body.profileId, schoolId, writePlan.profile);

    if (role === "student" && writePlan.roleRecord) {
      const existing = await loadStudentRecord(body.profileId, schoolId);
      if (existing?.id) {
        await safeUpdateScoped("students", existing.id, schoolId, writePlan.roleRecord);
      } else {
        await safeInsert("students", writePlan.roleRecord);
      }
    }

    if (role === "teacher" && writePlan.roleRecord) {
      const existing = await loadTeacherRecord(body.profileId, schoolId);
      if (existing?.id) {
        await safeUpdateScoped("teachers", existing.id, schoolId, writePlan.roleRecord);
      } else {
        await safeInsert("teachers", writePlan.roleRecord);
      }
      if (teacherAssignments) {
        await syncTeacherSpecializationRows({
          schoolId,
          teacherProfileId: body.profileId,
          subjectIds: teacherAssignments.specializationSubjectIds,
        });
        await syncTeacherClassSubjectAssignments({
          schoolId,
          teacherProfileId: body.profileId,
          teachingAssignments: teacherAssignments.teachingAssignments,
        });
        await syncTeacherSupervisedClasses({
          schoolId,
          teacherProfileId: body.profileId,
          supervisedClassIds: teacherAssignments.supervisedClassIds,
        });
      }
    }

    if (role === "parent" && writePlan.parentRecord) {
      const existing = await loadParentRecord(body.profileId, schoolId);
      if (existing?.id) {
        await safeUpdateScoped("parents", existing.id, schoolId, writePlan.parentRecord);
      } else {
        await safeInsert("parents", writePlan.parentRecord);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Admin users PUT error", error);
    return NextResponse.json({ error: safeErrorMessage(error, "Failed to update user") }, { status: 500 });
  }
}

async function safeInsertIfTableExists(table: string, payload: Record<string, any>) {
  const existsCheck = await supabaseAdmin.from(table).select("id").limit(1);
  if (existsCheck.error) return;
  await safeInsert(table, payload);
}

async function safeInsert(table: string, payload: Record<string, any>) {
  let working = { ...payload };
  for (let i = 0; i < 10; i++) {
    const { error } = await supabaseAdmin.from(table).insert(working);
    if (!error) return;

    const unknown = extractMissingColumn(error.message);
    if (!unknown || !(unknown in working)) throw error;
    delete working[unknown];
  }
  throw new Error(`Failed to insert into ${table}`);
}

function extractMissingColumn(message?: string): string | null {
  if (!message) return null;
  const m = message.match(/Could not find the '([^']+)' column/i);
  return m?.[1] || null;
}

function isMissingRelationError(error: { code?: string | null; message?: string | null } | null | undefined) {
  const code = String(error?.code || "");
  const message = String(error?.message || "").toLowerCase();
  return code === "42P01" || code === "PGRST205" || message.includes("does not exist");
}

function sanitizeProfileExtras(role: (typeof ROLE_VALUES)[number], extras?: Record<string, any>) {
  const source = extras || {};

  switch (role) {
    case "student":
      return compactRecord({
        admission_number: normalizeOptionalString(source.admission_number),
        class_id: normalizeOptionalString(source.class_id),
        enrollment_date: normalizeOptionalString(source.enrollment_date),
        gender: normalizeProfileGender(source.gender),
        is_active: toActiveFlag(source.status),
      });
    case "teacher":
      return compactRecord({
        employee_id: normalizeOptionalString(source.employee_id),
        department: normalizeOptionalString(source.department),
        specialization: normalizeOptionalString(source.specialization),
        hire_date: normalizeOptionalString(source.hire_date),
        gender: normalizeProfileGender(source.gender),
        is_active: toActiveFlag(source.status),
      });
    case "parent":
      return compactRecord({
        gender: normalizeProfileGender(source.gender),
        is_active: toActiveFlag(source.status),
      });
    default:
      return {};
  }
}

function sanitizeParentExtras(extras?: Record<string, any>) {
  const source = extras || {};

  return compactRecord({
    relation_type: normalizeOptionalString(source.relation_type),
    occupation: normalizeOptionalString(source.occupation),
  });
}

function normalizeOptionalString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function normalizeStatus(value: unknown) {
  const normalized = normalizeOptionalString(value)?.toUpperCase();
  if (!normalized) {
    return "ACTIVE";
  }

  return ["ACTIVE", "INACTIVE", "TRANSFERRED", "WITHDRAWN"].includes(normalized)
    ? normalized
    : "ACTIVE";
}

function compactRecord(record: Record<string, any>) {
  return Object.fromEntries(
    Object.entries(record).filter(([, value]) => value !== undefined)
  );
}

type TeacherAssignmentInput = {
  specializationSubjectIds: string[];
  teachingAssignments: Array<{ classId: string; subjectId: string }>;
  supervisedClassIds: string[];
  specializationSummary: string | null;
};

function emptyTeacherAssignmentInput(): TeacherAssignmentInput {
  return {
    specializationSubjectIds: [],
    teachingAssignments: [],
    supervisedClassIds: [],
    specializationSummary: null,
  };
}

async function validateTeacherAssignmentInput(input: {
  schoolId: string;
  specializationSubjectIds?: string[];
  teachingAssignments?: Array<{ classId: string; subjectId: string }>;
  supervisedClassIds?: string[];
}) {
  const specializationSubjectIds = dedupeStringIds(input.specializationSubjectIds);
  const supervisedClassIds = dedupeStringIds(input.supervisedClassIds);
  const teachingAssignments = dedupeTeachingAssignments(input.teachingAssignments);

  const classIds = Array.from(
    new Set([...supervisedClassIds, ...teachingAssignments.map((item) => item.classId)])
  );
  const subjectIds = Array.from(
    new Set([...specializationSubjectIds, ...teachingAssignments.map((item) => item.subjectId)])
  );

  const [classMap, subjectRows] = await Promise.all([
    getClassesById(input.schoolId, classIds),
    subjectIds.length > 0
      ? safeRows(
          supabaseAdmin
            .from("subjects")
            .select("id, name, school_id")
            .eq("school_id", input.schoolId)
            .in("id", subjectIds)
        )
      : Promise.resolve([]),
  ]);

  const subjectMap = new Map((subjectRows || []).map((row: any) => [String(row.id || ""), row]));

  for (const subjectId of subjectIds) {
    if (!subjectMap.has(subjectId)) {
      throw new Error("One or more selected subjects are not available in this school");
    }
  }

  for (const classId of classIds) {
    if (!classMap.has(classId)) {
      throw new Error("One or more selected classes are not available in this school");
    }
  }

  return {
    specializationSubjectIds,
    teachingAssignments,
    supervisedClassIds,
    specializationSummary: buildTeacherSpecializationSummary(specializationSubjectIds, subjectMap),
  };
}

function dedupeStringIds(values?: string[]) {
  const seen = new Set<string>();
  const nextValues: string[] = [];

  for (const value of values || []) {
    const normalized = String(value || "").trim();
    if (!normalized || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    nextValues.push(normalized);
  }

  return nextValues;
}

function dedupeTeachingAssignments(values?: Array<{ classId: string; subjectId: string }>) {
  const seen = new Set<string>();
  const nextValues: Array<{ classId: string; subjectId: string }> = [];

  for (const value of values || []) {
    const classId = String(value?.classId || "").trim();
    const subjectId = String(value?.subjectId || "").trim();
    if (!classId || !subjectId) {
      continue;
    }

    const key = `${classId}:${subjectId}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    nextValues.push({ classId, subjectId });
  }

  return nextValues;
}

function buildTeacherSpecializationSummary(subjectIds: string[], subjectMap: Map<string, any>) {
  const names = subjectIds
    .map((subjectId) => String(subjectMap.get(subjectId)?.name || "").trim())
    .filter(Boolean);

  return names.length > 0 ? names.join(", ") : null;
}

function normalizeRoleValue(value: unknown): (typeof ROLE_VALUES)[number] | "admin" | "teacher" | "student" | "parent" {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "student" || normalized === "teacher" || normalized === "parent" || normalized === "admin") {
    return normalized;
  }

  return "student";
}

async function loadPersonProfile(profileId: string, schoolId: string) {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("id", profileId)
    .eq("school_id", schoolId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function safeUpdateScoped(table: string, id: string, schoolId: string, payload: Record<string, any>) {
  let working = { ...payload };
  for (let i = 0; i < 10; i++) {
    const { error } = await supabaseAdmin.from(table).update(working).eq("id", id).eq("school_id", schoolId);
    if (!error) return;

    const unknown = extractMissingColumn(error.message);
    if (!unknown || !(unknown in working)) throw error;
    delete working[unknown];
  }
  throw new Error(`Failed to update ${table}`);
}

async function buildStudentDetail(baseProfile: Record<string, any>, schoolId: string) {
  const studentRecord = await loadStudentRecord(baseProfile.profileId, schoolId);
  const studentKeys = Array.from(new Set([baseProfile.profileId, studentRecord?.id].filter(Boolean)));
  const classRow = await getClassById(studentRecord?.class_id || baseProfile.class_id || null, schoolId);
  const guardians = await loadStudentGuardians({
    schoolId,
    profileId: baseProfile.profileId,
    studentRecordId: studentRecord?.id || null,
  });
  const [attendanceRows, paymentRows, resultRows] = await Promise.all([
    studentKeys.length > 0
      ? safeRows(
          supabaseAdmin
            .from("attendance")
            .select("status, remarks, date")
            .eq("school_id", schoolId)
            .in("student_id", studentKeys)
            .order("date", { ascending: false })
            .limit(200)
        )
      : Promise.resolve([]),
    studentKeys.length > 0
      ? safeRows(
          supabaseAdmin
            .from("payments")
            .select("amount, currency, status, paid_at, created_at")
            .eq("school_id", schoolId)
            .in("student_id", studentKeys)
            .order("created_at", { ascending: false })
            .limit(20)
        )
      : Promise.resolve([]),
    studentKeys.length > 0
      ? safeRows(
          supabaseAdmin
            .from("results")
            .select("*")
            .eq("school_id", schoolId)
            .in("student_id", studentKeys)
            .order("created_at", { ascending: false })
            .limit(12)
        )
      : Promise.resolve([]),
  ]);

  const subjectIds = Array.from(new Set((resultRows || []).map((row: any) => row.subject_id).filter(Boolean)));
  const subjects = subjectIds.length > 0
    ? await safeRows(
        supabaseAdmin
          .from("subjects")
          .select("id, name, code")
          .in("id", subjectIds)
      )
    : [];
  const subjectById = new Map((subjects || []).map((row: any) => [row.id, row]));

  return {
    ...baseProfile,
    admissionNumber: studentRecord?.admission_number || studentRecord?.student_number || baseProfile.admission_number || null,
    className: buildClassLabel(classRow),
    attendance: summarizeAttendanceRows(attendanceRows),
    finance: summarizePaymentRows(paymentRows),
    results: summarizeResultRows(resultRows, subjectById),
    guardians,
  };
}

async function buildTeacherDetail(baseProfile: Record<string, any>, schoolId: string) {
  return loadTeacherAccountDetail({
    schoolId,
    profileId: baseProfile.profileId,
    baseProfile,
  });
}

async function buildParentDetail(baseProfile: Record<string, any>, schoolId: string) {
  const parentRecord = await loadParentRecord(baseProfile.profileId, schoolId);
  const linkedChildren = await loadParentChildren({
    schoolId,
    profileId: baseProfile.profileId,
    parentRecordId: parentRecord?.id || null,
  });
  const unreadCount = await loadUnreadAlertCount(baseProfile.profileId, schoolId);

  return {
    ...baseProfile,
    relationType: parentRecord?.relation_type || null,
    occupation: parentRecord?.occupation || null,
    linkedChildren,
    alerts: {
      unreadCount,
    },
  };
}

async function loadStudentRecord(profileId: string, schoolId: string) {
  return safeMaybeSingle(
    supabaseAdmin
      .from("students")
      .select("*")
      .eq("school_id", schoolId)
      .or(`profile_id.eq.${profileId},id.eq.${profileId}`)
      .limit(1)
  );
}

async function loadTeacherRecord(profileId: string, schoolId: string) {
  return safeMaybeSingle(
    supabaseAdmin
      .from("teachers")
      .select("*")
      .eq("school_id", schoolId)
      .or(`profile_id.eq.${profileId},id.eq.${profileId}`)
      .limit(1)
  );
}

async function loadTeacherSpecializationRows(schoolId: string, profileId: string) {
  return safeRows(
    supabaseAdmin
      .from("teacher_subject_specializations")
      .select("subject_id")
      .eq("school_id", schoolId)
      .eq("teacher_profile_id", profileId)
  );
}

async function loadTeacherClassSubjectAssignments(schoolId: string, profileId: string) {
  return safeRows(
    supabaseAdmin
      .from("teacher_class_subject_assignments")
      .select("class_id, subject_id")
      .eq("school_id", schoolId)
      .eq("teacher_profile_id", profileId)
  );
}

async function syncTeacherSpecializationRows(input: {
  schoolId: string;
  teacherProfileId: string;
  subjectIds: string[];
}) {
  const existsCheck = await supabaseAdmin.from("teacher_subject_specializations").select("id").limit(1);
  if (existsCheck.error) {
    if (isMissingRelationError(existsCheck.error)) return;
    throw existsCheck.error;
  }

  const deleteResult = await supabaseAdmin
    .from("teacher_subject_specializations")
    .delete()
    .eq("school_id", input.schoolId)
    .eq("teacher_profile_id", input.teacherProfileId);

  if (deleteResult.error) throw deleteResult.error;

  if (input.subjectIds.length === 0) {
    return;
  }

  const insertResult = await supabaseAdmin.from("teacher_subject_specializations").insert(
    input.subjectIds.map((subjectId) => ({
      school_id: input.schoolId,
      teacher_profile_id: input.teacherProfileId,
      subject_id: subjectId,
    }))
  );

  if (insertResult.error) throw insertResult.error;
}

async function syncTeacherClassSubjectAssignments(input: {
  schoolId: string;
  teacherProfileId: string;
  teachingAssignments: Array<{ classId: string; subjectId: string }>;
}) {
  const existsCheck = await supabaseAdmin.from("teacher_class_subject_assignments").select("id").limit(1);
  if (existsCheck.error) {
    if (isMissingRelationError(existsCheck.error)) return;
    throw existsCheck.error;
  }

  const deleteResult = await supabaseAdmin
    .from("teacher_class_subject_assignments")
    .delete()
    .eq("school_id", input.schoolId)
    .eq("teacher_profile_id", input.teacherProfileId);

  if (deleteResult.error) throw deleteResult.error;

  if (input.teachingAssignments.length === 0) {
    return;
  }

  const insertResult = await supabaseAdmin.from("teacher_class_subject_assignments").insert(
    input.teachingAssignments.map((assignment) => ({
      school_id: input.schoolId,
      teacher_profile_id: input.teacherProfileId,
      class_id: assignment.classId,
      subject_id: assignment.subjectId,
    }))
  );

  if (insertResult.error) throw insertResult.error;
}

async function syncTeacherSupervisedClasses(input: {
  schoolId: string;
  teacherProfileId: string;
  supervisedClassIds: string[];
}) {
  const currentRows = await safeRows(
    supabaseAdmin
      .from("classes")
      .select("id")
      .eq("school_id", input.schoolId)
      .eq("supervisor_id", input.teacherProfileId)
  );
  const currentIds = currentRows.map((row: any) => String(row.id || "")).filter(Boolean);
  const nextIds = new Set(input.supervisedClassIds);
  const clearIds = currentIds.filter((classId) => !nextIds.has(classId));

  if (clearIds.length > 0) {
    const clearResult = await supabaseAdmin
      .from("classes")
      .update({ supervisor_id: null })
      .eq("school_id", input.schoolId)
      .in("id", clearIds);

    if (clearResult.error) throw clearResult.error;
  }

  if (input.supervisedClassIds.length > 0) {
    const assignResult = await supabaseAdmin
      .from("classes")
      .update({ supervisor_id: input.teacherProfileId })
      .eq("school_id", input.schoolId)
      .in("id", input.supervisedClassIds);

    if (assignResult.error) throw assignResult.error;
  }
}

async function loadParentRecord(profileId: string, schoolId: string) {
  return safeMaybeSingle(
    supabaseAdmin
      .from("parents")
      .select("*")
      .eq("school_id", schoolId)
      .or(`profile_id.eq.${profileId},id.eq.${profileId}`)
      .limit(1)
  );
}

async function loadStudentGuardians(input: {
  schoolId: string;
  profileId: string;
  studentRecordId: string | null;
}) {
  const linkTable = await resolveExistingTable(["parent_students", "parent_student_links"]);
  if (!linkTable) return [];

  const studentKeys = Array.from(new Set([input.profileId, input.studentRecordId].filter(Boolean)));
  if (studentKeys.length === 0) return [];

  const links = await safeRows(
    supabaseAdmin
      .from(linkTable)
      .select("parent_id, student_id, relationship")
      .in("student_id", studentKeys)
  );

  const parentTableRows = await safeRows(
    supabaseAdmin
      .from("parents")
      .select("id, profile_id, relation_type")
      .eq("school_id", input.schoolId)
  );
  const parentProfileIds = Array.from(
    new Set(
      (links || [])
        .map((link: any) => {
          const parentRow = (parentTableRows || []).find((row: any) => row.id === link.parent_id || row.profile_id === link.parent_id);
          return parentRow?.profile_id || link.parent_id || null;
        })
        .filter(Boolean)
    )
  );
  const profiles = parentProfileIds.length > 0
    ? await safeRows(
        supabaseAdmin
          .from("profiles")
          .select("id, first_name, last_name, email")
          .eq("school_id", input.schoolId)
          .in("id", parentProfileIds)
      )
    : [];
  const profileById = new Map((profiles || []).map((row: any) => [row.id, row]));

  return (links || []).map((link: any) => {
    const parentRow = (parentTableRows || []).find((row: any) => row.id === link.parent_id || row.profile_id === link.parent_id);
    const profileId = parentRow?.profile_id || link.parent_id || "";
    const parentProfile = profileById.get(profileId);

    return {
      id: profileId,
      name: buildDisplayName(parentProfile),
      email: parentProfile?.email || null,
      relationship: link.relationship || parentRow?.relation_type || null,
    };
  });
}

async function loadParentChildren(input: {
  schoolId: string;
  profileId: string;
  parentRecordId: string | null;
}) {
  const linkTable = await resolveExistingTable(["parent_students", "parent_student_links"]);
  if (!linkTable || !input.parentRecordId) return [];

  const links = await safeRows(
    supabaseAdmin
      .from(linkTable)
      .select("parent_id, student_id, relationship")
      .in("parent_id", [input.parentRecordId, input.profileId])
  );
  const studentIds = Array.from(new Set((links || []).map((row: any) => row.student_id).filter(Boolean)));
  const students = studentIds.length > 0
    ? await safeRows(
        supabaseAdmin
          .from("students")
          .select("id, profile_id, class_id, student_number")
          .eq("school_id", input.schoolId)
          .in("id", studentIds)
      )
    : [];
  const profileIds = Array.from(new Set((students || []).map((row: any) => row.profile_id).filter(Boolean)));
  const profiles = profileIds.length > 0
    ? await safeRows(
        supabaseAdmin
          .from("profiles")
          .select("id, first_name, last_name, email")
          .eq("school_id", input.schoolId)
          .in("id", profileIds)
      )
    : [];
  const classIds = Array.from(new Set((students || []).map((row: any) => row.class_id).filter(Boolean)));
  const classRows = await getClassesById(input.schoolId, classIds);
  const profileById = new Map((profiles || []).map((row: any) => [row.id, row]));

  return (students || []).map((row: any) => ({
    id: row.profile_id || row.id,
    name: buildDisplayName(profileById.get(row.profile_id || "")),
    className: buildClassLabel(classRows.get(row.class_id || "")),
    relationship:
      (links || []).find((link: any) => link.student_id === row.id || link.student_id === row.profile_id)?.relationship || null,
  }));
}

async function loadUnreadAlertCount(profileId: string, schoolId: string) {
  const { count } = await supabaseAdmin
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("school_id", schoolId)
    .eq("user_id", profileId)
    .eq("is_read", false);

  return count || 0;
}

async function loadStudentNamesByStudentIds(schoolId: string, studentIds: string[]) {
  if (studentIds.length === 0) {
    return new Map<string, string>();
  }

  const studentRows = await safeRows(
    supabaseAdmin
      .from("students")
      .select("id, profile_id")
      .eq("school_id", schoolId)
      .in("id", studentIds)
  );
  const profileIds = Array.from(new Set((studentRows || []).map((row: any) => row.profile_id).filter(Boolean)));
  const directProfiles = await safeRows(
    supabaseAdmin
      .from("profiles")
      .select("id, first_name, last_name, email")
      .eq("school_id", schoolId)
      .in("id", studentIds)
  );
  const profiles = profileIds.length > 0
    ? await safeRows(
        supabaseAdmin
          .from("profiles")
          .select("id, first_name, last_name, email")
          .eq("school_id", schoolId)
          .in("id", profileIds)
      )
    : [];
  const profileById = new Map(
    [...(profiles || []), ...(directProfiles || [])].map((row: any) => [row.id, row])
  );

  const names = new Map<string, string>();
  for (const row of studentRows || []) {
    names.set(row.id, buildDisplayName(profileById.get(row.profile_id || "")));
    if (row.profile_id) {
      names.set(row.profile_id, buildDisplayName(profileById.get(row.profile_id || "")));
    }
  }

  for (const profile of directProfiles || []) {
    names.set(profile.id, buildDisplayName(profile));
  }

  return names;
}

function summarizeAttendanceRows(rows: any[]) {
  const summary = { present: 0, absent: 0, late: 0, sick: 0 };

  for (const row of rows || []) {
    const status = String(row.status || "").trim().toUpperCase();
    if (status === "PRESENT") summary.present += 1;
    if (status === "ABSENT") summary.absent += 1;
    if (status === "LATE") summary.late += 1;
    if (status === "EXCUSED" || String(row.remarks || "").toLowerCase().includes("sick")) {
      summary.sick += 1;
    }
  }

  return summary;
}

function summarizePaymentRows(rows: any[]) {
  let balance = 0;
  let currency = "ZMW";
  const recentPayments = [];

  for (const row of rows || []) {
    const amount = Number(row.amount || 0);
    currency = row.currency || currency;
    const status = String(row.status || "").trim().toUpperCase();

    if (status === "COMPLETED") {
      recentPayments.push({
        amount,
        date: row.paid_at || row.created_at || null,
        status,
      });
    } else {
      balance += amount;
    }
  }

  return {
    balance,
    currency,
    recentPayments: recentPayments.slice(0, 4),
  };
}

function summarizeResultRows(rows: any[], subjectById: Map<string, any>) {
  const mappedRows = (rows || []).map((row: any) => ({
    subjectName: subjectById.get(row.subject_id || "")?.name || row.subject_name || "Subject",
    score: row.score ?? null,
    grade: row.grade || null,
    date: row.date || row.created_at || null,
  }));
  const numericScores = mappedRows
    .map((row) => Number(row.score))
    .filter((value) => Number.isFinite(value));

  return {
    average:
      numericScores.length > 0
        ? Math.round(numericScores.reduce((sum, value) => sum + value, 0) / numericScores.length)
        : null,
    rows: mappedRows.slice(0, 6),
  };
}

async function getClassById(classId: string | null, schoolId: string) {
  if (!classId) return null;
  const rows = await getClassesById(schoolId, [classId]);
  return rows.get(classId) || null;
}

async function getClassesById(schoolId: string | null, classIds: string[]) {
  if (!schoolId || classIds.length === 0) {
    return new Map<string, any>();
  }

  const withGrades = await supabaseAdmin
    .from("classes")
    .select("id, name, grade_level, grades(name, level)")
    .eq("school_id", schoolId)
    .in("id", classIds);

  if (!withGrades.error) {
    return new Map((withGrades.data || []).map((row: any) => [row.id, row]));
  }

  const withoutGrades = await supabaseAdmin
    .from("classes")
    .select("id, name, grade_level")
    .eq("school_id", schoolId)
    .in("id", classIds);

  if (!withoutGrades.error) {
    return new Map((withoutGrades.data || []).map((row: any) => [row.id, row]));
  }

  const bare = await supabaseAdmin
    .from("classes")
    .select("id, name")
    .eq("school_id", schoolId)
    .in("id", classIds);

  if (bare.error) throw bare.error;
  return new Map((bare.data || []).map((row: any) => [row.id, row]));
}

function buildClassLabel(classRow: any) {
  if (!classRow) return "Unassigned class";

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

function buildDisplayName(row: any) {
  return (
    [row?.first_name, row?.last_name].filter(Boolean).join(" ").trim() ||
    row?.name ||
    row?.email ||
    "User"
  );
}

async function safeRows(query: PromiseLike<{ data?: any[] | null; error?: any }>) {
  const result = await query;
  if (result?.error) return [];
  return result?.data || [];
}

async function safeMaybeSingle(query: PromiseLike<{ data?: any[] | any | null; error?: any }>) {
  const result = await query;
  if (result?.error) return null;
  if (Array.isArray(result?.data)) {
    return result.data[0] || null;
  }
  return result?.data || null;
}

async function resolveExistingTable(candidates: string[]) {
  for (const table of candidates) {
    const { error } = await supabaseAdmin.from(table).select("id").limit(1);
    if (!error) {
      return table;
    }
  }

  return null;
}

function dedupeRowsById<T extends { id?: string | null }>(rows: T[]) {
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

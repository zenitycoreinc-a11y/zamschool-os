"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getDisplayName } from "@/lib/profile-utils";
import { adminApiJson } from "@/lib/admin-browser-api";
import {
  mergeUserDirectoryRows,
} from "@/lib/admin-user-directory";
import {
  Eye,
  GraduationCap,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserCheck,
  Users,
  UsersRound,
  X,
} from "lucide-react";
import { toast } from "sonner";

type TabKey = "students" | "teachers" | "parents";
type GenericRow = Record<string, any>;

type UserForm = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  gender: string;
  status: string;
  admission_number: string;
  class_id: string;
  enrollment_date: string;
  employee_id: string;
  department: string;
  specialization: string;
  hire_date: string;
  relation_type: string;
  occupation: string;
  specialization_subject_ids: string[];
  teaching_assignments: TeacherAssignmentDraft[];
  supervised_class_ids: string[];
};

type ParentLinkTarget = { id: string; name: string; admission?: string };
type ClassOption = { id: string; label: string };
type SubjectOption = { id: string; label: string };
type TeacherAssignmentDraft = {
  id: string;
  classId: string;
  subjectId: string;
};
type TeacherInlineSubjectSection = "specializations" | "assignments" | null;
type TeacherInlineClassSection = "assignments" | "supervised" | null;
type FormNotice = {
  tone: "error" | "info";
  message: string;
};

const PAGE_SIZE = 10;
const ROLE_VALUES: Record<TabKey, string[]> = {
  students: ["student", "STUDENT"],
  teachers: ["teacher", "TEACHER"],
  parents: ["parent", "PARENT"],
};

const tabs: Array<{ key: TabKey; label: string; icon: any }> = [
  { key: "students", label: "Students", icon: GraduationCap },
  { key: "teachers", label: "Teachers", icon: Users },
  { key: "parents", label: "Parents", icon: UsersRound },
];

const MANAGED_ACCOUNT_ROLES = new Set(["student", "teacher", "parent"]);

const EMPTY_FORM: UserForm = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  gender: "",
  status: "ACTIVE",
  admission_number: "",
  class_id: "",
  enrollment_date: "",
  employee_id: "",
  department: "",
  specialization: "",
  hire_date: "",
  relation_type: "Mother",
  occupation: "",
  specialization_subject_ids: [],
  teaching_assignments: [],
  supervised_class_ids: [],
};

export default function AdminUsersPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<TabKey>("students");
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [classOptions, setClassOptions] = useState<ClassOption[]>([]);
  const [subjectOptions, setSubjectOptions] = useState<SubjectOption[]>([]);

  const [students, setStudents] = useState<GenericRow[]>([]);
  const [teachers, setTeachers] = useState<GenericRow[]>([]);
  const [parentsProfiles, setParentsProfiles] = useState<GenericRow[]>([]);
  const [parentsMetaMap, setParentsMetaMap] = useState<Record<string, GenericRow>>({});

  const [pageByTab, setPageByTab] = useState<Record<TabKey, number>>({
    students: 1,
    teachers: 1,
    parents: 1,
  });

  const [openForm, setOpenForm] = useState(false);
  const [editTarget, setEditTarget] = useState<GenericRow | null>(null);
  const [form, setForm] = useState<UserForm>(EMPTY_FORM);
  const [hydratingTeacherAssignments, setHydratingTeacherAssignments] = useState(false);
  const [formNotice, setFormNotice] = useState<FormNotice | null>(null);
  const [selectedSpecializationSubjectId, setSelectedSpecializationSubjectId] = useState("");
  const [selectedSupervisedClassId, setSelectedSupervisedClassId] = useState("");
  const [openCreateSubjectInlineSection, setOpenCreateSubjectInlineSection] = useState<TeacherInlineSubjectSection>(null);
  const [openCreateClassInlineSection, setOpenCreateClassInlineSection] = useState<TeacherInlineClassSection>(null);
  const [creatingSubjectInline, setCreatingSubjectInline] = useState(false);
  const [creatingClassInline, setCreatingClassInline] = useState(false);
  const [subjectInlineDraft, setSubjectInlineDraft] = useState({ name: "", code: "" });
  const [classInlineDraft, setClassInlineDraft] = useState({
    name: "",
    gradeLevel: "",
    capacity: "30",
  });

  const [parentsTable, setParentsTable] = useState<string | null>(null);
  const [parentStudentsTable, setParentStudentsTable] = useState<string | null>(null);

  const [openLinkModal, setOpenLinkModal] = useState(false);
  const [selectedParent, setSelectedParent] = useState<GenericRow | null>(null);
  const [linkSearch, setLinkSearch] = useState("");
  const [linking, setLinking] = useState(false);
  const [linkedStudentIds, setLinkedStudentIds] = useState<string[]>([]);
  const [newCredentials, setNewCredentials] = useState<{ email: string; password: string } | null>(null);
  const [detailTarget, setDetailTarget] = useState<GenericRow | null>(null);
  const [detailData, setDetailData] = useState<GenericRow | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [resettingPassword, setResettingPassword] = useState<string | null>(null);

  const classNameById = useMemo(
    () => Object.fromEntries(classOptions.map((option) => [option.id, option.label])),
    [classOptions]
  );
  const subjectNameById = useMemo(
    () => Object.fromEntries(subjectOptions.map((option) => [option.id, option.label])),
    [subjectOptions]
  );

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim().toLowerCase()), 250);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    void init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const currentRows = useMemo(() => {
    const rows = activeTab === "students" ? students : activeTab === "teachers" ? teachers : parentsProfiles;
    if (!debouncedSearch) return rows;

    return rows.filter((row) => {
      const haystack = [
        getDisplayName(row),
        row.email,
        row.phone,
        row.admission_number,
        classNameById[row.class_id],
        row.employee_id,
        row.department,
        row.specialization,
        row.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(debouncedSearch);
    });
  }, [activeTab, students, teachers, parentsProfiles, debouncedSearch, classNameById]);

  const paginatedRows = useMemo(() => {
    const page = pageByTab[activeTab] || 1;
    const start = (page - 1) * PAGE_SIZE;
    return currentRows.slice(start, start + PAGE_SIZE);
  }, [currentRows, pageByTab, activeTab]);

  const totalPages = Math.max(1, Math.ceil(currentRows.length / PAGE_SIZE));

  useEffect(() => {
    if ((pageByTab[activeTab] || 1) > totalPages) {
      setPageByTab((prev) => ({ ...prev, [activeTab]: totalPages }));
    }
  }, [activeTab, pageByTab, totalPages]);

  async function init() {
    setLoading(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("No active session");

      const { data: me, error: meErr } = await supabase
        .from("profiles")
        .select("school_id")
        .eq("id", auth.user.id)
        .maybeSingle();
      if (meErr) throw meErr;
      if (!me?.school_id) throw new Error("No school linked to this account");

      setSchoolId(me.school_id);

      const [resolvedParents, resolvedParentStudents] = await Promise.all([
        resolveTable(["parents"]),
        resolveTable(["parent_students", "parent_student_links"]),
      ]);
      setParentsTable(resolvedParents);
      setParentStudentsTable(resolvedParentStudents);

      const [nextClassOptions] = await Promise.all([fetchClassOptions(), fetchSubjectOptions()]);
      await fetchAll(me.school_id, resolvedParents, nextClassOptions);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  }

  async function fetchClassOptions() {
    const response = await fetch("/api/admin/classes", { cache: "no-store" });
    const body = await response.json();

    if (!response.ok) {
      throw new Error(body?.error || "Failed to load classes");
    }

    const options = toClassOptions(body?.data);
    setClassOptions(options);
    return options;
  }

  async function fetchSubjectOptions() {
    const body = await adminApiJson<{ data?: any[] }>("/api/admin/subjects");
    const options = Array.isArray(body?.data)
      ? body.data.flatMap((row) => {
          const id = typeof row?.id === "string" ? row.id : "";
          const name = typeof row?.name === "string" ? row.name.trim() : "";
          return id && name ? [{ id, label: name }] : [];
        })
      : [];

    setSubjectOptions(options);
    return options;
  }

  async function createSubjectInline() {
    const name = subjectInlineDraft.name.trim();
    const code = subjectInlineDraft.code.trim();
    if (!name) {
      setFormNotice({ tone: "error", message: "Subject name is required before you can create it." });
      toast.error("Subject name is required");
      return;
    }

    const existingOption = subjectOptions.find(
      (option) => option.label.trim().toLowerCase() === name.toLowerCase()
    );
    if (existingOption) {
      setForm((current) => ({
        ...current,
        specialization_subject_ids: current.specialization_subject_ids.includes(existingOption.id)
          ? current.specialization_subject_ids
          : [...current.specialization_subject_ids, existingOption.id],
      }));
      setSelectedSpecializationSubjectId(existingOption.id);
      setSubjectInlineDraft({ name: "", code: "" });
      setOpenCreateSubjectInlineSection(null);
      setFormNotice({
        tone: "info",
        message: `${existingOption.label} already exists, so it has been selected for this teacher.`,
      });
      toast.success("Existing subject selected");
      return;
    }

    setCreatingSubjectInline(true);
    const loadingToast = toast.loading("Creating subject...");

    try {
      const response = await adminApiJson<{ data?: any }>("/api/admin/subjects", {
        method: "POST",
        body: JSON.stringify({
          name,
          code: code || undefined,
        }),
      });
      const created = response?.data;
      const option =
        created && typeof created.id === "string" && typeof created.name === "string"
          ? { id: created.id, label: created.name.trim() }
          : null;

      if (!option) {
        throw new Error("Subject was created but no subject details were returned");
      }

      setSubjectOptions((current) => sortOptionList([...current, option]));
      setForm((current) => ({
        ...current,
        specialization_subject_ids: current.specialization_subject_ids.includes(option.id)
          ? current.specialization_subject_ids
          : [...current.specialization_subject_ids, option.id],
      }));
      setSelectedSpecializationSubjectId(option.id);
      setSubjectInlineDraft({ name: "", code: "" });
      setOpenCreateSubjectInlineSection(null);
      setFormNotice({
        tone: "info",
        message: `${option.label} was created and added to this teacher's subject specializations.`,
      });
      toast.success("Subject added", { id: loadingToast });
    } catch (err: any) {
      setFormNotice({ tone: "error", message: err?.message || "Failed to create subject" });
      toast.error(err?.message || "Failed to create subject", { id: loadingToast });
    } finally {
      setCreatingSubjectInline(false);
    }
  }

  async function createClassInline() {
    const name = classInlineDraft.name.trim();
    const gradeLevel = Number(classInlineDraft.gradeLevel);
    const capacity = Number(classInlineDraft.capacity || 30);

    if (!name) {
      setFormNotice({ tone: "error", message: "Class name is required before you can create it." });
      toast.error("Class name is required");
      return;
    }

    if (!Number.isInteger(gradeLevel) || gradeLevel < 1 || gradeLevel > 13) {
      setFormNotice({ tone: "error", message: "Choose a valid grade level before creating the class." });
      toast.error("Choose a valid grade level");
      return;
    }

    setCreatingClassInline(true);
    const loadingToast = toast.loading("Creating class...");

    try {
      const response = await adminApiJson<{ data?: any }>("/api/admin/classes", {
        method: "POST",
        body: JSON.stringify({
          name,
          gradeLevel,
          capacity: Number.isFinite(capacity) ? capacity : 30,
        }),
      });
      const createdOptions = toClassOptions(response?.data ? [response.data] : []);
      const option = createdOptions[0] || null;

      if (!option) {
        throw new Error("Class was created but no class details were returned");
      }

      setClassOptions((current) => sortOptionList([...current, option]));
      setSelectedSupervisedClassId(option.id);
      setClassInlineDraft({ name: "", gradeLevel: "", capacity: "30" });
      setOpenCreateClassInlineSection(null);
      setFormNotice({
        tone: "info",
        message: `${option.label} was created and is now available for teaching assignments and class-teacher roles.`,
      });
      toast.success("Class added", { id: loadingToast });
    } catch (err: any) {
      setFormNotice({ tone: "error", message: err?.message || "Failed to create class" });
      toast.error(err?.message || "Failed to create class", { id: loadingToast });
    } finally {
      setCreatingClassInline(false);
    }
  }

  async function fetchAll(sid: string, resolvedParentsTable?: string | null, nextClassOptions?: ClassOption[]) {
    const pTable = resolvedParentsTable ?? parentsTable;
    const [profilesRes, studentsTableRes, teachersTableRes, parentsRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("*")
        .eq("school_id", sid)
        .in("role", [...ROLE_VALUES.students, ...ROLE_VALUES.teachers, ...ROLE_VALUES.parents])
        .order("created_at", { ascending: false }),
      supabase.from("students").select("*").eq("school_id", sid),
      supabase.from("teachers").select("*").eq("school_id", sid),
      pTable ? supabase.from(pTable).select("*").eq("school_id", sid) : Promise.resolve({ data: [], error: null } as any),
    ]);

    const classNameLookup = Object.fromEntries((nextClassOptions || classOptions).map((option) => [option.id, option.label]));

    if (profilesRes.error) throw profilesRes.error;
    if (studentsTableRes.error) throw studentsTableRes.error;
    if (teachersTableRes.error) throw teachersTableRes.error;
    if (parentsRes.error) throw parentsRes.error;

    const merged = mergeUserDirectoryRows({
      profiles: profilesRes.data || [],
      students: studentsTableRes.data || [],
      teachers: teachersTableRes.data || [],
      parents: Array.isArray(parentsRes.data) ? parentsRes.data : [],
      classNameById: classNameLookup,
    });

    setStudents(merged.students);
    setTeachers(merged.teachers);
    setParentsProfiles(merged.parents);

    if (pTable && Array.isArray(parentsRes.data)) {
      const mapped: Record<string, GenericRow> = {};
      for (const row of parentsRes.data || []) {
        mapped[row.profile_id] = row;
      }
      setParentsMetaMap(mapped);
    } else {
      setParentsMetaMap({});
    }
  }

  function resetTeacherInlineSetupState() {
    setFormNotice(null);
    setSelectedSpecializationSubjectId("");
    setSelectedSupervisedClassId("");
    setOpenCreateSubjectInlineSection(null);
    setOpenCreateClassInlineSection(null);
    setCreatingSubjectInline(false);
    setCreatingClassInline(false);
    setSubjectInlineDraft({ name: "", code: "" });
    setClassInlineDraft({ name: "", gradeLevel: "", capacity: "30" });
  }

  function openCreate() {
    setEditTarget(null);
    setHydratingTeacherAssignments(false);
    resetTeacherInlineSetupState();
    setForm(EMPTY_FORM);
    setOpenForm(true);
  }

  async function openEdit(row: GenericRow) {
    setEditTarget(row);
    resetTeacherInlineSetupState();
    const parentMeta = parentsMetaMap[row.id] || {};
    const nextForm: UserForm = {
      first_name: row.first_name || "",
      last_name: row.last_name || "",
      email: row.email || "",
      phone: row.phone || "",
      gender: row.gender || "",
      status: row.status || "ACTIVE",
      admission_number: row.admission_number || "",
      class_id: row.class_id || findClassId(classOptions, row.class_name || row.class || ""),
      enrollment_date: row.enrollment_date || row.enrolled_at || "",
      employee_id: row.employee_id || "",
      department: row.department || "",
      specialization: row.specialization || "",
      hire_date: row.hire_date || row.hired_at || "",
      relation_type: parentMeta.relation_type || "Mother",
      occupation: parentMeta.occupation || row.occupation || "",
      specialization_subject_ids: [],
      teaching_assignments: [],
      supervised_class_ids: [],
    };
    setForm(nextForm);
    setOpenForm(true);

    if (activeTab !== "teachers") {
      return;
    }

    setHydratingTeacherAssignments(true);
    try {
      const body = await adminApiJson<{ data?: GenericRow }>(
        `/api/admin/users?profileId=${encodeURIComponent(row.id)}&role=teacher`
      );
      const teacherDetail = body?.data || {};

      setForm((current) => ({
        ...current,
        specialization: String(teacherDetail.specialization || current.specialization || ""),
        specialization_subject_ids: Array.isArray(teacherDetail.specializationSubjectIds)
          ? teacherDetail.specializationSubjectIds.filter((value: unknown): value is string => typeof value === "string" && value.length > 0)
          : [],
        teaching_assignments: Array.isArray(teacherDetail.teachingAssignments)
          ? teacherDetail.teachingAssignments.flatMap((assignment: any, index: number) => {
              const classId = String(assignment?.classId || "").trim();
              const subjectId = String(assignment?.subjectId || "").trim();
              if (!classId || !subjectId) {
                return [];
              }

              return [{
                id: buildTeacherAssignmentDraftId(index),
                classId,
                subjectId,
              }];
            })
          : [],
        supervised_class_ids: Array.isArray(teacherDetail.supervisedClassIds)
          ? teacherDetail.supervisedClassIds.filter((value: unknown): value is string => typeof value === "string" && value.length > 0)
          : [],
      }));
    } catch (err: any) {
      toast.error(err?.message || "Failed to load teacher assignments");
    } finally {
      setHydratingTeacherAssignments(false);
    }
  }

  async function handleSave() {
    if (!schoolId) return;
    setFormNotice(null);
    if (!form.first_name.trim() || !form.last_name.trim() || !form.email.trim()) {
      setFormNotice({ tone: "error", message: "First name, last name, and email are required before you can save this user." });
      toast.error("First name, last name, and email are required");
      return;
    }

    if (activeTab === "students" && !form.admission_number.trim()) {
      setFormNotice({ tone: "error", message: "Student number is required before you can create this student." });
      toast.error("Student number is required");
      return;
    }

    if (activeTab === "teachers" && !form.employee_id.trim()) {
      setFormNotice({ tone: "error", message: "Employee number is required before you can create this teacher." });
      toast.error("Employee number is required");
      return;
    }
    if (
      activeTab === "teachers" &&
      form.teaching_assignments.some(
        (assignment) => !String(assignment.classId || "").trim() || !String(assignment.subjectId || "").trim()
      )
    ) {
      setFormNotice({
        tone: "error",
        message: "Every teaching assignment needs both a class and a subject before the teacher can be saved.",
      });
      toast.error("Each teaching assignment needs both a class and a subject");
      return;
    }

    const normalizedEmail = form.email.trim().toLowerCase();
    const duplicateEmail = [...students, ...teachers, ...parentsProfiles].some((row) => {
      if (row.id === editTarget?.id) {
        return false;
      }
      return normalizeComparableValue(row.email) === normalizedEmail;
    });
    if (duplicateEmail) {
      const message = "This email address is already linked to another user. Use a different email before creating the account.";
      setFormNotice({ tone: "error", message });
      toast.error(message);
      return;
    }

    if (activeTab === "teachers") {
      const normalizedEmployeeId = normalizeComparableValue(form.employee_id);
      const duplicateEmployeeId = teachers.some((row) => {
        if (row.id === editTarget?.id) {
          return false;
        }
        return (
          normalizeComparableValue(row.employee_id) === normalizedEmployeeId ||
          normalizeComparableValue(row.employee_number) === normalizedEmployeeId
        );
      });

      if (duplicateEmployeeId) {
        const message = "This employee number is already assigned to another teacher. Use a different employee number.";
        setFormNotice({ tone: "error", message });
        toast.error(message);
        return;
      }
    }

    const roleValue = activeTab === "students" ? "student" : activeTab === "teachers" ? "teacher" : "parent";
    const teacherSpecializationSummary =
      activeTab === "teachers"
        ? buildSelectedSubjectSummary(form.specialization_subject_ids, subjectNameById)
        : null;
    const teacherAssignmentsPayload =
      activeTab === "teachers"
        ? dedupeTeacherAssignments(form.teaching_assignments)
        : [];

    setSaving(true);
    const t = toast.loading(editTarget ? "Updating user..." : "Creating user...");

    try {
      if (editTarget) {
        await adminApiJson("/api/admin/users", {
          method: "PUT",
          body: JSON.stringify({
            profileId: editTarget.id,
            role: roleValue,
            firstName: form.first_name.trim(),
            lastName: form.last_name.trim(),
            email: form.email.trim().toLowerCase(),
            phone: form.phone.trim() || null,
            gender: form.gender || null,
            status: form.status || "ACTIVE",
            admissionNumber: form.admission_number.trim() || null,
            classId: form.class_id || null,
            enrollmentDate: form.enrollment_date || null,
            employeeId: form.employee_id.trim() || null,
            department: form.department.trim() || null,
            specialization: teacherSpecializationSummary || form.specialization.trim() || null,
            hireDate: form.hire_date || null,
            relationType: form.relation_type || null,
            occupation: form.occupation.trim() || null,
            specializationSubjectIds: form.specialization_subject_ids,
            teachingAssignments: teacherAssignmentsPayload,
            supervisedClassIds: form.supervised_class_ids,
          }),
        });
      } else {
        const createBody = await adminApiJson<{ temporaryPassword?: string }>("/api/admin/users", {
          method: "POST",
          body: JSON.stringify({
            role: roleValue,
            firstName: form.first_name.trim(),
            lastName: form.last_name.trim(),
            email: form.email.trim().toLowerCase(),
            phone: form.phone.trim() || null,
            profileExtras:
              activeTab === "students"
                ? {
                    admission_number: form.admission_number.trim(),
                    class_id: form.class_id || null,
                    enrollment_date: form.enrollment_date || null,
                      gender: form.gender || null,
                      status: form.status || "ACTIVE",
                    }
                  : activeTab === "teachers"
                  ? {
                      employee_id: form.employee_id.trim(),
                      department: form.department.trim() || null,
                      specialization: teacherSpecializationSummary || form.specialization.trim() || null,
                      hire_date: form.hire_date || null,
                      gender: form.gender || null,
                      status: form.status || "ACTIVE",
                    }
                  : {
                      gender: form.gender || null,
                      status: form.status || "ACTIVE",
                    },
            parentExtras:
              activeTab === "parents"
                ? {
                    relation_type: form.relation_type || null,
                    occupation: form.occupation.trim() || null,
                  }
                : undefined,
            specializationSubjectIds: activeTab === "teachers" ? form.specialization_subject_ids : undefined,
            teachingAssignments: activeTab === "teachers" ? teacherAssignmentsPayload : undefined,
            supervisedClassIds: activeTab === "teachers" ? form.supervised_class_ids : undefined,
          }),
        });

        if (createBody?.temporaryPassword) {
          setNewCredentials({
            email: form.email.trim().toLowerCase(),
            password: String(createBody.temporaryPassword),
          });
        }
      }

      await fetchAll(schoolId, parentsTable);
      setOpenForm(false);
      setEditTarget(null);
      setForm(EMPTY_FORM);
      setFormNotice(null);
      toast.success(editTarget ? "User updated" : "User created", { id: t });
    } catch (err: any) {
      setFormNotice({ tone: "error", message: err?.message || "Failed to save user" });
      toast.error(err?.message || "Failed to save user", { id: t });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(row: GenericRow) {
    if (!schoolId) return;
    const ok = window.confirm(`Delete ${getDisplayName(row)}? This action cannot be undone.`);
    if (!ok) return;

    setDeleting(row.id);
    const t = toast.loading("Deleting user...");
    try {
      if (activeTab === "parents" && parentsTable) {
        const parentMeta = parentsMetaMap[row.id];
        if (parentMeta?.id && parentStudentsTable) {
          await supabase.from(parentStudentsTable).delete().eq("parent_id", parentMeta.id);
        }
        if (parentMeta?.id) {
          await supabase.from(parentsTable).delete().eq("id", parentMeta.id);
        }
      }

      const { error } = await supabase.from("profiles").delete().eq("id", row.id);
      if (error) throw error;

      await fetchAll(schoolId, parentsTable);
      toast.success("User deleted", { id: t });
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete user", { id: t });
    } finally {
      setDeleting(null);
    }
  }

  async function openParentLinkManager(row: GenericRow) {
    setSelectedParent(row);
    setLinkSearch("");
    setOpenLinkModal(true);
    await refreshLinkedStudentIds(row.id);
  }

  async function toggleLinkStudent(studentId: string, shouldLink: boolean) {
    if (!selectedParent) return;

    setLinking(true);
    const t = toast.loading(shouldLink ? "Linking student..." : "Removing link...");

    try {
      await adminApiJson("/api/admin/relationships", {
        method: "POST",
        body: JSON.stringify({
          action: shouldLink ? "link_parent_student" : "unlink_parent_student",
          parentProfileId: selectedParent.id,
          studentProfileId: studentId,
        }),
      });

      setLinkedStudentIds((prev) =>
        shouldLink
          ? Array.from(new Set([...prev, studentId]))
          : prev.filter((id) => id !== studentId)
      );

      toast.success(shouldLink ? "Student linked" : "Link removed", { id: t });
    } catch (err: any) {
      toast.error(err?.message || "Failed to update link", { id: t });
    } finally {
      setLinking(false);
    }
  }

  async function refreshLinkedStudentIds(parentProfileId: string) {
    try {
      const response = await adminApiJson<{ data?: { parents?: GenericRow[] } }>("/api/admin/relationships");
      const parents = Array.isArray(response?.data?.parents) ? response.data.parents : [];
      const matchedParent = parents.find((parent) => parent.profileId === parentProfileId);
      const nextLinkedIds = Array.isArray(matchedParent?.linkedStudentProfileIds)
        ? matchedParent.linkedStudentProfileIds.filter((value): value is string => typeof value === "string" && value.length > 0)
        : [];

      setLinkedStudentIds(nextLinkedIds);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load linked students");
      setLinkedStudentIds([]);
    }
  }

  async function openDetail(row: GenericRow) {
    const role = activeTab === "students" ? "student" : activeTab === "teachers" ? "teacher" : "parent";
    setDetailTarget(row);
    setDetailData(null);
    setDetailError(null);
    setDetailLoading(true);

    try {
      const response = await fetch(
        `/api/admin/users?profileId=${encodeURIComponent(row.id)}&role=${encodeURIComponent(role)}`,
        { cache: "no-store" }
      );
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body?.error || "Failed to load user details");
      }
      setDetailData(body?.data || null);
    } catch (err: any) {
      setDetailError(err?.message || "Failed to load user details");
    } finally {
      setDetailLoading(false);
    }
  }

  const linkCandidates = useMemo<ParentLinkTarget[]>(() => {
    const all = students.map((s) => ({
      id: s.id,
      name: getDisplayName(s),
      admission: s.admission_number,
    }));

    const q = linkSearch.trim().toLowerCase();
    if (!q) return all;

    return all.filter((s) => `${s.name} ${s.admission || ""}`.toLowerCase().includes(q));
  }, [students, linkSearch]);

  const detailRole = String(
    detailData?.role ||
      detailTarget?.role ||
      (activeTab === "students" ? "student" : activeTab === "teachers" ? "teacher" : "parent")
  )
    .trim()
    .toLowerCase();
  const canResetTemporaryPassword = Boolean(detailTarget && MANAGED_ACCOUNT_ROLES.has(detailRole));

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 flex items-center justify-center gap-3">
        <Loader2 className="w-5 h-5 animate-spin text-sky-600" />
        <span className="text-sm text-slate-500">Loading users...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Users</h1>
          <p className="text-slate-500 mt-1">Unified management for students, teachers, and parents.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPageByTab((prev) => ({ ...prev, [activeTab]: 1 }));
              }}
              placeholder="Search users"
              className="w-64 rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-200"
            />
          </div>

          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-xl bg-sky-500 text-white px-4 py-2 text-sm font-semibold hover:bg-sky-400"
          >
            <Plus className="w-4 h-4" /> Add {activeTab === "students" ? "Student" : activeTab === "teachers" ? "Teacher" : "Parent"}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-2 w-full md:w-fit">
        <div className="grid grid-cols-3 gap-1">
          {tabs.map((tab) => {
            const active = tab.key === activeTab;
            return (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveTab(tab.key);
                  setSearch("");
                }}
                className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  active ? "bg-sky-500 text-white shadow-md shadow-sky-500/30" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Name</th>
                <th className="text-left px-4 py-3 font-semibold">Email</th>
                <th className="text-left px-4 py-3 font-semibold">Phone</th>
                {activeTab === "students" ? <th className="text-left px-4 py-3 font-semibold">Student No</th> : null}
                {activeTab === "students" ? <th className="text-left px-4 py-3 font-semibold">Class</th> : null}
                {activeTab === "teachers" ? <th className="text-left px-4 py-3 font-semibold">Employee No</th> : null}
                {activeTab === "teachers" ? <th className="text-left px-4 py-3 font-semibold">Department</th> : null}
                {activeTab === "parents" ? <th className="text-left px-4 py-3 font-semibold">Relation</th> : null}
                {activeTab === "parents" ? <th className="text-left px-4 py-3 font-semibold">Occupation</th> : null}
                <th className="text-left px-4 py-3 font-semibold">Status</th>
                <th className="text-right px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>

            <tbody>
              {paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={activeTab === "students" || activeTab === "teachers" || activeTab === "parents" ? 9 : 7} className="px-4 py-12 text-center text-slate-500">
                    No users found.
                  </td>
                </tr>
              ) : (
                paginatedRows.map((row) => {
                  const parentMeta = parentsMetaMap[row.id] || {};
                  return (
                    <tr key={row.id} className="border-t border-slate-100">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800">{getDisplayName(row)}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{row.email || "-"}</td>
                      <td className="px-4 py-3 text-slate-600">{row.phone || "-"}</td>
                      {activeTab === "students" ? <td className="px-4 py-3 text-slate-600">{row.admission_number || "-"}</td> : null}
                      {activeTab === "students" ? (
                        <td className="px-4 py-3 text-slate-600">{classNameById[row.class_id] || row.class_name || row.class || "-"}</td>
                      ) : null}
                      {activeTab === "teachers" ? <td className="px-4 py-3 text-slate-600">{row.employee_id || "-"}</td> : null}
                      {activeTab === "teachers" ? <td className="px-4 py-3 text-slate-600">{row.department || "-"}</td> : null}
                      {activeTab === "parents" ? <td className="px-4 py-3 text-slate-600">{parentMeta.relation_type || "-"}</td> : null}
                      {activeTab === "parents" ? <td className="px-4 py-3 text-slate-600">{parentMeta.occupation || row.occupation || "-"}</td> : null}
                      <td className="px-4 py-3">
                        <button
                          onClick={() => quickToggleStatus(row)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                            String(row.status || "ACTIVE").toUpperCase() === "ACTIVE"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          {String(row.status || "ACTIVE").toUpperCase()}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end items-center gap-2">
                          {activeTab === "parents" && parentsTable && parentStudentsTable ? (
                            <button
                              onClick={() => openParentLinkManager(row)}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                            >
                              <Users className="w-3.5 h-3.5" /> Link Students
                            </button>
                          ) : null}
                          <button
                            onClick={() => openDetail(row)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                          >
                            <Eye className="w-3.5 h-3.5" /> View Details
                          </button>
                          <button onClick={() => openEdit(row)} className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 grid place-items-center hover:bg-slate-200">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(row)}
                            disabled={deleting === row.id}
                            className="w-8 h-8 rounded-lg bg-red-50 text-red-600 grid place-items-center hover:bg-red-100 disabled:opacity-60"
                          >
                            {deleting === row.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
          <p className="text-xs text-slate-500">
            Showing {paginatedRows.length} of {currentRows.length}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPageByTab((prev) => ({ ...prev, [activeTab]: Math.max(1, (prev[activeTab] || 1) - 1) }))}
              disabled={(pageByTab[activeTab] || 1) <= 1}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs disabled:opacity-50"
            >
              Prev
            </button>
            <span className="text-xs text-slate-600">Page {pageByTab[activeTab] || 1} / {totalPages}</span>
            <button
              onClick={() => setPageByTab((prev) => ({ ...prev, [activeTab]: Math.min(totalPages, (prev[activeTab] || 1) + 1) }))}
              disabled={(pageByTab[activeTab] || 1) >= totalPages}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {openForm ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 p-4">
          <div className="flex min-h-full items-start justify-center py-4 sm:items-center">
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-5xl max-h-[92vh] min-h-0 overflow-hidden rounded-[32px] bg-white border border-slate-200 shadow-2xl shadow-slate-900/10 flex flex-col"
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.14),_transparent_35%),linear-gradient(180deg,_#ffffff_0%,_#f8fafc_100%)] px-6 py-5">
              <div>
                <h2 className="text-2xl font-semibold text-slate-900">{editTarget ? "Edit" : "Create"} {activeTab === "students" ? "Student" : activeTab === "teachers" ? "Teacher" : "Parent"}</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                  {activeTab === "teachers"
                    ? "Set up the teacher profile, specializations, teaching assignments, and class teacher responsibilities in one guided flow."
                    : "Complete the user profile details and save the account."}
                </p>
                {formNotice ? <FormNoticeBanner notice={formNotice} /> : null}
              </div>
              <button type="button" onClick={() => setOpenForm(false)} className="w-10 h-10 rounded-2xl border border-slate-200 bg-white grid place-items-center text-slate-600 hover:bg-slate-50">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6 space-y-4">
            <div className="grid md:grid-cols-2 gap-3">
              <Field label="First name" value={form.first_name} onChange={(v) => setForm((p) => ({ ...p, first_name: v }))} required />
              <Field label="Last name" value={form.last_name} onChange={(v) => setForm((p) => ({ ...p, last_name: v }))} required />
              <Field label="Email" type="email" value={form.email} onChange={(v) => setForm((p) => ({ ...p, email: v }))} required />
              <Field label="Phone" value={form.phone} onChange={(v) => setForm((p) => ({ ...p, phone: v }))} />
              <SelectField
                label="Gender"
                value={form.gender}
                onChange={(v) => setForm((p) => ({ ...p, gender: v }))}
                options={["", "male", "female"]}
              />
              <SelectField
                label="Status"
                value={form.status}
                onChange={(v) => setForm((p) => ({ ...p, status: v }))}
                options={["ACTIVE", "INACTIVE", "TRANSFERRED", "WITHDRAWN"]}
              />

              {activeTab === "students" ? (
                <>
                  <Field label="Student number" value={form.admission_number} onChange={(v) => setForm((p) => ({ ...p, admission_number: v }))} required />
                  <SelectOptionField
                    label="Class"
                    value={form.class_id}
                    onChange={(v) => setForm((p) => ({ ...p, class_id: v }))}
                    options={classOptions}
                    placeholder="Unassigned"
                  />
                  <Field label="Enrollment date" type="date" value={form.enrollment_date} onChange={(v) => setForm((p) => ({ ...p, enrollment_date: v }))} />
                </>
              ) : null}

              {activeTab === "teachers" ? (
                <>
                  <Field label="Employee number" value={form.employee_id} onChange={(v) => setForm((p) => ({ ...p, employee_id: v }))} required />
                  <Field label="Department" value={form.department} onChange={(v) => setForm((p) => ({ ...p, department: v }))} />
                  <Field label="Hire date" type="date" value={form.hire_date} onChange={(v) => setForm((p) => ({ ...p, hire_date: v }))} />
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Specialization summary</p>
                    <p className="mt-2 text-sm font-medium text-slate-700">
                      {buildSelectedSubjectSummary(form.specialization_subject_ids, subjectNameById) || "No subjects selected yet"}
                    </p>
                  </div>
                </>
              ) : null}

              {activeTab === "parents" ? (
                <>
                  <Field label="Relation type" value={form.relation_type} onChange={(v) => setForm((p) => ({ ...p, relation_type: v }))} />
                  <Field label="Occupation" value={form.occupation} onChange={(v) => setForm((p) => ({ ...p, occupation: v }))} />
                </>
              ) : null}
            </div>

            {activeTab === "teachers" ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-5">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Teaching Assignment</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Link this teacher to subject specializations, teaching classes, and class teacher responsibilities.
                  </p>
                </div>

                {hydratingTeacherAssignments ? (
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-6 flex items-center justify-center gap-3 text-sm text-slate-500">
                    <Loader2 className="w-4 h-4 animate-spin text-sky-600" />
                    Loading teacher assignments...
                  </div>
                ) : (
                  <>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-slate-900">Subject specializations</p>
                          <p className="text-xs text-slate-500">Choose the subjects this teacher can handle, or add a missing subject without leaving the form.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setOpenCreateSubjectInlineSection((current) =>
                              current === "specializations" ? null : "specializations"
                            )
                          }
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add subject
                        </button>
                      </div>
                      <div className="flex gap-3">
                        <div className="flex-1">
                          <SelectOptionField
                            label="Choose subject"
                            value={selectedSpecializationSubjectId}
                            onChange={setSelectedSpecializationSubjectId}
                            options={subjectOptions}
                            placeholder="Select subject"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (!selectedSpecializationSubjectId) return;
                            setForm((current) => ({
                              ...current,
                              specialization_subject_ids: current.specialization_subject_ids.includes(selectedSpecializationSubjectId)
                                ? current.specialization_subject_ids
                                : [...current.specialization_subject_ids, selectedSpecializationSubjectId],
                            }));
                            setSelectedSpecializationSubjectId("");
                          }}
                          className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800"
                        >
                          Add to teacher
                        </button>
                      </div>
                      {openCreateSubjectInlineSection === "specializations" ? (
                        <InlineSubjectCreatorCard
                          draft={subjectInlineDraft}
                          loading={creatingSubjectInline}
                          onChange={setSubjectInlineDraft}
                          onCancel={() => setOpenCreateSubjectInlineSection(null)}
                          onSubmit={() => void createSubjectInline()}
                        />
                      ) : null}
                      <div className="flex flex-wrap gap-2">
                        {form.specialization_subject_ids.length === 0 ? (
                          <p className="text-sm text-slate-500">No subject specializations selected yet.</p>
                        ) : (
                          form.specialization_subject_ids.map((subjectId) => (
                            <button
                              key={subjectId}
                              type="button"
                              onClick={() =>
                                setForm((current) => ({
                                  ...current,
                                  specialization_subject_ids: current.specialization_subject_ids.filter((value) => value !== subjectId),
                                }))
                              }
                              className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-medium text-sky-700"
                            >
                              {subjectNameById[subjectId] || "Subject"}
                              <X className="w-3.5 h-3.5" />
                            </button>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-slate-900">Teaching assignments</p>
                          <p className="text-xs text-slate-500">Map the exact classes and subjects this teacher teaches. Each row should answer one clear question: which subject does this teacher handle in this class?</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setOpenCreateClassInlineSection((current) =>
                                current === "assignments" ? null : "assignments"
                              )
                            }
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Add class
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setOpenCreateSubjectInlineSection((current) =>
                                current === "assignments" ? null : "assignments"
                              )
                            }
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Add subject
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setForm((current) => ({
                                ...current,
                                teaching_assignments: [
                                  ...current.teaching_assignments,
                                  createTeacherAssignmentDraft(),
                                ],
                              }))
                            }
                            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Add teaching assignment
                          </button>
                        </div>
                      </div>
                      {openCreateSubjectInlineSection === "assignments" ? (
                        <InlineSubjectCreatorCard
                          draft={subjectInlineDraft}
                          loading={creatingSubjectInline}
                          onChange={setSubjectInlineDraft}
                          onCancel={() => setOpenCreateSubjectInlineSection(null)}
                          onSubmit={() => void createSubjectInline()}
                        />
                      ) : null}
                      {openCreateClassInlineSection === "assignments" ? (
                        <InlineClassCreatorCard
                          draft={classInlineDraft}
                          loading={creatingClassInline}
                          onChange={setClassInlineDraft}
                          onCancel={() => setOpenCreateClassInlineSection(null)}
                          onSubmit={() => void createClassInline()}
                        />
                      ) : null}

                      {form.teaching_assignments.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-5 text-sm text-slate-500">
                          No teaching assignments yet. Add the classes and subjects this teacher will handle.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {form.teaching_assignments.map((assignment, index) => (
                            <div key={assignment.id} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
                              <SelectOptionField
                                label={`Class ${index + 1}`}
                                value={assignment.classId}
                                onChange={(value) =>
                                  setForm((current) => ({
                                    ...current,
                                    teaching_assignments: current.teaching_assignments.map((item) =>
                                      item.id === assignment.id ? { ...item, classId: value } : item
                                    ),
                                  }))
                                }
                                options={classOptions}
                                placeholder="Select class"
                              />
                              <SelectOptionField
                                label="Subject"
                                value={assignment.subjectId}
                                onChange={(value) =>
                                  setForm((current) => ({
                                    ...current,
                                    teaching_assignments: current.teaching_assignments.map((item) =>
                                      item.id === assignment.id ? { ...item, subjectId: value } : item
                                    ),
                                  }))
                                }
                                options={subjectOptions}
                                placeholder="Select subject"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  setForm((current) => ({
                                    ...current,
                                    teaching_assignments: current.teaching_assignments.filter((item) => item.id !== assignment.id),
                                  }))
                                }
                                className="inline-flex h-11 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-700 hover:bg-rose-100"
                              >
                                Remove
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-slate-900">Class teacher responsibilities</p>
                          <p className="text-xs text-slate-500">Choose the classes this teacher supervises as class teacher, or create a missing class inline.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setOpenCreateClassInlineSection((current) =>
                              current === "supervised" ? null : "supervised"
                            )
                          }
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add class
                        </button>
                      </div>
                      <div className="flex gap-3">
                        <div className="flex-1">
                          <SelectOptionField
                            label="Choose class"
                            value={selectedSupervisedClassId}
                            onChange={setSelectedSupervisedClassId}
                            options={classOptions}
                            placeholder="Select class"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (!selectedSupervisedClassId) return;
                            setForm((current) => ({
                              ...current,
                              supervised_class_ids: current.supervised_class_ids.includes(selectedSupervisedClassId)
                                ? current.supervised_class_ids
                                : [...current.supervised_class_ids, selectedSupervisedClassId],
                            }));
                            setSelectedSupervisedClassId("");
                          }}
                          className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800"
                        >
                          Add class teacher role
                        </button>
                      </div>
                      {openCreateClassInlineSection === "supervised" ? (
                        <InlineClassCreatorCard
                          draft={classInlineDraft}
                          loading={creatingClassInline}
                          onChange={setClassInlineDraft}
                          onCancel={() => setOpenCreateClassInlineSection(null)}
                          onSubmit={() => void createClassInline()}
                        />
                      ) : null}
                      <div className="flex flex-wrap gap-2">
                        {form.supervised_class_ids.length === 0 ? (
                          <p className="text-sm text-slate-500">No class teacher responsibilities selected yet.</p>
                        ) : (
                          form.supervised_class_ids.map((classId) => (
                            <button
                              key={classId}
                              type="button"
                              onClick={() =>
                                setForm((current) => ({
                                  ...current,
                                  supervised_class_ids: current.supervised_class_ids.filter((value) => value !== classId),
                                }))
                              }
                              className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700"
                            >
                              {classNameById[classId] || "Class"}
                              <X className="w-3.5 h-3.5" />
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : null}

            </div>

            <div className="shrink-0 flex flex-col-reverse justify-end gap-2 border-t border-slate-100 bg-white px-6 py-4 sm:flex-row">
              <button type="button" onClick={() => setOpenForm(false)} className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50">Cancel</button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 rounded-xl bg-sky-500 text-white font-medium hover:bg-sky-400 disabled:opacity-60 inline-flex items-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} {editTarget ? "Save changes" : `Create ${activeTab === "students" ? "student" : activeTab === "teachers" ? "teacher" : "parent"}`}
              </button>
            </div>
          </div>
          </div>
        </div>
      ) : null}

      {detailTarget ? (
        <div className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-4">
          <div className="w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-3xl bg-white border border-slate-200 shadow-2xl shadow-slate-900/10">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  {activeTab === "teachers" ? "Teacher Oversight" : "User Details"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {detailData?.displayName || getDisplayName(detailTarget)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {canResetTemporaryPassword ? (
                  <button
                    onClick={() => void resetTemporaryPassword(detailTarget)}
                    disabled={resettingPassword === detailTarget?.id}
                    className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800 hover:bg-amber-100 disabled:opacity-60"
                  >
                    {resettingPassword === detailTarget?.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <UserCheck className="w-4 h-4" />
                    )}
                    Reset temporary password
                  </button>
                ) : null}
                <button
                  onClick={() => {
                    setDetailTarget(null);
                    setDetailData(null);
                    setDetailError(null);
                  }}
                  className="w-9 h-9 rounded-xl bg-slate-100 grid place-items-center text-slate-600 hover:bg-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="max-h-[calc(90vh-88px)] overflow-y-auto px-6 py-5">
              {detailLoading ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-10 flex items-center justify-center gap-3">
                  <Loader2 className="w-5 h-5 animate-spin text-sky-600" />
                  <span className="text-sm text-slate-500">Loading user details...</span>
                </div>
              ) : detailError ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
                  {detailError}
                </div>
              ) : detailData ? (
                <div className="space-y-6">
                  <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
                    <div className="rounded-3xl border border-slate-200 bg-slate-950 px-6 py-6 text-white">
                      <p className="text-xs uppercase tracking-[0.24em] text-sky-200/80">
                        {String(detailData.role || activeTab).toUpperCase()}
                      </p>
                      <h3 className="mt-3 text-3xl font-semibold">
                        {detailData.displayName || getDisplayName(detailTarget)}
                      </h3>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <DetailMeta label="Email" value={detailData.email || "-"} dark />
                        <DetailMeta label="Status" value={detailData.status || "-"} dark />
                        {detailData.employeeId ? <DetailMeta label="Employee No" value={detailData.employeeId} dark /> : null}
                        {detailData.department ? <DetailMeta label="Department" value={detailData.department} dark /> : null}
                        {detailData.specialization ? <DetailMeta label="Specialization" value={detailData.specialization} dark /> : null}
                        {detailData.tenure?.label ? <DetailMeta label="Tenure" value={detailData.tenure.label} dark /> : null}
                        {detailData.className ? <DetailMeta label="Class" value={detailData.className} dark /> : null}
                        {detailData.admissionNumber ? <DetailMeta label="Student No" value={detailData.admissionNumber} dark /> : null}
                        {detailData.relationType ? <DetailMeta label="Relation" value={detailData.relationType} dark /> : null}
                        {detailData.occupation ? <DetailMeta label="Occupation" value={detailData.occupation} dark /> : null}
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                      {detailData.oversight?.stats ? (
                        <>
                          <StatCard label="Supervised Classes" value={detailData.oversight.stats.supervisedClasses} />
                          <StatCard label="Teaching Classes" value={detailData.oversight.stats.teachingClasses} />
                          <StatCard label="Weekly Lessons" value={detailData.oversight.stats.weeklyLessons} />
                          <StatCard label="Pending Roll Calls" value={detailData.oversight.stats.pendingRollCalls} tone="warning" />
                        </>
                      ) : detailData.attendance ? (
                        <>
                          <StatCard label="Present" value={detailData.attendance.present || 0} />
                          <StatCard label="Absent" value={detailData.attendance.absent || 0} tone="warning" />
                          <StatCard label="Late" value={detailData.attendance.late || 0} />
                          <StatCard label="Sick" value={detailData.attendance.sick || 0} />
                        </>
                      ) : detailData.alerts ? (
                        <StatCard label="Unread Alerts" value={detailData.alerts.unreadCount || 0} />
                      ) : null}
                    </div>
                  </div>

                  {detailData.oversight ? (
                    <>
                      <div className="grid gap-4 xl:grid-cols-3">
                        <DetailListCard
                          title="Supervised Classes"
                          emptyLabel="No supervised classes"
                          items={detailData.supervisedClasses || []}
                          renderItem={(item: any) => item.name || "Class"}
                        />
                        <DetailListCard
                          title="Teaching Classes"
                          emptyLabel="No teaching classes"
                          items={detailData.assignedClasses || []}
                          renderItem={(item: any) => item.name || "Class"}
                        />
                        <DetailListCard
                          title="Assigned Subjects"
                          emptyLabel="No assigned subjects"
                          items={detailData.assignedSubjects || []}
                          renderItem={(item: any) => item.name || "Subject"}
                        />
                      </div>

                      <div className="grid gap-4 xl:grid-cols-3">
                        <DetailActivityCard
                          title="Recent Attendance Activity"
                          emptyLabel="No attendance activity recorded"
                          items={detailData.oversight.recentAttendance || []}
                          renderBody={(item: any) => (
                            <>
                              <p className="font-medium text-slate-800">{item.sessionName || "Lesson"}</p>
                              <p className="text-xs text-slate-500">
                                {item.date ? formatDateLabel(item.date) : "No date"} · {item.status || "Recorded"}
                              </p>
                            </>
                          )}
                        />
                        <DetailActivityCard
                          title="Recent Assignments"
                          emptyLabel="No assignments created"
                          items={detailData.oversight.recentAssignments || []}
                          renderBody={(item: any) => (
                            <>
                              <p className="font-medium text-slate-800">{item.title || "Assignment"}</p>
                              <p className="text-xs text-slate-500">
                                {item.className || "Class"} · Due {item.dueDate ? formatDateLabel(item.dueDate) : "-"}
                              </p>
                            </>
                          )}
                        />
                        <DetailActivityCard
                          title="Recent Results Activity"
                          emptyLabel="No results entered"
                          items={detailData.oversight.recentResults || []}
                          renderBody={(item: any) => (
                            <>
                              <p className="font-medium text-slate-800">{item.studentName || "Student"}</p>
                              <p className="text-xs text-slate-500">
                                {item.subjectName || "Subject"} · {item.score ?? "-"} {item.grade ? `(${item.grade})` : ""}
                              </p>
                            </>
                          )}
                        />
                      </div>
                    </>
                  ) : null}

                  {detailData.results?.rows ? (
                    <DetailActivityCard
                      title="Recent Results"
                      emptyLabel="No results available"
                      items={detailData.results.rows}
                      renderBody={(item: any) => (
                        <>
                          <p className="font-medium text-slate-800">{item.subjectName || "Subject"}</p>
                          <p className="text-xs text-slate-500">
                            {item.score ?? "-"} {item.grade ? `(${item.grade})` : ""} · {item.date ? formatDateLabel(item.date) : "-"}
                          </p>
                        </>
                      )}
                    />
                  ) : null}

                  {detailData.guardians?.length ? (
                    <DetailListCard
                      title="Guardians"
                      emptyLabel="No guardians linked"
                      items={detailData.guardians}
                      renderItem={(item: any) => `${item.name || "Guardian"}${item.relationship ? ` · ${item.relationship}` : ""}`}
                    />
                  ) : null}

                  {detailData.linkedChildren?.length ? (
                    <DetailListCard
                      title="Linked Children"
                      emptyLabel="No linked children"
                      items={detailData.linkedChildren}
                      renderItem={(item: any) => `${item.name || "Student"}${item.className ? ` · ${item.className}` : ""}`}
                    />
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {openLinkModal && selectedParent ? (
        <div className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-4">
          <div className="w-full max-w-3xl rounded-2xl bg-white border border-slate-200 p-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-900">Link Students to {getDisplayName(selectedParent)}</h2>
              <button onClick={() => setOpenLinkModal(false)} className="w-8 h-8 rounded-lg bg-slate-100 grid place-items-center">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={linkSearch}
                onChange={(e) => setLinkSearch(e.target.value)}
                placeholder="Search students by name or number"
                className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-200"
              />
            </div>

            <div className="max-h-[380px] overflow-auto rounded-xl border border-slate-100 divide-y divide-slate-100">
              {linkCandidates.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-slate-500">No students found.</div>
              ) : (
                linkCandidates.map((student) => {
                  const linked = linkedStudentIds.includes(student.id);
                  return (
                    <div key={student.id} className="px-4 py-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-800">{student.name}</p>
                        <p className="text-xs text-slate-500">{student.admission || "No student number"}</p>
                      </div>
                      <button
                        onClick={() => toggleLinkStudent(student.id, !linked)}
                        disabled={linking}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                          linked ? "bg-red-50 text-red-700 hover:bg-red-100" : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                        } disabled:opacity-60`}
                      >
                        {linked ? "Unlink" : "Link"}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      ) : null}

      {newCredentials ? (
        <div className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white border border-slate-200 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">New Account Credentials</h2>
              <button onClick={() => setNewCredentials(null)} className="w-8 h-8 rounded-lg bg-slate-100 grid place-items-center">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-sm text-slate-600">
              Save these credentials and share them securely with the user. This is a one-time
              temporary password and the user must change it on first mobile login.
            </p>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
              <div className="text-sm">
                <span className="text-slate-500">Email: </span>
                <span className="font-medium text-slate-800">{newCredentials.email}</span>
              </div>
              <div className="text-sm">
                <span className="text-slate-500">Temporary Password (one-time): </span>
                <span className="font-mono font-medium text-slate-800">{newCredentials.password}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={async () => {
                  const text = `Email: ${newCredentials.email}\nTemporary Password (one-time): ${newCredentials.password}\nThe user must change this password on first mobile login.`;
                  try {
                    await navigator.clipboard.writeText(text);
                    toast.success("Credentials copied");
                  } catch {
                    toast.error("Copy failed");
                  }
                }}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50"
              >
                Copy
              </button>
              <button
                onClick={() => setNewCredentials(null)}
                className="px-4 py-2 rounded-xl bg-sky-500 text-white font-medium hover:bg-sky-400"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );

  async function quickToggleStatus(row: GenericRow) {
    if (!schoolId) return;

    const current = String(row.status || "ACTIVE").toUpperCase();
    const next = current === "ACTIVE" ? "INACTIVE" : "ACTIVE";

    try {
      await adminApiJson("/api/admin/users", {
        method: "PUT",
        body: JSON.stringify({
          profileId: row.id,
          role: activeTab === "students" ? "student" : activeTab === "teachers" ? "teacher" : "parent",
          firstName: row.first_name || "",
          lastName: row.last_name || "",
          email: row.email || "",
          phone: row.phone || null,
          gender: row.gender || null,
          status: next,
          admissionNumber: row.admission_number || null,
          classId: row.class_id || null,
          enrollmentDate: row.enrollment_date || null,
          employeeId: row.employee_id || null,
          department: row.department || null,
          specialization: row.specialization || null,
          hireDate: row.hire_date || null,
          relationType: row.relation_type || null,
          occupation: row.occupation || null,
        }),
      });
      await fetchAll(schoolId, parentsTable);
    } catch (err: any) {
      toast.error(err?.message || "Failed to update status");
    }
  }

  async function resetTemporaryPassword(row: GenericRow | null) {
    if (!row?.id) return;

    setResettingPassword(row.id);
    const t = toast.loading("Resetting temporary password...");

    try {
      const response = await fetch("/api/admin/users/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId: row.id }),
      });
      const body = await response.json();

      if (!response.ok) {
        throw new Error(body?.error || "Failed to reset temporary password");
      }

      if (!body?.temporaryPassword) {
        throw new Error("Temporary password was not returned");
      }

      setNewCredentials({
        email: String(body.email || row.email || ""),
        password: String(body.temporaryPassword),
      });

      if (schoolId) {
        await fetchAll(schoolId, parentsTable);
      }

      toast.success("Temporary password reset", { id: t });
    } catch (err: any) {
      toast.error(err?.message || "Failed to reset temporary password", { id: t });
    } finally {
      setResettingPassword(null);
    }
  }
}

function buildTeacherAssignmentDraftId(seed?: number) {
  if (typeof seed === "number") {
    return `assignment-${seed}-${Date.now()}`;
  }

  return `assignment-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createTeacherAssignmentDraft(): TeacherAssignmentDraft {
  return {
    id: buildTeacherAssignmentDraftId(),
    classId: "",
    subjectId: "",
  };
}

function toggleSelection(values: string[], nextValue: string) {
  return values.includes(nextValue)
    ? values.filter((value) => value !== nextValue)
    : [...values, nextValue];
}

function dedupeTeacherAssignments(values: TeacherAssignmentDraft[]) {
  const seen = new Set<string>();
  const nextValues: Array<{ classId: string; subjectId: string }> = [];

  for (const value of values) {
    const classId = String(value.classId || "").trim();
    const subjectId = String(value.subjectId || "").trim();
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

function buildSelectedSubjectSummary(subjectIds: string[], subjectNameById: Record<string, string>) {
  const names = subjectIds
    .map((subjectId) => String(subjectNameById[subjectId] || "").trim())
    .filter(Boolean);

  return names.length > 0 ? names.join(", ") : "";
}

function normalizeComparableValue(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function sortOptionList<T extends { label: string }>(values: T[]) {
  return [...values].sort((left, right) => left.label.localeCompare(right.label));
}

async function resolveTable(candidates: string[]): Promise<string | null> {
  for (const table of candidates) {
    const { error } = await supabase.from(table).select("id").limit(1);
    if (!error) return table;
  }
  return null;
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label>
      <span className="block text-xs font-medium text-slate-600 mb-1">
        {label}
        {required ? " *" : ""}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-200"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <label>
      <span className="block text-xs font-medium text-slate-600 mb-1">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-200"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function FormNoticeBanner({ notice }: { notice: FormNotice }) {
  return (
    <div
      className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
        notice.tone === "error"
          ? "border-rose-200 bg-rose-50 text-rose-800"
          : "border-sky-200 bg-sky-50 text-sky-800"
      }`}
    >
      {notice.message}
    </div>
  );
}

function InlineSubjectCreatorCard({
  draft,
  loading,
  onChange,
  onCancel,
  onSubmit,
}: {
  draft: { name: string; code: string };
  loading: boolean;
  onChange: (value: { name: string; code: string }) => void;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="grid gap-3 md:grid-cols-2">
        <Field
          label="Subject name"
          value={draft.name}
          onChange={(value) => onChange({ ...draft, name: value })}
          required
        />
        <Field
          label="Subject code"
          value={draft.code}
          onChange={(value) => onChange({ ...draft, code: value })}
        />
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-700 hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-400 disabled:opacity-60"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Create subject
        </button>
      </div>
    </div>
  );
}

function InlineClassCreatorCard({
  draft,
  loading,
  onChange,
  onCancel,
  onSubmit,
}: {
  draft: { name: string; gradeLevel: string; capacity: string };
  loading: boolean;
  onChange: (value: { name: string; gradeLevel: string; capacity: string }) => void;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="grid gap-3 md:grid-cols-3">
        <Field
          label="Class name"
          value={draft.name}
          onChange={(value) => onChange({ ...draft, name: value })}
          required
        />
        <SelectField
          label="Grade level"
          value={draft.gradeLevel}
          onChange={(value) => onChange({ ...draft, gradeLevel: value })}
          options={["", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13"]}
        />
        <Field
          label="Capacity"
          type="number"
          value={draft.capacity}
          onChange={(value) => onChange({ ...draft, capacity: value })}
        />
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-700 hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-400 disabled:opacity-60"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Create class
        </button>
      </div>
    </div>
  );
}

function SelectOptionField({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: ClassOption[];
  placeholder?: string;
}) {
  return (
    <label>
      <span className="block text-xs font-medium text-slate-600 mb-1">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-200"
      >
        <option value="">{placeholder || "Select an option"}</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function toClassOptions(rows: unknown): ClassOption[] {
  if (!Array.isArray(rows)) {
    return [];
  }

  return rows.flatMap((row: any) => {
      const id = typeof row?.id === "string" ? row.id : "";
      const className = typeof row?.name === "string" ? row.name.trim() : "";
      const gradeName = typeof row?.grades?.name === "string" ? row.grades.name.trim() : "";
      const label = [gradeName, className].filter(Boolean).join(" - ") || className || gradeName;
      return id && label ? [{ id, label }] : [];
    });
}

function findClassId(options: ClassOption[], legacyLabel: string) {
  const normalizedLegacyLabel = legacyLabel.trim().toLowerCase();
  if (!normalizedLegacyLabel) {
    return "";
  }

  return (
    options.find((option) => option.label.trim().toLowerCase() === normalizedLegacyLabel)?.id ||
    ""
  );
}

function StatCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string | number;
  tone?: "default" | "warning";
}) {
  return (
    <div className={`rounded-2xl border px-4 py-4 ${
      tone === "warning" ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-white"
    }`}>
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function DetailMeta({ label, value, dark }: { label: string; value: string; dark?: boolean }) {
  return (
    <div className={`rounded-2xl border px-3 py-3 ${dark ? "border-white/10 bg-white/5" : "border-slate-200 bg-white"}`}>
      <p className={`text-[11px] uppercase tracking-[0.18em] ${dark ? "text-sky-100/70" : "text-slate-500"}`}>{label}</p>
      <p className={`mt-1 text-sm font-medium ${dark ? "text-white" : "text-slate-900"}`}>{value}</p>
    </div>
  );
}

function DetailListCard({
  title,
  items,
  emptyLabel,
  renderItem,
}: {
  title: string;
  items: any[];
  emptyLabel: string;
  renderItem: (item: any) => string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      <div className="mt-4 space-y-2">
        {items?.length ? (
          items.map((item, index) => (
            <div key={item?.id || `${title}-${index}`} className="rounded-2xl bg-slate-50 px-3 py-3 text-sm text-slate-700">
              {renderItem(item)}
            </div>
          ))
        ) : (
          <p className="text-sm text-slate-500">{emptyLabel}</p>
        )}
      </div>
    </div>
  );
}

function DetailActivityCard({
  title,
  items,
  emptyLabel,
  renderBody,
}: {
  title: string;
  items: any[];
  emptyLabel: string;
  renderBody: (item: any) => any;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      <div className="mt-4 space-y-3">
        {items?.length ? (
          items.map((item, index) => (
            <div key={item?.id || `${title}-${index}`} className="rounded-2xl border border-slate-100 px-3 py-3">
              {renderBody(item)}
            </div>
          ))
        ) : (
          <p className="text-sm text-slate-500">{emptyLabel}</p>
        )}
      </div>
    </div>
  );
}

function formatDateLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-ZM", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

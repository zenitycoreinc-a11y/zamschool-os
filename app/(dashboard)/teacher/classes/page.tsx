"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Loader2,
  RefreshCw,
  Search,
  Users,
} from "lucide-react";

import { fetchAccountProfile, type AccountProfilePayload } from "@/lib/account-profile-client";
import { buildRollcallCompletionState } from "@/lib/attendance-access";
import { formatLocalDateInputValue } from "@/lib/local-date";

const STATUS_VALUES = ["PRESENT", "ABSENT", "LATE", "EXCUSED"] as const;

type AttendanceStatus = (typeof STATUS_VALUES)[number];

type LessonRosterRow = {
  id: string;
  admissionNumber: string | null;
  displayName: string;
  email: string | null;
  status: AttendanceStatus | null;
  remarks: string | null;
};

type LessonRow = {
  id: string;
  date: string;
  classId: string | null;
  className: string;
  subjectId: string | null;
  subjectName: string;
  subjectCode: string | null;
  dayOfWeek: number | null;
  startTime: string | null;
  endTime: string | null;
  room: string | null;
  rosterCount: number;
  roster: LessonRosterRow[];
};

type RollcallResponse = {
  success?: boolean;
  data?: LessonRow[];
  error?: string;
};

type ClassHealthRow = {
  id: string;
  name: string;
  studentCount: number;
  highRiskCount: number;
  mediumRiskCount: number;
  averageAttendanceRate: number | null;
  averageScore: number | null;
};

type StudentSignalRow = {
  id: string;
  classId: string;
  className: string;
  displayName: string;
  attendance: {
    rate: number | null;
  };
  results: {
    averageScore: number | null;
  };
  flags: string[];
  riskLevel: "low" | "medium" | "high";
};

type StudentIntelligenceResponse = {
  success?: boolean;
  data?: {
    students: StudentSignalRow[];
    classHealth: ClassHealthRow[];
  };
  error?: string;
};

export default function TeacherClassesPage() {
  const searchParams = useSearchParams();
  const [date, setDate] = useState(() => formatLocalDateInputValue());
  const [lessons, setLessons] = useState<LessonRow[]>([]);
  const [studentSignals, setStudentSignals] = useState<StudentSignalRow[]>([]);
  const [classHealth, setClassHealth] = useState<ClassHealthRow[]>([]);
  const [selectedLessonId, setSelectedLessonId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [account, setAccount] = useState<AccountProfilePayload["data"] | null>(null);
  const lessonId = searchParams.get("lessonId") || "";
  const filter = searchParams.get("filter") || "";
  const classId = searchParams.get("classId") || "";
  const view = searchParams.get("view") || "queue";

  const visibleLessons = useMemo(() => {
    let nextLessons = lessons;

    if (classId) {
      nextLessons = nextLessons.filter((lesson) => lesson.classId === classId);
    }

    if (filter === "pending") {
      nextLessons = nextLessons.filter((lesson) => {
        const marked = lesson.roster.filter((student) => Boolean(student.status)).length;
        return buildRollcallCompletionState({
          rosterCount: lesson.rosterCount,
          selectedStatuses: marked,
        }) !== "complete";
      });
    }

    return nextLessons;
  }, [classId, filter, lessons]);

  const selectedLesson = useMemo(
    () => visibleLessons.find((lesson) => lesson.id === selectedLessonId) || visibleLessons[0] || null,
    [selectedLessonId, visibleLessons]
  );

  const filteredRoster = useMemo(() => {
    if (!selectedLesson) return [];

    const term = search.trim().toLowerCase();
    if (!term) return selectedLesson.roster;

    return selectedLesson.roster.filter((student) =>
      `${student.displayName} ${student.admissionNumber || ""} ${student.email || ""}`
        .toLowerCase()
        .includes(term)
    );
  }, [search, selectedLesson]);

  const selectedLessonStats = useMemo(() => {
    if (!selectedLesson) {
      return {
        marked: 0,
        missing: 0,
        completionState: "empty" as "complete" | "incomplete" | "empty",
      };
    }

    const marked = selectedLesson.roster.filter((student) => Boolean(student.status)).length;

    return {
      marked,
      missing: Math.max(selectedLesson.rosterCount - marked, 0),
      completionState: buildRollcallCompletionState({
        rosterCount: selectedLesson.rosterCount,
        selectedStatuses: marked,
      }),
    };
  }, [selectedLesson]);

  const visibleClassHealth = useMemo(() => {
    if (classId) {
      return classHealth.filter((item) => item.id === classId);
    }

    const visibleClassIds = new Set(visibleLessons.map((lesson) => lesson.classId).filter(Boolean));
    if (visibleClassIds.size === 0) {
      return classHealth;
    }

    return classHealth.filter((item) => visibleClassIds.has(item.id));
  }, [classHealth, classId, visibleLessons]);

  const selectedClassHealth = useMemo(() => {
    if (!selectedLesson?.classId) return null;
    return classHealth.find((item) => item.id === selectedLesson.classId) || null;
  }, [classHealth, selectedLesson?.classId]);

  const selectedClassNeedsHelp = useMemo(() => {
    if (!selectedLesson?.classId) return [];

    return studentSignals
      .filter(
        (student) => student.classId === selectedLesson.classId && student.riskLevel !== "low"
      )
      .sort((left, right) => rankRisk(right.riskLevel) - rankRisk(left.riskLevel))
      .slice(0, 3);
  }, [selectedLesson?.classId, studentSignals]);

  useEffect(() => {
    void loadLessons();
  }, [date, filter, lessonId, classId]);

  useEffect(() => {
    void loadStudentIntelligence();
  }, []);

  useEffect(() => {
    if (visibleLessons.length === 0) {
      setSelectedLessonId("");
      return;
    }

    if (lessonId) {
      const matchedLesson = visibleLessons.find((lesson) => lesson.id === lessonId);
      if (matchedLesson && matchedLesson.id !== selectedLessonId) {
        setSelectedLessonId(matchedLesson.id);
        return;
      }
    }

    if (!visibleLessons.some((lesson) => lesson.id === selectedLessonId)) {
      setSelectedLessonId(visibleLessons[0]?.id || "");
    }
  }, [lessonId, selectedLessonId, visibleLessons]);

  async function loadLessons(preferredLessonId?: string) {
    setLoading(true);
    setError("");

    try {
      const [response, accountPayload] = await Promise.all([
        fetch(`/api/teacher/classes?date=${date}`, {
          cache: "no-store",
        }),
        fetchAccountProfile(),
      ]);
      const payload = (await response.json()) as RollcallResponse;

      if (!response.ok) {
        throw new Error(payload.error || "Failed to load teacher lessons");
      }

      const nextLessons = payload.data || [];
      setLessons(nextLessons);
      setAccount(accountPayload.data || null);

      const nextVisibleLessons =
        filter === "pending"
          ? nextLessons.filter((lesson) => {
              const marked = lesson.roster.filter((student) => Boolean(student.status)).length;
              return buildRollcallCompletionState({
                rosterCount: lesson.rosterCount,
                selectedStatuses: marked,
              }) !== "complete";
            })
          : nextLessons;
      const requestedLessonId = preferredLessonId || lessonId || selectedLessonId;
      const nextSelection =
        nextVisibleLessons.find((lesson) => lesson.id === requestedLessonId)?.id ||
        nextVisibleLessons[0]?.id ||
        "";
      setSelectedLessonId(nextSelection);
    } catch (loadError: unknown) {
      setLessons([]);
      setSelectedLessonId("");
      setAccount(null);
      setError(loadError instanceof Error ? loadError.message : "Failed to load teacher lessons");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function loadStudentIntelligence() {
    try {
      const response = await fetch("/api/teacher/students", { cache: "no-store" });
      const payload = (await response.json()) as StudentIntelligenceResponse;

      if (!response.ok) {
        throw new Error(payload.error || "Failed to load class health");
      }

      setStudentSignals(payload.data?.students || []);
      setClassHealth(payload.data?.classHealth || []);
    } catch {
      setStudentSignals([]);
      setClassHealth([]);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    setSaveMessage("");
    await loadLessons(selectedLessonId);
  }

  function updateSelectedLessonRoster(
    updater: (student: LessonRosterRow, visibleStudentIds: Set<string>) => LessonRosterRow
  ) {
    if (!selectedLesson) return;

    const visibleStudentIds = new Set(filteredRoster.map((student) => student.id));
    setLessons((current) =>
      current.map((lesson) =>
        lesson.id !== selectedLesson.id
          ? lesson
          : {
              ...lesson,
              roster: lesson.roster.map((student) => updater(student, visibleStudentIds)),
            }
      )
    );
  }

  function setStudentStatus(studentId: string, status: AttendanceStatus) {
    updateSelectedLessonRoster((student) =>
      student.id === studentId ? { ...student, status } : student
    );
    setSaveMessage("");
  }

  function setStudentRemarks(studentId: string, remarks: string) {
    updateSelectedLessonRoster((student) =>
      student.id === studentId ? { ...student, remarks } : student
    );
  }

  function applyBulkStatus(status: AttendanceStatus | null) {
    updateSelectedLessonRoster((student, visibleStudentIds) =>
      visibleStudentIds.has(student.id) ? { ...student, status } : student
    );
    setSaveMessage("");
  }

  function clearVisibleRemarks() {
    updateSelectedLessonRoster((student, visibleStudentIds) =>
      visibleStudentIds.has(student.id) ? { ...student, remarks: "" } : student
    );
  }

  async function handleSaveRollcall() {
    if (!selectedLesson) return;

    const missingStudents = selectedLesson.roster.filter((student) => !student.status);
    if (missingStudents.length > 0) {
      setError("Select a status for every student before saving rollcall.");
      return;
    }

    setSaving(true);
    setError("");
    setSaveMessage("");

    try {
      const response = await fetch("/api/teacher/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonId: selectedLesson.id,
          date,
          statuses: selectedLesson.roster.map((student) => ({
            studentId: student.id,
            status: student.status,
            remarks: student.remarks?.trim() || null,
          })),
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Failed to save rollcall");
      }

      setSaveMessage(`Saved rollcall for ${selectedLesson.subjectName}.`);
      await loadLessons(selectedLesson.id);
    } catch (saveError: any) {
      setError(saveError?.message || "Failed to save rollcall");
    } finally {
      setSaving(false);
    }
  }

  const teacher = account?.teacher;

  return (
    <div className="flex-1 space-y-6 p-4 md:p-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-400">
              Rollcall workspace
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">Classes</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              Mark attendance, add remarks, and save rollcall from the lesson roster without
              leaving the teacher workspace.
            </p>
            <Link
              href="/teacher/teaching"
              className="mt-3 inline-flex text-sm font-semibold text-sky-600"
            >
              Back to teaching hub
            </Link>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-sky-200"
            />
            <button
              type="button"
              onClick={() => void handleRefresh()}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Refresh
            </button>
          </div>
        </div>

        {error ? (
          <div className="mt-4 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        {saveMessage ? (
          <div className="mt-4 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{saveMessage}</span>
          </div>
        ) : null}
      </section>

      <div className="grid gap-4 xl:grid-cols-3">
        <SummaryTags
          title="Assigned classes"
          items={teacher?.assignedClasses?.map((item) => item.name) || []}
          emptyLabel="No classes assigned yet."
        />
        <SummaryTags
          title="Assigned subjects"
          items={teacher?.assignedSubjects?.map((item) => item.name) || []}
          emptyLabel="No subjects assigned yet."
        />
        <SummaryTags
          title="Supervised classes"
          items={teacher?.supervisedClasses?.map((item) => item.name) || []}
          emptyLabel="No supervised classes yet."
        />
      </div>

      {visibleClassHealth.length > 0 ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-400">
                Class health
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">
                Attendance and performance watchlist
              </h2>
            </div>
            <Link href="/teacher/students" className="text-sm font-semibold text-sky-600">
              Open student hub
            </Link>
          </div>

          <div className="mt-6 grid gap-4 xl:grid-cols-3">
            {visibleClassHealth.map((item) => (
              <div key={item.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">{item.name}</h3>
                    <p className="mt-1 text-sm text-slate-500">{item.studentCount} students tracked</p>
                  </div>
                  <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700">
                    {item.highRiskCount + item.mediumRiskCount} need attention
                  </span>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <MiniHealthStat
                    label="Attendance"
                    value={formatRate(item.averageAttendanceRate)}
                  />
                  <MiniHealthStat
                    label="Average score"
                    value={formatRate(item.averageScore)}
                  />
                  <MiniHealthStat
                    label="High risk"
                    value={String(item.highRiskCount)}
                  />
                  <MiniHealthStat
                    label="Needs help now"
                    value={String(item.mediumRiskCount)}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[320px,minmax(0,1fr)]">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Lesson queue</h2>
              <p className="text-sm text-slate-500">
                {visibleLessons.length} lesson(s) for {date}
              </p>
            </div>
            {loading ? <Loader2 className="h-5 w-5 animate-spin text-slate-400" /> : null}
          </div>

          {filter === "pending" ? (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Showing lessons with unfinished rollcall from the dashboard pending shortcut.
            </div>
          ) : null}

          {classId ? (
            <div className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
              Showing lessons for the class selected from the students workspace.
            </div>
          ) : null}

          <div className="mt-4 space-y-3">
            {!loading && visibleLessons.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                No scheduled lessons were found for this date.
              </div>
            ) : null}

            {visibleLessons.map((lesson) => {
              const marked = lesson.roster.filter((student) => Boolean(student.status)).length;
              const state = buildRollcallCompletionState({
                rosterCount: lesson.rosterCount,
                selectedStatuses: marked,
              });

              return (
                <button
                  key={lesson.id}
                  type="button"
                  onClick={() => setSelectedLessonId(lesson.id)}
                  className={`w-full rounded-2xl border px-4 py-4 text-left transition ${
                    selectedLesson?.id === lesson.id
                      ? "border-sky-300 bg-sky-50"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{lesson.subjectName}</p>
                      <p className="mt-1 text-sm text-slate-500">{lesson.className}</p>
                    </div>
                    <span className={stateBadge(state)}>
                      {state === "complete" ? "Saved" : state === "incomplete" ? "Pending" : "Empty"}
                    </span>
                  </div>
                  <p className="mt-3 text-xs text-slate-500">
                    {formatTimeRange(lesson.startTime, lesson.endTime)} | {lesson.rosterCount} students
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          {selectedLesson ? (
            <>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">{selectedLesson.subjectName}</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {selectedLesson.className} | {formatTimeRange(selectedLesson.startTime, selectedLesson.endTime)}
                  </p>
                  {view === "roster" ? (
                    <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-sky-600">
                      Dashboard focus: student roster
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-3">
                  <Link
                    href="/teacher/attendance"
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Open attendance log
                  </Link>
                  <button
                    type="button"
                    onClick={() => void handleSaveRollcall()}
                    disabled={saving || selectedLessonStats.missing > 0}
                    className="inline-flex items-center gap-2 rounded-2xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    Save rollcall
                  </button>
                </div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-4">
                <CompactStat label="Students" value={String(selectedLesson.rosterCount)} icon={Users} />
                <CompactStat label="Marked" value={String(selectedLessonStats.marked)} icon={CheckCircle2} />
                <CompactStat label="Missing" value={String(selectedLessonStats.missing)} icon={AlertCircle} />
                <CompactStat
                  label="Lesson time"
                  value={formatTimeRange(selectedLesson.startTime, selectedLesson.endTime)}
                  icon={Clock3}
                />
              </div>

              {selectedClassHealth ? (
                <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-400">
                        Class health
                      </p>
                      <h3 className="mt-2 text-lg font-semibold text-slate-900">
                        {selectedClassHealth.name}
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        Needs help now: {selectedClassHealth.highRiskCount + selectedClassHealth.mediumRiskCount} students
                      </p>
                    </div>
                    <Link
                      href={`/teacher/students?classId=${selectedClassHealth.id}`}
                      className="text-sm font-semibold text-sky-600"
                    >
                      Open class support view
                    </Link>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <MiniHealthStat
                      label="Attendance"
                      value={formatRate(selectedClassHealth.averageAttendanceRate)}
                    />
                    <MiniHealthStat
                      label="Average score"
                      value={formatRate(selectedClassHealth.averageScore)}
                    />
                    <MiniHealthStat
                      label="High risk"
                      value={String(selectedClassHealth.highRiskCount)}
                    />
                  </div>

                  <div className="mt-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                      Needs help now
                    </p>
                    <div className="mt-3 space-y-3">
                      {selectedClassNeedsHelp.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-500">
                          No flagged students for this class right now.
                        </div>
                      ) : (
                        selectedClassNeedsHelp.map((student) => (
                          <div
                            key={student.id}
                            className="rounded-2xl border border-slate-200 bg-white px-4 py-4"
                          >
                            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                              <div>
                                <p className="font-medium text-slate-900">{student.displayName}</p>
                                <p className="mt-1 text-sm text-slate-500">
                                  {student.flags.join(" | ") || "Monitoring in progress"}
                                </p>
                              </div>
                              <span className={riskBadge(student.riskLevel)}>
                                {student.riskLevel === "high" ? "High risk" : "Watch closely"}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => applyBulkStatus("PRESENT")}
                      className="rounded-full bg-emerald-100 px-3 py-2 text-xs font-semibold text-emerald-700"
                    >
                      Mark all present
                    </button>
                    <button
                      type="button"
                      onClick={() => applyBulkStatus("ABSENT")}
                      className="rounded-full bg-rose-100 px-3 py-2 text-xs font-semibold text-rose-700"
                    >
                      Mark all absent
                    </button>
                    <button
                      type="button"
                      onClick={() => applyBulkStatus(null)}
                      className="rounded-full bg-slate-200 px-3 py-2 text-xs font-semibold text-slate-700"
                    >
                      Clear statuses
                    </button>
                    <button
                      type="button"
                      onClick={clearVisibleRemarks}
                      className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-slate-700 ring-1 ring-slate-200"
                    >
                      Clear remarks
                    </button>
                  </div>

                  <label className="flex items-center gap-2 text-sm text-slate-600">
                    <Search className="h-4 w-4 text-slate-400" />
                    <input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search roster"
                      className="min-w-[220px] bg-transparent outline-none"
                    />
                  </label>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                {filteredRoster.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 p-5 text-sm text-slate-500">
                    No students match this search.
                  </div>
                ) : (
                  filteredRoster.map((student) => (
                    <div
                      key={student.id}
                      className="rounded-2xl border border-slate-200 px-4 py-4"
                    >
                      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                        <div>
                          <p className="font-medium text-slate-900">{student.displayName}</p>
                          <p className="mt-1 text-sm text-slate-500">
                            {student.admissionNumber || "No admission number"}
                            {student.email ? ` | ${student.email}` : ""}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {STATUS_VALUES.map((status) => (
                            <button
                              key={status}
                              type="button"
                              onClick={() => setStudentStatus(student.id, status)}
                              className={`rounded-full px-3 py-2 text-xs font-semibold transition ${
                                student.status === status
                                  ? statusPill(status)
                                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                              }`}
                            >
                              {formatStatusLabel(status)}
                            </button>
                          ))}
                          <span className={statusPill(student.status)}>{formatStatusLabel(student.status)}</span>
                        </div>
                      </div>

                      <div className="mt-4">
                        <label className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                          Remarks
                        </label>
                        <input
                          value={student.remarks || ""}
                          onChange={(event) => setStudentRemarks(student.id, event.target.value)}
                          placeholder="Add attendance remarks"
                          className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-sky-200"
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 p-10 text-center text-sm text-slate-500">
              Select a lesson to inspect its roster and completion state.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function SummaryTags({
  title,
  items,
  emptyLabel,
}: {
  title: string;
  items: string[];
  emptyLabel: string;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {items.length === 0 ? (
          <p className="text-sm text-slate-500">{emptyLabel}</p>
        ) : (
          items.map((item) => (
            <span key={item} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
              {item}
            </span>
          ))
        )}
      </div>
    </section>
  );
}

function CompactStat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: any;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 px-4 py-4">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-sky-50 text-sky-600">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">{label}</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
        </div>
      </div>
    </div>
  );
}

function MiniHealthStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <p className="text-xs uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function stateBadge(state: "complete" | "incomplete" | "empty") {
  if (state === "complete") {
    return "rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700";
  }
  if (state === "incomplete") {
    return "rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700";
  }
  return "rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500";
}

function statusPill(status: AttendanceStatus | null) {
  if (status === "PRESENT") return "bg-emerald-100 text-emerald-700";
  if (status === "LATE") return "bg-amber-100 text-amber-700";
  if (status === "ABSENT") return "bg-rose-100 text-rose-700";
  if (status === "EXCUSED") return "bg-sky-100 text-sky-700";
  return "bg-slate-100 text-slate-500";
}

function formatStatusLabel(status: AttendanceStatus | null) {
  if (!status) return "Unmarked";
  if (status === "PRESENT") return "Present";
  if (status === "ABSENT") return "Absent";
  if (status === "LATE") return "Late";
  return "Excused";
}

function formatTimeRange(startTime: string | null, endTime: string | null) {
  if (!startTime && !endTime) return "Time not set";
  if (startTime && endTime) return `${startTime} - ${endTime}`;
  return startTime || endTime || "Time not set";
}

function formatRate(value: number | null) {
  if (typeof value !== "number" || Number.isNaN(value)) return "No data";
  return `${Math.round(value)}%`;
}

function rankRisk(riskLevel: "low" | "medium" | "high") {
  if (riskLevel === "high") return 2;
  if (riskLevel === "medium") return 1;
  return 0;
}

function riskBadge(riskLevel: "low" | "medium" | "high") {
  if (riskLevel === "high") {
    return "rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700";
  }
  if (riskLevel === "medium") {
    return "rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700";
  }
  return "rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700";
}

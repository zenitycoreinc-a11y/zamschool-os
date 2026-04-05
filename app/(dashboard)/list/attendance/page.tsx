"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  Loader2,
  Search,
  Users,
} from "lucide-react";

import { buildRollcallCompletionState } from "@/lib/attendance-access";
import { formatLocalDateInputValue } from "@/lib/local-date";
import { supabase } from "@/lib/supabase";

type TeacherLessonRow = {
  id: string;
  date: string;
  className: string;
  subjectName: string;
  startTime: string | null;
  endTime: string | null;
  rosterCount: number;
  roster: Array<{ id: string; status: string | null }>;
};

type AdminAttendanceRow = {
  id: string;
  date: string;
  status: string;
  studentId: string;
  classId: string | null;
  teacherId: string | null;
  studentName: string;
  className: string;
  teacherName: string;
  subjectName: string;
  startTime: string | null;
};

type AdminAttendanceSummary = {
  summary: Record<string, number>;
  classBreakdown: Array<{
    id: string;
    name: string;
    attendanceCount: number;
    lessonCount: number;
    summary: Record<string, number>;
  }>;
  teacherBreakdown: Array<{
    id: string;
    name: string;
    attendanceCount: number;
    lessonCount: number;
    summary: Record<string, number>;
  }>;
  rows: AdminAttendanceRow[];
};

type RoleMode = "TEACHER" | "ADMIN" | "UNSUPPORTED";

export default function AttendanceListPage() {
  const [roleMode, setRoleMode] = useState<RoleMode>("UNSUPPORTED");
  const [date, setDate] = useState(() => formatLocalDateInputValue());
  const [range, setRange] = useState("1m");
  const [classFilter, setClassFilter] = useState("all");
  const [teacherFilter, setTeacherFilter] = useState("all");
  const [studentFilter, setStudentFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [teacherLessons, setTeacherLessons] = useState<TeacherLessonRow[]>([]);
  const [adminSummary, setAdminSummary] = useState<AdminAttendanceSummary | null>(null);

  useEffect(() => {
    void loadAttendanceView();
  }, [date, range, classFilter, teacherFilter, studentFilter]);

  const filteredTeacherLessons = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return teacherLessons;

    return teacherLessons.filter((lesson) =>
      `${lesson.subjectName} ${lesson.className} ${lesson.startTime || ""}`
        .toLowerCase()
        .includes(term)
    );
  }, [search, teacherLessons]);

  const filteredAdminRows = useMemo(() => {
    const rows = adminSummary?.rows || [];
    const term = search.trim().toLowerCase();
    if (!term) return rows;

    return rows.filter((row) =>
      `${row.studentName} ${row.teacherName} ${row.className} ${row.subjectName} ${row.status}`
        .toLowerCase()
        .includes(term)
    );
  }, [adminSummary, search]);

  const adminStudentOptions = useMemo(() => {
    const options = new Map<string, string>();
    for (const row of adminSummary?.rows || []) {
      if (row.studentId) {
        options.set(row.studentId, row.studentName);
      }
    }

    return Array.from(options.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [adminSummary]);

  async function loadAttendanceView() {
    setLoading(true);
    setError("");

    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        throw new Error("Sign in again to view attendance.");
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", auth.user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      const normalizedRole = String(profile?.role || "").trim().toUpperCase();
      if (normalizedRole === "TEACHER") {
        setRoleMode("TEACHER");
        const response = await fetch(`/api/teacher/classes?date=${date}`, {
          cache: "no-store",
        });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error || "Failed to load teacher attendance");
        }

        setTeacherLessons(payload.data || []);
        setAdminSummary(null);
        return;
      }

      if (normalizedRole === "ADMIN") {
        setRoleMode("ADMIN");
        const params = new URLSearchParams({ range });
        if (classFilter !== "all") {
          params.set("classId", classFilter);
        }
        if (teacherFilter !== "all") {
          params.set("teacherId", teacherFilter);
        }
        if (studentFilter !== "all") {
          params.set("studentId", studentFilter);
        }

        const response = await fetch(`/api/admin/attendance/summary?${params.toString()}`, {
          cache: "no-store",
        });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error || "Failed to load attendance reporting");
        }

        setAdminSummary(payload.data || null);
        setTeacherLessons([]);
        return;
      }

      setRoleMode("UNSUPPORTED");
      setTeacherLessons([]);
      setAdminSummary(null);
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load attendance");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex-1 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-400">
            Attendance
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">
            {roleMode === "ADMIN" ? "School attendance reporting" : "Lesson rollcall log"}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            {roleMode === "ADMIN"
              ? "Review class, teacher, and student attendance trends across the selected reporting window."
              : "Track lesson-by-lesson rollcall completion using the same lesson-based attendance contract."}
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {roleMode === "ADMIN" ? (
            <>
              <select
                value={range}
                onChange={(event) => setRange(event.target.value)}
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none"
              >
                <option value="1w">Last week</option>
                <option value="1m">Last month</option>
                <option value="3m">Last 3 months</option>
                <option value="6m">Last 6 months</option>
                <option value="1y">Last year</option>
                <option value="3y">Last 3 years</option>
              </select>

              <select
                value={classFilter}
                onChange={(event) => setClassFilter(event.target.value)}
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none"
              >
                <option value="all">All classes</option>
                {(adminSummary?.classBreakdown || []).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>

              <select
                value={teacherFilter}
                onChange={(event) => setTeacherFilter(event.target.value)}
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none"
              >
                <option value="all">All teachers</option>
                {(adminSummary?.teacherBreakdown || []).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>

              <select
                value={studentFilter}
                onChange={(event) => setStudentFilter(event.target.value)}
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none"
              >
                <option value="all">All students</option>
                {adminStudentOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </>
          ) : (
            <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-600">
              <CalendarDays className="h-4 w-4 text-slate-400" />
              <input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="bg-transparent outline-none"
              />
            </label>
          )}

          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search attendance"
              className="bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
            />
          </div>
        </div>
      </div>

      {error ? (
        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      {loading ? (
        <div className="mt-8 grid place-items-center rounded-3xl border border-dashed border-slate-200 p-16 text-sm text-slate-500">
          <Loader2 className="mb-3 h-5 w-5 animate-spin" />
          Loading attendance...
        </div>
      ) : roleMode === "ADMIN" ? (
        <AdminAttendanceView summary={adminSummary} rows={filteredAdminRows} />
      ) : roleMode === "TEACHER" ? (
        <TeacherAttendanceView lessons={filteredTeacherLessons} />
      ) : (
        <div className="mt-8 rounded-3xl border border-dashed border-slate-200 p-8 text-sm text-slate-500">
          This attendance screen is currently available for admin reporting and teacher rollcall only.
        </div>
      )}
    </div>
  );
}

function TeacherAttendanceView({ lessons }: { lessons: TeacherLessonRow[] }) {
  if (lessons.length === 0) {
    return (
      <div className="mt-8 rounded-3xl border border-dashed border-slate-200 p-8 text-sm text-slate-500">
        No lesson attendance records were found for that date.
      </div>
    );
  }

  return (
    <div className="mt-8 grid gap-4">
      {lessons.map((lesson) => {
        const marked = lesson.roster.filter((student) => Boolean(student.status)).length;
        const state = buildRollcallCompletionState({
          rosterCount: lesson.rosterCount,
          selectedStatuses: marked,
        });

        return (
          <div key={lesson.id} className="rounded-3xl border border-slate-200 p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="font-semibold text-slate-900">{lesson.subjectName}</p>
                <p className="mt-1 text-sm text-slate-500">
                  {lesson.className} | {lesson.date} | {formatTimeRange(lesson.startTime, lesson.endTime)}
                </p>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <Users className="h-4 w-4" />
                  {marked}/{lesson.rosterCount}
                </span>
                <span className={teacherStateBadge(state)}>
                  {state === "complete" ? "Saved" : state === "incomplete" ? "Pending" : "Empty"}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AdminAttendanceView({
  summary,
  rows,
}: {
  summary: AdminAttendanceSummary | null;
  rows: AdminAttendanceRow[];
}) {
  if (!summary) {
    return (
      <div className="mt-8 rounded-3xl border border-dashed border-slate-200 p-8 text-sm text-slate-500">
        No attendance summary is available for that range.
      </div>
    );
  }

  const cards = [
    { label: "Present", value: summary.summary.PRESENT || 0 },
    { label: "Absent", value: summary.summary.ABSENT || 0 },
    { label: "Late", value: summary.summary.LATE || 0 },
    { label: "Excused", value: summary.summary.EXCUSED || 0 },
  ];

  return (
    <div className="mt-8 space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-3xl bg-slate-50 p-5">
            <p className="text-sm text-slate-500">{card.label}</p>
            <p className="mt-3 text-3xl font-semibold text-slate-900">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <BreakdownCard
          title="Class breakdown"
          items={summary.classBreakdown.map((item) => ({
            id: item.id,
            name: item.name,
            meta: `${item.attendanceCount} rows • ${item.lessonCount} lessons`,
          }))}
        />
        <BreakdownCard
          title="Teacher breakdown"
          items={summary.teacherBreakdown.map((item) => ({
            id: item.id,
            name: item.name,
            meta: `${item.attendanceCount} rows • ${item.lessonCount} lessons`,
          }))}
        />
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200">
        <div className="grid grid-cols-[1.2fr,1fr,1fr,1fr,0.8fr] gap-4 border-b border-slate-200 bg-slate-50 px-5 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
          <span>Student</span>
          <span>Class</span>
          <span>Teacher</span>
          <span>Lesson</span>
          <span>Status</span>
        </div>

        <div className="divide-y divide-slate-100">
          {rows.length === 0 ? (
            <div className="px-5 py-8 text-sm text-slate-500">No attendance rows matched the current filters.</div>
          ) : (
            rows.slice(0, 80).map((row) => (
              <div
                key={row.id}
                className="grid grid-cols-[1.2fr,1fr,1fr,1fr,0.8fr] gap-4 px-5 py-4 text-sm text-slate-600"
              >
                <div>
                  <p className="font-medium text-slate-900">{row.studentName}</p>
                  <p className="mt-1 text-xs text-slate-400">{row.date}</p>
                </div>
                <span>{row.className}</span>
                <span>{row.teacherName}</span>
                <span>{row.subjectName}</span>
                <span className={adminStatusBadge(row.status)}>{row.status}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function BreakdownCard({
  title,
  items,
}: {
  title: string;
  items: Array<{ id: string; name: string; meta: string }>;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 p-5">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <div className="mt-4 space-y-3">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
            No data available.
          </div>
        ) : (
          items.map((item) => (
            <div key={item.id} className="rounded-2xl bg-slate-50 px-4 py-4">
              <p className="font-medium text-slate-900">{item.name}</p>
              <p className="mt-1 text-sm text-slate-500">{item.meta}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function teacherStateBadge(state: "complete" | "incomplete" | "empty") {
  if (state === "complete") {
    return "rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700";
  }

  if (state === "incomplete") {
    return "rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700";
  }

  return "rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500";
}

function adminStatusBadge(status: string) {
  if (status === "PRESENT") {
    return "inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700";
  }

  if (status === "ABSENT") {
    return "inline-flex items-center rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700";
  }

  if (status === "LATE") {
    return "inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700";
  }

  return "inline-flex items-center rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700";
}

function formatTimeRange(startTime: string | null, endTime: string | null) {
  if (!startTime && !endTime) return "Time not set";
  if (startTime && endTime) return `${startTime} - ${endTime}`;
  return startTime || endTime || "Time not set";
}

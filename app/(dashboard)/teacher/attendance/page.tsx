"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Loader2,
  MoveRight,
  Search,
  Users,
} from "lucide-react";

import { formatLocalDateInputValue } from "@/lib/local-date";

type AttendanceRecord = {
  id: string;
  date: string;
  classId: string;
  className: string;
  studentId: string;
  studentName: string;
  admissionNumber: string | null;
  email: string | null;
  status: string;
  remarks: string | null;
  sessionName: string;
  sessionTime: string | null;
  recordedAt: string | null;
};

type AttendancePayload = {
  success?: boolean;
  data?: {
    window?: {
      range: string;
      startDate: string;
      endDate: string;
    };
    summary?: {
      totalRecords: number;
      classes: number;
      students: number;
      PRESENT: number;
      ABSENT: number;
      LATE: number;
      EXCUSED: number;
    };
    classOptions?: Array<{ id: string; label: string }>;
    records?: AttendanceRecord[];
  };
  error?: string;
};

const RANGE_OPTIONS = [
  { value: "1w", label: "1 week" },
  { value: "1m", label: "1 month" },
  { value: "3m", label: "3 months" },
  { value: "6m", label: "6 months" },
] as const;

export default function TeacherAttendancePage() {
  const [range, setRange] = useState("1m");
  const [endDate, setEndDate] = useState(() => formatLocalDateInputValue());
  const [classId, setClassId] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [classOptions, setClassOptions] = useState<Array<{ id: string; label: string }>>([]);
  const [windowLabel, setWindowLabel] = useState({ startDate: "", endDate: "" });
  const [summary, setSummary] = useState({
    totalRecords: 0,
    classes: 0,
    students: 0,
    PRESENT: 0,
    ABSENT: 0,
    LATE: 0,
    EXCUSED: 0,
  });

  useEffect(() => {
    void loadAttendance();
  }, [range, endDate, classId, query]);

  const groupedRecords = useMemo(() => {
    const groups = new Map<string, AttendanceRecord[]>();

    for (const record of records) {
      const key = record.date || "Unknown date";
      const existing = groups.get(key) || [];
      existing.push(record);
      groups.set(key, existing);
    }

    return Array.from(groups.entries());
  }, [records]);

  async function loadAttendance() {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        range,
        endDate,
      });

      if (classId) {
        params.set("classId", classId);
      }

      if (query.trim()) {
        params.set("query", query.trim());
      }

      const response = await fetch(`/api/teacher/attendance?${params.toString()}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as AttendancePayload;
      if (!response.ok) {
        throw new Error(payload.error || "Failed to load attendance history");
      }

      setRecords(payload.data?.records || []);
      setClassOptions(payload.data?.classOptions || []);
      setWindowLabel({
        startDate: payload.data?.window?.startDate || "",
        endDate: payload.data?.window?.endDate || "",
      });
      setSummary({
        totalRecords: payload.data?.summary?.totalRecords || 0,
        classes: payload.data?.summary?.classes || 0,
        students: payload.data?.summary?.students || 0,
        PRESENT: payload.data?.summary?.PRESENT || 0,
        ABSENT: payload.data?.summary?.ABSENT || 0,
        LATE: payload.data?.summary?.LATE || 0,
        EXCUSED: payload.data?.summary?.EXCUSED || 0,
      });
    } catch (loadError: unknown) {
      setRecords([]);
      setError(loadError instanceof Error ? loadError.message : "Failed to load attendance history");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-400">
              Teacher attendance
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">Attendance log</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              Review student attendance history across a date range, filter by class, and jump back
              into rollcall when a lesson needs attention.
            </p>
            <Link
              href="/teacher/teaching"
              className="mt-3 inline-flex text-sm font-semibold text-sky-600"
            >
              Back to teaching hub
            </Link>
          </div>

          <Link
            href="/teacher/classes"
            className="inline-flex items-center gap-2 rounded-2xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white hover:bg-sky-700"
          >
            Open rollcall
            <MoveRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-6 grid gap-3 xl:grid-cols-[180px,180px,240px,minmax(0,1fr)]">
          <label className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-600">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              Date range
            </span>
            <select
              value={range}
              onChange={(event) => setRange(event.target.value)}
              className="w-full bg-transparent outline-none"
            >
              {RANGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-600">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              End date
            </span>
            <input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              className="w-full bg-transparent outline-none"
            />
          </label>

          <label className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-600">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              Class filter
            </span>
            <select
              value={classId}
              onChange={(event) => setClassId(event.target.value)}
              className="w-full bg-transparent outline-none"
            >
              <option value="">All assigned classes</option>
              {classOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-600">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search students or sessions"
              className="w-full bg-transparent outline-none"
            />
          </label>
        </div>

        {windowLabel.startDate && windowLabel.endDate ? (
          <p className="mt-4 text-sm text-slate-500">
            Student attendance history from {windowLabel.startDate} to {windowLabel.endDate}
          </p>
        ) : null}

        {error ? (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <AttendanceStat label="Records" value={String(summary.totalRecords)} icon={ClipboardList} />
        <AttendanceStat label="Students" value={String(summary.students)} icon={Users} />
        <AttendanceStat label="Present" value={String(summary.PRESENT)} icon={CheckCircle2} />
        <AttendanceStat label="Absent" value={String(summary.ABSENT)} icon={CalendarDays} />
        <AttendanceStat label="Late + Excused" value={String(summary.LATE + summary.EXCUSED)} icon={CalendarDays} />
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Student attendance history</h2>
            <p className="text-sm text-slate-500">{summary.classes} class filter match(es)</p>
          </div>
          {loading ? <Loader2 className="h-5 w-5 animate-spin text-slate-400" /> : null}
        </div>

        <div className="mt-5 space-y-6">
          {!loading && records.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
              No attendance records are available for this view.
            </div>
          ) : null}

          {groupedRecords.map(([groupDate, groupRows]) => (
            <div key={groupDate} className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-400">
                  {groupDate}
                </h3>
                <span className="text-xs text-slate-400">{groupRows.length} record(s)</span>
              </div>

              {groupRows.map((record) => (
                <article
                  key={record.id}
                  className="rounded-2xl border border-slate-200 px-4 py-4"
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">{record.studentName}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {record.className} | {record.sessionName}
                        {record.sessionTime ? ` | ${record.sessionTime}` : ""}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {record.admissionNumber || "No admission number"}
                        {record.email ? ` | ${record.email}` : ""}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <span className={statusPill(record.status)}>{formatStatusLabel(record.status)}</span>
                      <Link
                        href="/teacher/classes"
                        className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Open class workspace
                      </Link>
                    </div>
                  </div>

                  {record.remarks ? (
                    <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                      {record.remarks}
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function AttendanceStat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: any;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">{value}</p>
        </div>
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-sky-50 text-sky-600">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function statusPill(status: string) {
  if (status === "PRESENT") {
    return "rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700";
  }
  if (status === "ABSENT") {
    return "rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700";
  }
  if (status === "LATE") {
    return "rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700";
  }
  if (status === "EXCUSED") {
    return "rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700";
  }
  return "rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500";
}

function formatStatusLabel(status: string) {
  if (status === "PRESENT") return "Present";
  if (status === "ABSENT") return "Absent";
  if (status === "LATE") return "Late";
  if (status === "EXCUSED") return "Excused";
  return "Unmarked";
}

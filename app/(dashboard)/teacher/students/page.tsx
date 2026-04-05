"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, Loader2, Search } from "lucide-react";

type TeacherStudentResultSummary = {
  id: string;
  assessmentType: string;
  date: string | null;
  score: number | null;
  maxScore: number | null;
  percentage: number | null;
  remarks: string | null;
};

type TeacherStudentRow = {
  id: string;
  profileId: string | null;
  contactId: string;
  classId: string;
  className: string;
  admissionNumber: string | null;
  displayName: string;
  email: string | null;
  attendance: {
    total: number;
    present: number;
    absent: number;
    late: number;
    excused: number;
    rate: number | null;
  };
  results: {
    total: number;
    averageScore: number | null;
    lowScoreCount: number;
    recent: TeacherStudentResultSummary[];
  };
  flags: string[];
  riskLevel: "low" | "medium" | "high";
};

type TeacherClassHealthSummary = {
  id: string;
  name: string;
  studentCount: number;
  highRiskCount: number;
  mediumRiskCount: number;
  averageAttendanceRate: number | null;
  averageScore: number | null;
};

type TeacherStudentsResponse = {
  success?: boolean;
  data?: {
    students: TeacherStudentRow[];
    classHealth: TeacherClassHealthSummary[];
    summary: {
      totalStudents: number;
      classes: number;
      highRiskStudents: number;
      mediumRiskStudents: number;
    };
  };
  error?: string;
};

export default function TeacherStudentsPage() {
  const [students, setStudents] = useState<TeacherStudentRow[]>([]);
  const [classHealth, setClassHealth] = useState<TeacherClassHealthSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [sortMode, setSortMode] = useState("name");

  useEffect(() => {
    void loadStudents();
  }, []);

  const classOptions = useMemo(
    () => classHealth.map((item) => ({ id: item.id, name: item.name })),
    [classHealth]
  );

  const filteredStudents = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    const nextRows = students.filter((student) => {
      if (classFilter !== "all" && student.classId !== classFilter) {
        return false;
      }

      if (!term) {
        return true;
      }

      return [
        student.displayName,
        student.className,
        student.admissionNumber,
        student.email,
        ...student.flags,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term);
    });

    return nextRows.sort((left, right) => compareStudents(left, right, sortMode));
  }, [classFilter, searchTerm, sortMode, students]);

  async function loadStudents() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/teacher/students", {
        cache: "no-store",
      });
      const payload = (await response.json()) as TeacherStudentsResponse;
      if (!response.ok) {
        throw new Error(payload.error || "Failed to load teacher students");
      }

      setStudents(payload.data?.students || []);
      setClassHealth(payload.data?.classHealth || []);
    } catch (loadError: unknown) {
      setStudents([]);
      setClassHealth([]);
      setError(loadError instanceof Error ? loadError.message : "Failed to load teacher students");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex-1 p-4 md:p-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-400">
              Students
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">My students</h1>
            <p className="mt-2 text-sm text-slate-500">
              Open any student to view their full profile.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-3 xl:min-w-[720px]">
            <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search students"
                className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
              />
            </label>

            <select
              value={classFilter}
              onChange={(event) => setClassFilter(event.target.value)}
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none"
            >
              <option value="all">All classes</option>
              {classOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>

            <select
              value={sortMode}
              onChange={(event) => setSortMode(event.target.value)}
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none"
            >
              <option value="name">Sort by name</option>
              <option value="class">Sort by class</option>
              <option value="admission">Sort by ID</option>
            </select>
          </div>
        </div>

        {error ? (
          <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
          <div className="hidden grid-cols-[minmax(0,2fr)_minmax(0,1.1fr)_minmax(0,1.2fr)_120px] gap-4 bg-slate-50 px-5 py-4 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 md:grid">
            <span>Student</span>
            <span>Class</span>
            <span>Student ID</span>
            <span>Action</span>
          </div>

          {loading ? (
            <div className="flex items-center gap-3 px-5 py-6 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading students...
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="px-5 py-6 text-sm text-slate-500">No students match this view.</div>
          ) : (
            <div className="divide-y divide-slate-200">
              {filteredStudents.map((student) => (
                <Link
                  key={student.id}
                  href={`/teacher/students/${student.id}`}
                  className="block px-5 py-4 transition hover:bg-sky-50/60"
                >
                  <div className="flex flex-col gap-3 md:grid md:grid-cols-[minmax(0,2fr)_minmax(0,1.1fr)_minmax(0,1.2fr)_120px] md:items-center md:gap-4">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-900">{student.displayName}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {student.email || "No email recorded"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">{student.className}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">
                        {student.admissionNumber || "Not recorded"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-sky-600">
                      <span className="text-sm font-medium">Open</span>
                      <ArrowUpRight className="h-4 w-4" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function compareStudents(left: TeacherStudentRow, right: TeacherStudentRow, sortMode: string) {
  if (sortMode === "class") {
    const classCompare = left.className.localeCompare(right.className);
    if (classCompare !== 0) return classCompare;
    return left.displayName.localeCompare(right.displayName);
  }

  if (sortMode === "admission") {
    return (left.admissionNumber || "").localeCompare(right.admissionNumber || "");
  }

  return left.displayName.localeCompare(right.displayName);
}

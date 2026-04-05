"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  ClipboardList,
  GraduationCap,
  Loader2,
  Mail,
  MessageSquare,
  ShieldAlert,
  UserRound,
  Users,
} from "lucide-react";

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

type TeacherStudentsResponse = {
  success?: boolean;
  data?: {
    students: TeacherStudentRow[];
  };
  error?: string;
};

const ATTENDANCE_SEGMENTS: Array<{
  key: keyof TeacherStudentRow["attendance"];
  label: string;
  tone: string;
}> = [
  { key: "present", label: "Present", tone: "bg-emerald-500" },
  { key: "late", label: "Late", tone: "bg-amber-400" },
  { key: "excused", label: "Excused", tone: "bg-sky-400" },
  { key: "absent", label: "Absent", tone: "bg-rose-500" },
];

export default function TeacherStudentDetailPage() {
  const params = useParams<{ id: string }>();
  const studentId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const [student, setStudent] = useState<TeacherStudentRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadStudent() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch("/api/teacher/students", { cache: "no-store" });
        const payload = (await response.json()) as TeacherStudentsResponse;
        if (!response.ok) {
          throw new Error(payload.error || "Failed to load student details");
        }

        const match = payload.data?.students.find((item) => item.id === studentId) || null;
        if (!match) {
          throw new Error("Student not found");
        }

        setStudent(match);
      } catch (loadError: unknown) {
        setStudent(null);
        setError(loadError instanceof Error ? loadError.message : "Failed to load student details");
      } finally {
        setLoading(false);
      }
    }

    if (studentId) {
      void loadStudent();
    }
  }, [studentId]);

  const badges = useMemo(() => {
    if (!student) return [] as string[];
    return student.flags.length ? student.flags : [formatRisk(student.riskLevel)];
  }, [student]);

  const attendanceSegments = useMemo(() => {
    if (!student || student.attendance.total <= 0) {
      return ATTENDANCE_SEGMENTS.map((segment) => ({
        ...segment,
        count: 0,
        percent: 0,
      }));
    }

    return ATTENDANCE_SEGMENTS.map((segment) => {
      const count = Number(student.attendance[segment.key] || 0);
      const percent = Math.round((count / student.attendance.total) * 100);
      return { ...segment, count, percent };
    });
  }, [student]);

  return (
    <div className="flex-1 space-y-6 p-4 md:p-6">
      <section className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-sky-50 to-indigo-50 p-6 shadow-sm">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex items-start gap-4">
            <div className="grid h-16 w-16 shrink-0 place-items-center rounded-3xl bg-sky-600 text-white shadow-sm">
              <UserRound className="h-7 w-7" />
            </div>

            <div>
              <Link href="/teacher/students" className="inline-flex items-center gap-2 text-sm font-medium text-sky-700">
                <ArrowLeft className="h-4 w-4" />
                Back to students
              </Link>
              <p className="mt-4 text-sm font-medium uppercase tracking-[0.18em] text-slate-400">
                Student profile
              </p>
              <h1 className="mt-2 text-3xl font-semibold text-slate-900">
                {loading ? "Loading student..." : student?.displayName || "Student details"}
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600">
                Clear view of class placement, attendance, academic signals, and next actions for this student.
              </p>

              {student ? (
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className={riskBadgeClass(student.riskLevel)}>{formatRisk(student.riskLevel)}</span>
                  <InlineMeta label="Class" value={student.className} />
                  <InlineMeta label="Admission" value={student.admissionNumber || "Not recorded"} />
                  <InlineMeta label="Email" value={student.email || "Not recorded"} />
                </div>
              ) : null}
            </div>
          </div>

          {student ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:w-[360px]">
              <QuickAction
                href={`/teacher/classes?classId=${student.classId}&view=roster`}
                label="Open class roster"
                icon={Users}
                tone="primary"
              />
              <QuickAction
                href={`/teacher/classes?classId=${student.classId}`}
                label="Open class workspace"
                icon={GraduationCap}
              />
              <QuickAction
                href="/teacher/results"
                label="Open results"
                icon={BookOpen}
              />
              <QuickAction
                href={`/teacher/messages?contactId=${student.contactId}&compose=1&role=student&subject=${encodeURIComponent(
                  `Support check-in: ${student.displayName}`
                )}`}
                label="Message student"
                icon={MessageSquare}
              />
            </div>
          ) : null}
        </div>
      </section>

      {loading ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex items-center gap-3 text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading student details...
          </div>
        </div>
      ) : error ? (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700 shadow-sm">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">Unable to load this student</p>
              <p className="mt-1">{error}</p>
            </div>
          </div>
        </div>
      ) : student ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SummaryCard label="Attendance rate" value={formatPercent(student.attendance.rate)} icon={GraduationCap} />
            <SummaryCard label="Average score" value={formatPercent(student.results.averageScore)} icon={BookOpen} />
            <SummaryCard label="Results logged" value={String(student.results.total)} icon={ClipboardList} />
            <SummaryCard label="Attendance records" value={String(student.attendance.total)} icon={Users} />
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr),minmax(320px,0.85fr)]">
            <div className="space-y-6">
              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-xl font-semibold text-slate-900">Student overview</h2>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Current snapshot
                  </span>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <InfoCard label="Full name" value={student.displayName} />
                  <InfoCard label="Class" value={student.className} />
                  <InfoCard label="Admission number" value={student.admissionNumber || "Not recorded"} />
                  <InfoCard label="Email" value={student.email || "Not recorded"} />
                  <InfoCard label="Risk level" value={formatRisk(student.riskLevel)} />
                  <InfoCard label="Low scores" value={String(student.results.lowScoreCount)} />
                </div>
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">Attendance breakdown</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      {student.attendance.total > 0
                        ? `${student.attendance.total} attendance record(s) included in this summary.`
                        : "No attendance records have been captured yet."}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-slate-700">{formatPercent(student.attendance.rate)}</span>
                </div>

                <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-100">
                  <div className="flex h-full w-full">
                    {attendanceSegments.map((segment) => (
                      <div
                        key={segment.label}
                        className={segment.tone}
                        style={{ width: `${segment.percent}%` }}
                        title={`${segment.label}: ${segment.count}`}
                      />
                    ))}
                  </div>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  {attendanceSegments.map((segment) => (
                    <AttendanceRow
                      key={segment.label}
                      label={segment.label}
                      value={segment.count}
                      percent={segment.percent}
                      tone={segment.tone}
                    />
                  ))}
                </div>
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-xl font-semibold text-slate-900">Recent results</h2>
                  <Link href="/teacher/results" className="text-sm font-medium text-sky-600">
                    Open results
                  </Link>
                </div>

                <div className="mt-4 space-y-3">
                  {student.results.recent.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-5 text-sm text-slate-500">
                      No recent results were found for this student.
                    </div>
                  ) : (
                    student.results.recent.map((result) => (
                      <div key={result.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{result.assessmentType}</p>
                            <p className="mt-1 text-xs text-slate-500">{formatDate(result.date)}</p>
                          </div>
                          <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-slate-200">
                            {formatScore(result)}
                          </span>
                        </div>
                        {result.remarks ? <p className="mt-3 text-sm leading-6 text-slate-600">{result.remarks}</p> : null}
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>

            <div className="space-y-6">
              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-2xl bg-amber-50 text-amber-600">
                    <ShieldAlert className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">Flags and watchpoints</h2>
                    <p className="text-sm text-slate-500">Quick indicators to help you support this student.</p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {badges.map((flag) => (
                    <span key={flag} className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                      {flag}
                    </span>
                  ))}
                </div>

                <div className="mt-5 space-y-3">
                  <SupportTip
                    title="Class placement"
                    description={`Student is currently linked to ${student.className}. Open the class workspace for roll call, results, and roster review.`}
                  />
                  <SupportTip
                    title="Attendance focus"
                    description={buildAttendanceTip(student)}
                  />
                  <SupportTip
                    title="Academic focus"
                    description={buildAcademicTip(student)}
                  />
                </div>
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold text-slate-900">Contact and actions</h2>
                <div className="mt-4 space-y-3">
                  <InfoLine icon={Mail} label="Email" value={student.email || "Not recorded"} />
                  <InfoLine icon={Users} label="Class" value={student.className} />
                  <InfoLine icon={ClipboardList} label="Admission number" value={student.admissionNumber || "Not recorded"} />
                </div>

                <div className="mt-5 grid gap-3">
                  <QuickAction
                    href={`/teacher/messages?contactId=${student.contactId}&compose=1&role=student&subject=${encodeURIComponent(
                      `Progress update for ${student.displayName}`
                    )}`}
                    label="Send progress message"
                    icon={MessageSquare}
                    tone="primary"
                  />
                  <QuickAction
                    href={`/teacher/classes?classId=${student.classId}&view=roster`}
                    label="Review class roster"
                    icon={Users}
                  />
                </div>
              </section>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

function formatPercent(value: number | null) {
  return value == null ? "N/A" : `${value}%`;
}

function formatRisk(riskLevel: TeacherStudentRow["riskLevel"]) {
  if (riskLevel === "high") return "Needs help now";
  if (riskLevel === "medium") return "Watch list";
  return "On track";
}

function riskBadgeClass(riskLevel: TeacherStudentRow["riskLevel"]) {
  if (riskLevel === "high") {
    return "rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700";
  }

  if (riskLevel === "medium") {
    return "rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700";
  }

  return "rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700";
}

function formatScore(result: TeacherStudentResultSummary) {
  if (result.percentage != null) {
    return `${result.percentage}%`;
  }

  if (result.score != null) {
    return result.maxScore != null ? `${result.score}/${result.maxScore}` : `${result.score}`;
  }

  return "Not graded";
}

function formatDate(value: string | null) {
  if (!value) return "No date";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function buildAttendanceTip(student: TeacherStudentRow) {
  if (student.attendance.total === 0) {
    return "No attendance data is available yet. Once roll calls are recorded, this card will help surface attendance risk quickly.";
  }

  if ((student.attendance.rate || 0) < 75) {
    return "Attendance is below 75%. Consider checking absences, following up with the learner, and confirming any support needs.";
  }

  if (student.attendance.late > 0 || student.attendance.absent > 0) {
    return "Attendance is mostly stable, but there are some lateness or absence signals worth monitoring this week.";
  }

  return "Attendance is steady with no major warning signs in the current summary.";
}

function buildAcademicTip(student: TeacherStudentRow) {
  if (student.results.total === 0) {
    return "No graded results are available yet. Use assignments and assessments to start building an academic performance picture.";
  }

  if ((student.results.averageScore || 0) < 50 || student.results.lowScoreCount > 0) {
    return "Recent academic results suggest this student may need extra review, targeted feedback, or a check-in after class.";
  }

  return "Recent academic performance looks stable based on the available result history.";
}

function SummaryCard({ label, value, icon: Icon }: { label: string; value: string; icon: any }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
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

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-2 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function InfoLine({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white text-slate-600 ring-1 ring-slate-200">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</p>
        <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
      </div>
    </div>
  );
}

function AttendanceRow({
  label,
  value,
  percent,
  tone,
}: {
  label: string;
  value: number;
  percent: number;
  tone: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className={`h-3 w-3 rounded-full ${tone}`} />
          <span className="text-sm font-medium text-slate-700">{label}</span>
        </div>
        <span className="text-sm font-semibold text-slate-900">{value}</span>
      </div>
      <p className="mt-2 text-xs text-slate-500">{percent}% of captured attendance</p>
    </div>
  );
}

function SupportTip({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}

function InlineMeta({ label, value }: { label: string; value: string }) {
  return (
    <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
      {label}: {value}
    </span>
  );
}

function QuickAction({
  href,
  label,
  icon: Icon,
  tone,
}: {
  href: string;
  label: string;
  icon: any;
  tone?: "primary";
}) {
  const className =
    tone === "primary"
      ? "inline-flex items-center justify-center gap-2 rounded-2xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-700"
      : "inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50";

  return (
    <Link href={href} className={className}>
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  );
}

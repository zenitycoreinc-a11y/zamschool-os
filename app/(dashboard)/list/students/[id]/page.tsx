"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  GraduationCap,
  Loader2,
  Mail,
  Phone,
  School,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { supabase } from "@/lib/supabase";

type StudentProfile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  status: string | null;
  admission_number: string | null;
  class_id: string | null;
  grade_id: string | null;
  gender: string | null;
  date_of_birth: string | null;
  address: string | null;
  emergency_contact: string | null;
  medical_notes: string | null;
  avatar_url: string | null;
  photo: string | null;
  created_at: string | null;
};

type ClassRow = {
  id: string;
  name: string | null;
  grade_id?: string | null;
};

type GradeRow = {
  id: string;
  name?: string | null;
  level?: number | null;
};

export default function SingleStudentPage() {
  const params = useParams<{ id: string }>();
  const studentId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [classRow, setClassRow] = useState<ClassRow | null>(null);
  const [gradeRow, setGradeRow] = useState<GradeRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadStudent() {
      setLoading(true);
      setError("");

      try {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select(
            "id, first_name, last_name, name, email, phone, status, admission_number, class_id, grade_id, gender, date_of_birth, address, emergency_contact, medical_notes, avatar_url, photo, created_at"
          )
          .eq("id", studentId)
          .eq("role", "STUDENT")
          .maybeSingle();

        if (profileError) throw profileError;
        if (!profile) throw new Error("Student not found");

        setStudent(profile);

        const nextClassId = String(profile.class_id || "").trim();
        const nextGradeId = String(profile.grade_id || "").trim();

        if (nextClassId) {
          const { data: klass, error: classError } = await supabase
            .from("classes")
            .select("id, name, grade_id")
            .eq("id", nextClassId)
            .maybeSingle();

          if (!classError && klass) {
            setClassRow(klass);
            if (!nextGradeId && klass.grade_id) {
              const { data: gradeFromClass, error: gradeError } = await loadGrade(String(klass.grade_id));
              if (!gradeError) {
                setGradeRow(gradeFromClass);
              }
            }
          }
        }

        if (nextGradeId) {
          const { data: grade, error: gradeError } = await loadGrade(nextGradeId);
          if (!gradeError) {
            setGradeRow(grade);
          }
        }
      } catch (loadError: unknown) {
        setStudent(null);
        setClassRow(null);
        setGradeRow(null);
        setError(loadError instanceof Error ? loadError.message : "Failed to load student profile");
      } finally {
        setLoading(false);
      }
    }

    if (studentId) {
      void loadStudent();
    }
  }, [studentId]);

  const displayName = useMemo(() => {
    if (!student) return "Student profile";
    return [student.first_name, student.last_name].filter(Boolean).join(" ").trim() || student.name || student.email || "Student";
  }, [student]);

  const classLabel = useMemo(() => {
    const className = String(classRow?.name || "").trim();
    const gradeLevel = gradeRow?.level;
    const gradeName = String(gradeRow?.name || "").trim();

    if (gradeLevel != null && className) {
      return `Grade ${gradeLevel} - ${className}`;
    }

    if (gradeName && className) {
      return `${gradeName} - ${className}`;
    }

    return className || gradeName || "Not assigned";
  }, [classRow, gradeRow]);

  return (
    <div className="flex-1 space-y-6 p-4 md:p-6">
      <section className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-violet-50 to-sky-50 p-6 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="relative h-20 w-20 overflow-hidden rounded-3xl border border-white/70 bg-white shadow-sm">
              {student?.photo || student?.avatar_url ? (
                <Image
                  src={student.photo || student.avatar_url || "/avatar-placeholder.svg"}
                  alt={displayName}
                  fill
                  className="object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="grid h-full w-full place-items-center text-sky-600">
                  <UserRound className="h-8 w-8" />
                </div>
              )}
            </div>

            <div>
              <Link href="/list/students" className="inline-flex items-center gap-2 text-sm font-medium text-sky-700">
                <ArrowLeft className="h-4 w-4" />
                Back to students
              </Link>
              <p className="mt-4 text-sm font-medium uppercase tracking-[0.18em] text-slate-400">Student profile</p>
              <h1 className="mt-2 text-3xl font-semibold text-slate-900">{loading ? "Loading student..." : displayName}</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600">
                Admin view of student identity, enrollment details, wellbeing notes, and key contact information.
              </p>
            </div>
          </div>

          {student ? (
            <div className="flex flex-wrap gap-2">
              <Badge label={student.status || "ACTIVE"} tone={statusTone(student.status)} />
              <Badge label={classLabel} tone="slate" />
              <Badge label={student.admission_number || "No admission number"} tone="sky" />
            </div>
          ) : null}
        </div>
      </section>

      {loading ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex items-center gap-3 text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading student profile...
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
            <StatCard label="Class" value={classLabel} icon={GraduationCap} />
            <StatCard label="Status" value={student.status || "ACTIVE"} icon={ShieldCheck} />
            <StatCard label="Gender" value={student.gender || "Not recorded"} icon={UserRound} />
            <StatCard label="Joined" value={formatDate(student.created_at)} icon={CalendarDays} />
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr),minmax(320px,0.8fr)]">
            <div className="space-y-6">
              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold text-slate-900">Enrollment details</h2>
                <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <InfoCard label="Full name" value={displayName} />
                  <InfoCard label="Email" value={student.email || "Not recorded"} />
                  <InfoCard label="Phone" value={student.phone || "Not recorded"} />
                  <InfoCard label="Admission number" value={student.admission_number || "Not recorded"} />
                  <InfoCard label="Class" value={classLabel} />
                  <InfoCard label="Date of birth" value={formatDate(student.date_of_birth)} />
                </div>
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold text-slate-900">Student support notes</h2>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <LongInfoCard label="Address" value={student.address || "Not recorded"} />
                  <LongInfoCard label="Emergency contact" value={student.emergency_contact || "Not recorded"} />
                  <LongInfoCard label="Medical notes" value={student.medical_notes || "No medical notes recorded."} />
                  <LongInfoCard label="Grade" value={gradeDisplay(gradeRow)} />
                </div>
              </section>
            </div>

            <div className="space-y-6">
              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold text-slate-900">Contact details</h2>
                <div className="mt-4 space-y-3">
                  <InfoLine icon={Mail} label="Email" value={student.email || "Not recorded"} />
                  <InfoLine icon={Phone} label="Phone" value={student.phone || "Not recorded"} />
                  <InfoLine icon={School} label="Class" value={classLabel} />
                  <InfoLine icon={GraduationCap} label="Admission number" value={student.admission_number || "Not recorded"} />
                </div>
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold text-slate-900">Admin shortcuts</h2>
                <div className="mt-4 grid gap-3">
                  <Shortcut href={`/app/admin/users?tab=students&edit=${student.id}`} label="Edit student" />
                  <Shortcut href="/list/students" label="Back to student list" />
                  <Shortcut href="/app/admin/users?tab=students" label="Manage all students" />
                </div>
              </section>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

async function loadGrade(gradeId: string) {
  return supabase
    .from("grades")
    .select("id, name, level")
    .eq("id", gradeId)
    .maybeSingle();
}

function formatDate(value: string | null) {
  if (!value) return "Not recorded";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function gradeDisplay(grade: GradeRow | null) {
  if (!grade) return "Not recorded";
  if (grade.level != null && grade.name) return `Grade ${grade.level} - ${grade.name}`;
  if (grade.level != null) return `Grade ${grade.level}`;
  return grade.name || "Not recorded";
}

function statusTone(status: string | null) {
  if (String(status || "").toUpperCase() === "ACTIVE") return "emerald";
  if (String(status || "").toUpperCase() === "INACTIVE") return "slate";
  return "amber";
}

function Badge({ label, tone }: { label: string; tone: "emerald" | "amber" | "sky" | "slate" }) {
  const styles = {
    emerald: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-700",
    sky: "bg-sky-100 text-sky-700",
    slate: "bg-slate-100 text-slate-700",
  };

  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${styles[tone]}`}>{label}</span>;
}

function StatCard({ label, value, icon: Icon }: { label: string; value: string; icon: any }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="mt-3 text-lg font-semibold text-slate-900">{value}</p>
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

function LongInfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-2 text-sm leading-6 text-slate-700">{value}</p>
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

function Shortcut({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
    >
      {label}
    </Link>
  );
}

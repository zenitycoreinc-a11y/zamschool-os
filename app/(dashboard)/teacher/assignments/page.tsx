"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CalendarDays, CheckCircle2, Clock3, FileText, Loader2, Plus, Search, X } from "lucide-react";
import { format } from "date-fns";

import { fetchAccountProfile, type AccountProfilePayload } from "@/lib/account-profile-client";

type AssignmentRow = {
  id: string;
  title: string;
  description?: string | null;
  due_date?: string | null;
  total_marks?: number | null;
  created_at?: string | null;
  class_id?: string | null;
  subject_id?: string | null;
  classes?: { name?: string | null } | Array<{ name?: string | null }> | null;
  subjects?: { name?: string | null } | Array<{ name?: string | null }> | null;
  results?: Array<{ id: string; created_at?: string | null; grade?: string | null; score?: number | null }>;
  submittedCount?: number;
  gradedCount?: number;
  pendingGrades?: number;
  totalStudents?: number;
  status?: string;
};

type CreateAssignmentForm = {
  title: string;
  description: string;
  class_id: string;
  subject_id: string;
  due_date: string;
  due_time: string;
  total_marks: string;
};

const EMPTY_FORM: CreateAssignmentForm = {
  title: "",
  description: "",
  class_id: "",
  subject_id: "",
  due_date: "",
  due_time: "08:00",
  total_marks: "100",
};

export default function TeacherAssignmentsPage() {
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState("all");
  const [account, setAccount] = useState<AccountProfilePayload["data"] | null>(null);
  const [createForm, setCreateForm] = useState<CreateAssignmentForm>(EMPTY_FORM);

  useEffect(() => {
    void Promise.all([loadAssignments(), loadAccount()]);
  }, []);

  const summary = useMemo(() => {
    const totalAssignments = assignments.length;
    const overdue = assignments.filter((assignment) => assignment.status === "overdue").length;
    const active = assignments.filter((assignment) => assignment.status !== "overdue").length;
    const pendingGrades = assignments.reduce(
      (sum, assignment) => sum + Number(assignment.pendingGrades || 0),
      0
    );

    return {
      totalAssignments,
      active,
      overdue,
      pendingGrades,
    };
  }, [assignments]);

  const filteredAssignments = useMemo(() => {
    return assignments.filter((assignment) => {
      const className = normalizeRelation(assignment.classes, { name: "Class" }).name || "Class";
      const subjectName = normalizeRelation(assignment.subjects, { name: "Subject" }).name || "Subject";
      const matchesSearch =
        assignment.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        className.toLowerCase().includes(searchTerm.toLowerCase()) ||
        subjectName.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      switch (filter) {
        case "active":
          return assignment.status !== "overdue";
        case "overdue":
          return assignment.status === "overdue";
        case "grading":
          return Number(assignment.pendingGrades || 0) > 0;
        default:
          return true;
      }
    });
  }, [assignments, filter, searchTerm]);

  async function loadAccount() {
    try {
      const payload = await fetchAccountProfile();
      const nextAccount = payload.data || null;
      setAccount(nextAccount);
      setCreateForm((current) => ({
        ...current,
        class_id: current.class_id || nextAccount?.teacher?.assignedClasses?.[0]?.id || "",
        subject_id: current.subject_id || nextAccount?.teacher?.assignedSubjects?.[0]?.id || "",
      }));
    } catch {
      setAccount(null);
    }
  }

  async function loadAssignments() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/teacher/assignments", {
        cache: "no-store",
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Failed to load assignments");
      }

      const nextAssignments = ((payload.data || []) as AssignmentRow[]).map((assignment) => {
        const submittedCount = Number(assignment.submittedCount || 0);
        const gradedCount = Number(assignment.gradedCount || 0);
        return {
          ...assignment,
          submittedCount,
          gradedCount,
          totalStudents: Number(assignment.totalStudents || 0),
          pendingGrades: Number(assignment.pendingGrades || Math.max(submittedCount - gradedCount, 0)),
          status:
            assignment.status ||
            getAssignmentStatus(
              assignment.due_date || null,
              submittedCount,
              Number(assignment.totalStudents || 0)
            ),
        };
      });

      setAssignments(nextAssignments);
    } catch (loadError: any) {
      setAssignments([]);
      setError(loadError?.message || "Failed to load assignments");
    } finally {
      setLoading(false);
    }
  }

  async function createAssignment() {
    if (!createForm.title.trim() || !createForm.class_id || !createForm.subject_id || !createForm.due_date) {
      setError("Complete the assignment form before saving.");
      return;
    }

    setCreating(true);
    setError("");

    try {
      const dueDate = new Date(`${createForm.due_date}T${createForm.due_time || "08:00"}:00`);
      const response = await fetch("/api/teacher/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: createForm.title.trim(),
          description: createForm.description.trim() || undefined,
          class_id: createForm.class_id,
          subject_id: createForm.subject_id,
          due_date: dueDate.toISOString(),
          total_marks: Number(createForm.total_marks || 0),
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Failed to create assignment");
      }

      setCreateOpen(false);
      setCreateForm((current) => ({
        ...EMPTY_FORM,
        class_id: current.class_id,
        subject_id: current.subject_id,
      }));
      await loadAssignments();
    } catch (createError: any) {
      setError(createError?.message || "Failed to create assignment");
    } finally {
      setCreating(false);
    }
  }

  const assignedClasses = account?.teacher?.assignedClasses || [];
  const assignedSubjects = account?.teacher?.assignedSubjects || [];

  return (
    <div className="flex-1 space-y-6 p-4 md:p-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-400">
              Teacher assignments
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">Assignments</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              Review deadlines, submission progress, grading backlog, and create a new assignment
              without leaving the teacher workspace.
            </p>
            <Link
              href="/teacher/teaching"
              className="mt-3 inline-flex text-sm font-semibold text-sky-600"
            >
              Back to teaching hub
            </Link>
          </div>

          <div className="flex flex-wrap gap-3">
            <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-600">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search assignments"
                className="bg-transparent outline-none"
              />
            </label>
            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-sky-200"
            >
              <option value="all">All assignments</option>
              <option value="active">Active</option>
              <option value="overdue">Overdue</option>
              <option value="grading">Needs grading</option>
            </select>
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="inline-flex items-center gap-2 rounded-2xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white hover:bg-sky-700"
            >
              <Plus className="h-4 w-4" />
              New assignment
            </button>
          </div>
        </div>

        {error ? (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Assignments" value={String(summary.totalAssignments)} icon={FileText} />
        <StatCard label="Active" value={String(summary.active)} icon={Clock3} />
        <StatCard label="Overdue" value={String(summary.overdue)} icon={CalendarDays} />
        <StatCard label="Pending grades" value={String(summary.pendingGrades)} icon={CheckCircle2} />
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Assignment register</h2>
            <p className="text-sm text-slate-500">{filteredAssignments.length} visible row(s)</p>
          </div>
          {loading ? <Loader2 className="h-5 w-5 animate-spin text-slate-400" /> : null}
        </div>

        <div className="mt-5 space-y-4">
          {!loading && filteredAssignments.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
              No assignments match this view.
            </div>
          ) : null}

          {filteredAssignments.map((assignment) => {
            const className = normalizeRelation(assignment.classes, { name: "Class" }).name || "Class";
            const subjectName = normalizeRelation(assignment.subjects, { name: "Subject" }).name || "Subject";
            return (
              <article key={assignment.id} className="rounded-2xl border border-slate-200 p-5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold text-slate-900">{assignment.title}</h3>
                      <span className={statusPill(String(assignment.status || "active"))}>
                        {formatStatusLabel(String(assignment.status || "active"))}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-500">
                      {className} | {subjectName}
                    </p>
                    {assignment.description ? (
                      <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                        {assignment.description}
                      </p>
                    ) : null}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[320px]">
                    <MiniStat label="Due date" value={formatDateLabel(assignment.due_date)} />
                    <MiniStat label="Total marks" value={String(assignment.total_marks || 0)} />
                    <MiniStat label="Submitted" value={`${assignment.submittedCount || 0}/${assignment.totalStudents || 0}`} />
                    <MiniStat label="Pending grades" value={String(assignment.pendingGrades || 0)} />
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {createOpen ? (
        <div className="fixed inset-0 z-40 grid place-items-center bg-slate-900/40 p-4">
          <section className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-400">
                  Assignment builder
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-900">New assignment</h2>
              </div>

              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <Field
                label="Title"
                value={createForm.title}
                onChange={(value) => setCreateForm((current) => ({ ...current, title: value }))}
                className="md:col-span-2"
              />
              <SelectField
                label="Class"
                value={createForm.class_id}
                onChange={(value) => setCreateForm((current) => ({ ...current, class_id: value }))}
                options={assignedClasses.map((item) => ({ value: item.id, label: item.name }))}
              />
              <SelectField
                label="Subject"
                value={createForm.subject_id}
                onChange={(value) => setCreateForm((current) => ({ ...current, subject_id: value }))}
                options={assignedSubjects.map((item) => ({ value: item.id, label: item.name }))}
              />
              <Field
                label="Due date"
                value={createForm.due_date}
                type="date"
                onChange={(value) => setCreateForm((current) => ({ ...current, due_date: value }))}
              />
              <Field
                label="Due time"
                value={createForm.due_time}
                type="time"
                onChange={(value) => setCreateForm((current) => ({ ...current, due_time: value }))}
              />
              <Field
                label="Total marks"
                value={createForm.total_marks}
                type="number"
                onChange={(value) => setCreateForm((current) => ({ ...current, total_marks: value }))}
              />
              <label className="md:col-span-2">
                <span className="mb-1 block text-xs font-medium text-slate-600">Description</span>
                <textarea
                  value={createForm.description}
                  onChange={(event) =>
                    setCreateForm((current) => ({ ...current, description: event.target.value }))
                  }
                  rows={5}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-200"
                />
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void createAssignment()}
                disabled={creating}
                className="inline-flex items-center gap-2 rounded-2xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-60"
              >
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Create assignment
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function getAssignmentStatus(dueDate: string | null, submittedCount: number, totalStudents: number) {
  const due = dueDate ? new Date(dueDate) : null;
  if (due && !Number.isNaN(due.getTime()) && due.getTime() < Date.now()) {
    return "overdue";
  }
  if (submittedCount === 0) return "not-started";
  if (submittedCount < totalStudents) return "in-progress";
  return "complete";
}

function normalizeRelation<T>(value: T | T[] | null | undefined, fallback: T): T {
  if (Array.isArray(value)) {
    return value[0] || fallback;
  }
  return value || fallback;
}

function formatDateLabel(value: string | null | undefined) {
  if (!value) return "No due date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return format(date, "dd MMM yyyy");
}

function formatStatusLabel(status: string) {
  if (status === "not-started") return "Not started";
  if (status === "in-progress") return "In progress";
  if (status === "complete") return "Complete";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function statusPill(status: string) {
  if (status === "overdue") return "rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700";
  if (status === "complete") return "rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700";
  if (status === "in-progress") return "rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700";
  return "rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600";
}

function StatCard({
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

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-2 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  className?: string;
}) {
  return (
    <label className={className}>
      <span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
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
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label>
      <span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-200"
      >
        <option value="">Select {label.toLowerCase()}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

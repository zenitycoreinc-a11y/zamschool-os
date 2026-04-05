"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Pagination from "@/components/Pagination";
import { supabase } from "@/lib/supabase";
import { getDisplayName } from "@/lib/profile-utils";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";
import { useSearchParams } from "next/navigation";
import { parseQueryState, computeRange } from "@/lib/list-query-state";
import { useListQuery } from "@/lib/use-list-query";
import {
  buildAssignmentSummary,
  filterAssignments,
  getAssignmentActionItems,
  type AssignmentWorkspaceItem,
} from "@/lib/assignment-workspace";
import { CalendarDays, Loader2, MoreHorizontal, Plus, Trash2, X } from "lucide-react";

type AssignmentForm = {
  id?: string;
  title: string;
  subject_id: string;
  class_id: string;
  teacher_id: string;
  due_date: string;
  total_marks: string;
  description: string;
};

const EMPTY_FORM: AssignmentForm = {
  title: "",
  subject_id: "",
  class_id: "",
  teacher_id: "",
  due_date: "",
  total_marks: "100",
  description: "",
};

export default function AssignmentList() {
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [form, setForm] = useState<AssignmentForm>(EMPTY_FORM);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState<"all" | "due-soon" | "overdue">("all");
  const [menuId, setMenuId] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const { page, pageSize, updateQuery } = useListQuery();

  const fetchRows = useCallback(async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    const { data: me } = await supabase.from("profiles").select("school_id").eq("id", auth.user.id).single();
    if (!me?.school_id) return;
    setSchoolId(me.school_id);
    const { from, to } = computeRange(page, pageSize);

    const [{ data: assignments, count }, { data: subjectsData }, { data: classesData }, { data: teacherProfiles }] = await Promise.all([
      supabase.from("assignments").select("id, title, subject_id, class_id, teacher_id, due_date, total_marks, description", { count: "exact" }).eq("school_id", me.school_id).order("created_at", { ascending: false }).range(from, to),
      supabase.from("subjects").select("id, name").eq("school_id", me.school_id),
      supabase.from("classes").select("id, name").eq("school_id", me.school_id),
      supabase.from("profiles").select("id, first_name, last_name, email").eq("school_id", me.school_id).eq("role", "teacher"),
    ]);

    setTotal(count || 0);
    setSubjects(subjectsData || []);
    setClasses(classesData || []);
    setTeachers(teacherProfiles || []);

    const subjectMap = Object.fromEntries((subjectsData || []).map((s: any) => [s.id, s.name]));
    const classMap = Object.fromEntries((classesData || []).map((c: any) => [c.id, c.name]));
    const teacherMap = Object.fromEntries((teacherProfiles || []).map((t: any) => [t.id, getDisplayName(t)]));

    setRows((assignments || []).map((a: any) => ({
      ...a,
      subject: subjectMap[a.subject_id] || "-",
      class: classMap[a.class_id] || "-",
      teacher: teacherMap[a.teacher_id] || "-",
      dueDateLabel: a.due_date ? formatDate(a.due_date) : "-",
      dueAt: a.due_date || "",
      totalMarks: Number(a.total_marks || 0),
      description: a.description || "",
    })));
  }, [page, pageSize]);

  useEffect(() => { void fetchRows(); }, [fetchRows]);
  useEffect(() => { const qs = parseQueryState(searchParams); setSearch(qs.q || ""); }, [searchParams]);

  const workspaceItems = useMemo<AssignmentWorkspaceItem[]>(() => rows.map((row) => ({
    id: row.id,
    title: row.title || "",
    class: row.class || "-",
    teacher: row.teacher || "-",
    dueAt: row.dueAt || "",
    totalMarks: row.totalMarks || 0,
    description: row.description || "",
  })), [rows]);

  const summary = useMemo(() => buildAssignmentSummary(workspaceItems), [workspaceItems]);
  const visibleIds = useMemo(() => new Set(filterAssignments(workspaceItems, { query: search, mode }).map((item) => item.id)), [mode, search, workspaceItems]);
  const visibleRows = useMemo(() => rows.filter((row) => visibleIds.has(row.id)), [rows, visibleIds]);

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  }

  function openEdit(item: any) {
    setEditingId(item.id);
    setForm({
      id: item.id,
      title: item.title || "",
      subject_id: item.subject_id || "",
      class_id: item.class_id || "",
      teacher_id: item.teacher_id || "",
      due_date: item.due_date || "",
      total_marks: String(item.total_marks || 100),
      description: item.description || "",
    });
    setFormOpen(true);
    setMenuId(null);
  }

  async function onSave() {
    if (!schoolId) return;
    if (!form.title.trim() || !form.subject_id || !form.class_id || !form.teacher_id || !form.due_date) {
      toast.error("Title, subject, class, teacher, and due date are required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        school_id: schoolId,
        title: form.title.trim(),
        subject_id: form.subject_id,
        class_id: form.class_id,
        teacher_id: form.teacher_id,
        due_date: form.due_date,
        total_marks: Number(form.total_marks || 100),
        description: form.description || null,
      };
      const result = editingId ? await supabase.from("assignments").update(payload).eq("id", editingId) : await supabase.from("assignments").insert(payload);
      if (result.error) throw result.error;
      toast.success(editingId ? "Assignment updated" : "Assignment created");
      setFormOpen(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
      await fetchRows();
    } catch (e: any) {
      toast.error(e.message || "Failed to save assignment");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id: string) {
    if (!confirm("Delete this assignment?")) return;
    const { error } = await supabase.from("assignments").delete().eq("id", id);
    if (error) {
      toast.error(error.message || "Delete failed");
      return;
    }
    toast.success("Assignment deleted");
    setMenuId(null);
    await fetchRows();
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:justify-between">
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-600">Assignment Workspace</p>
              <h1 className="mt-2 text-2xl font-bold text-slate-900 md:text-3xl">Assignments</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Create, adjust, and track assignment deadlines without the old decorative toolbar and dead controls.</p>
            </div>
            <div className="flex flex-wrap gap-3 text-sm">
              <Stat label="Total" value={String(summary.total)} />
              <Stat label="Due soon" value={String(summary.dueSoon)} />
              <Stat label="Overdue" value={String(summary.overdue)} />
              <Stat label="Missing brief" value={String(summary.missingDescription)} />
            </div>
          </div>
          <div className="w-full rounded-[24px] border border-slate-200 bg-slate-50 p-4 xl:max-w-xl">
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Search assignments</span>
                <input value={search} onChange={(e) => { setSearch(e.target.value); updateQuery({ q: e.target.value, page: 1 }); }} placeholder="Search title, class, or teacher" className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-amber-100" />
              </label>
              <button type="button" onClick={openCreate} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 md:self-end">
                <Plus className="h-4 w-4" /> Create assignment
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {([
                { key: "all", label: "All" },
                { key: "due-soon", label: "Due soon" },
                { key: "overdue", label: "Overdue" },
              ] as const).map((item) => (
                <button key={item.key} type="button" onClick={() => setMode(item.key)} className={`rounded-full px-3 py-2 text-xs font-semibold ${mode === item.key ? "bg-amber-500 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"}`}>
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4 md:px-6">
          <h2 className="text-lg font-semibold text-slate-900">Current assignments</h2>
          <p className="text-sm text-slate-500">Each action here is live: edit, delete, filter, search, and pagination.</p>
        </div>

        <div className="space-y-3 p-4 md:p-6">
          {visibleRows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">No assignments match this view.</div>
          ) : visibleRows.map((item) => (
            <div key={item.id} className="rounded-[24px] border border-slate-200 bg-white px-4 py-4 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-semibold text-slate-900">{item.title}</h3>
                    <StatusPill dueAt={item.dueAt} />
                  </div>
                  <div className="grid gap-2 text-sm text-slate-600 sm:grid-cols-2 xl:grid-cols-4">
                    <span>{item.class}</span>
                    <span>{item.teacher}</span>
                    <span className="inline-flex items-center gap-1"><CalendarDays className="h-4 w-4" /> {item.dueDateLabel}</span>
                    <span>{item.totalMarks} marks</span>
                  </div>
                  <p className="text-sm leading-6 text-slate-500">{item.description || "No assignment brief added yet."}</p>
                </div>

                <div className="relative self-start">
                  <button type="button" onClick={() => setMenuId((current) => current === item.id ? null : item.id)} className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-100 text-slate-600 ring-1 ring-slate-200">
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                  {menuId === item.id ? (
                    <div className="absolute right-0 z-10 mt-2 w-44 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl">
                      {getAssignmentActionItems().map((action) => action.key === "edit" ? (
                        <button key={action.key} type="button" onClick={() => openEdit(item)} className="flex w-full rounded-xl px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50">{action.label}</button>
                      ) : (
                        <button key={action.key} type="button" onClick={() => void onDelete(item.id)} className="flex w-full rounded-xl px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-50">{action.label}</button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="px-4 pb-5 md:px-6">
          <Pagination page={page} pageSize={pageSize} total={total} onPageChange={(nextPage) => updateQuery({ page: nextPage })} />
        </div>
      </section>

      {formOpen ? (
        <div className="fixed inset-0 z-50 bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="mx-auto grid min-h-full max-w-4xl place-items-center">
            <div className="w-full rounded-[28px] border border-slate-200 bg-white p-5 shadow-2xl md:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-600">Assignment editor</p>
                  <h2 className="mt-2 text-xl font-semibold text-slate-900">{editingId ? "Edit assignment" : "Create assignment"}</h2>
                  <p className="mt-1 text-sm text-slate-500">Set the class, subject, teacher, due date, and assignment brief in one deliberate workspace.</p>
                </div>
                <button type="button" onClick={() => setFormOpen(false)} className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-100 text-slate-600">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <Field label="Title" value={form.title} onChange={(value) => setForm((prev) => ({ ...prev, title: value }))} />
                <SelectField label="Subject" value={form.subject_id} onChange={(value) => setForm((prev) => ({ ...prev, subject_id: value }))} options={subjects.map((x: any) => ({ value: x.id, label: x.name }))} />
                <SelectField label="Class" value={form.class_id} onChange={(value) => setForm((prev) => ({ ...prev, class_id: value }))} options={classes.map((x: any) => ({ value: x.id, label: x.name }))} />
                <SelectField label="Teacher" value={form.teacher_id} onChange={(value) => setForm((prev) => ({ ...prev, teacher_id: value }))} options={teachers.map((x: any) => ({ value: x.id, label: getDisplayName(x) }))} />
                <Field type="date" label="Due date" value={form.due_date} onChange={(value) => setForm((prev) => ({ ...prev, due_date: value }))} />
                <Field label="Total marks" value={form.total_marks} onChange={(value) => setForm((prev) => ({ ...prev, total_marks: value }))} />
                <TextArea label="Assignment brief" value={form.description} onChange={(value) => setForm((prev) => ({ ...prev, description: value }))} className="md:col-span-2 xl:col-span-3" />
              </div>

              <div className="mt-6 flex justify-end gap-2">
                <button type="button" onClick={() => setFormOpen(false)} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700">Cancel</button>
                <button type="button" onClick={() => void onSave()} disabled={saving} className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}{editingId ? "Save changes" : "Create assignment"}</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"><div className="text-xs uppercase tracking-[0.16em] text-slate-500">{label}</div><div className="mt-2 text-lg font-semibold text-slate-900">{value}</div></div>;
}

function StatusPill({ dueAt }: { dueAt: string }) {
  const today = new Date().toISOString().slice(0, 10);
  const diff = Math.round((Date.parse(`${dueAt}T00:00:00.000Z`) - Date.parse(`${today}T00:00:00.000Z`)) / 86400000);
  const label = diff < 0 ? "Overdue" : diff <= 2 ? "Due soon" : "Scheduled";
  const classes = diff < 0 ? "bg-rose-100 text-rose-700" : diff <= 2 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700";
  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${classes}`}>{label}</span>;
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string; }) {
  return <label><span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</span><input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-amber-100" /></label>;
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Array<{ value: string; label: string }>; }) {
  return <label><span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</span><select value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-amber-100">{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;
}

function TextArea({ label, value, onChange, className = "" }: { label: string; value: string; onChange: (value: string) => void; className?: string; }) {
  return <label className={className}><span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</span><textarea value={value} onChange={(e) => onChange(e.target.value)} rows={4} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-amber-100" /></label>;
}

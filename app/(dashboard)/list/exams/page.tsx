"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import { Filter, SlidersHorizontal, Plus, Edit, Trash2, X, Save } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";
import { computeRange } from "@/lib/list-query-state";
import { useListQuery } from "@/lib/use-list-query";

const columns = [
  { header: "Title", accessor: "name" },
  { header: "Class", accessor: "class" },
  { header: "Subject", accessor: "subject", className: "hidden md:table-cell" },
  { header: "Date", accessor: "date", className: "hidden md:table-cell" },
  { header: "Actions", accessor: "action" },
];

type ExamForm = {
  id?: string;
  title: string;
  subject_id: string;
  class_id: string;
  exam_date: string;
  duration_minutes: string;
  total_marks: string;
  description: string;
};

const emptyForm: ExamForm = {
  title: "",
  subject_id: "",
  class_id: "",
  exam_date: "",
  duration_minutes: "60",
  total_marks: "100",
  description: "",
};

export default function ExamList() {
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ExamForm>(emptyForm);
  const { page, pageSize, q, updateQuery } = useListQuery();
  const search = q || "";

  const fetchRows = useCallback(async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    const { data: me } = await supabase.from("profiles").select("school_id").eq("id", auth.user.id).single();
    if (!me?.school_id) return;
    setSchoolId(me.school_id);

    const { from, to } = computeRange(page, pageSize);

    const [{ data: exams, count }, { data: subjectsData }, { data: classesData }] = await Promise.all([
      supabase
        .from("exams")
        .select("id, title, subject_id, class_id, exam_date, duration_minutes, total_marks, description", { count: "exact" })
        .eq("school_id", me.school_id)
        .order("created_at", { ascending: false })
        .range(from, to),
      supabase.from("subjects").select("id, name").eq("school_id", me.school_id),
      supabase.from("classes").select("id, name").eq("school_id", me.school_id),
    ]);
    setTotal(count || 0);

    setSubjects(subjectsData || []);
    setClasses(classesData || []);
    const subjectMap = Object.fromEntries((subjectsData || []).map((s: any) => [s.id, s.name]));
    const classMap = Object.fromEntries((classesData || []).map((c: any) => [c.id, c.name]));

    setRows(
      (exams || []).map((e: any) => ({
        ...e,
        class: classMap[e.class_id] || "-",
        subject: subjectMap[e.subject_id] || "-",
        date: e.exam_date ? formatDate(e.exam_date) : "-",
      }))
    );
  }, [page, pageSize]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormOpen(true);
  };

  const openEdit = (item: any) => {
    setEditingId(item.id);
    setForm({
      id: item.id,
      title: item.title || "",
      subject_id: item.subject_id || "",
      class_id: item.class_id || "",
      exam_date: item.exam_date || "",
      duration_minutes: String(item.duration_minutes || 60),
      total_marks: String(item.total_marks || 100),
      description: item.description || "",
    });
    setFormOpen(true);
  };

  const onSave = async () => {
    if (!schoolId) return;
    if (!form.title.trim() || !form.subject_id || !form.class_id || !form.exam_date) {
      toast.error("Title, subject, class and date are required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        school_id: schoolId,
        title: form.title.trim(),
        subject_id: form.subject_id,
        class_id: form.class_id,
        exam_date: form.exam_date,
        duration_minutes: Number(form.duration_minutes || 60),
        total_marks: Number(form.total_marks || 100),
        description: form.description || null,
      };
      if (editingId) {
        const { error } = await supabase.from("exams").update(payload).eq("id", editingId);
        if (error) throw error;
        toast.success("Exam updated");
      } else {
        const { error } = await supabase.from("exams").insert(payload);
        if (error) throw error;
        toast.success("Exam created");
      }
      setFormOpen(false);
      setForm(emptyForm);
      setEditingId(null);
      fetchRows();
    } catch (e: any) {
      toast.error(e.message || "Failed to save exam");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id: string) => {
    if (!confirm("Delete this exam?")) return;
    const { error } = await supabase.from("exams").delete().eq("id", id);
    if (error) {
      toast.error(error.message || "Delete failed");
      return;
    }
    toast.success("Exam deleted");
    fetchRows();
  };

  const renderRow = (item: any) => (
    <tr key={item.id} className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-lamaPurpleLight">
      <td className="p-4">{item.title}</td>
      <td>{item.class}</td>
      <td className="hidden md:table-cell">{item.subject}</td>
      <td className="hidden md:table-cell">{item.date}</td>
      <td>
        <div className="flex items-center gap-2">
          <button onClick={() => openEdit(item)} className="w-7 h-7 flex items-center justify-center rounded-full bg-lamaSky"><Edit className="w-4 h-4 text-white" /></button>
          <button onClick={() => onDelete(item.id)} className="w-7 h-7 flex items-center justify-center rounded-full bg-lamaPurple"><Trash2 className="w-4 h-4 text-white" /></button>
        </div>
      </td>
    </tr>
  );

  const visibleRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((item) =>
      `${item.title || ""} ${item.class || ""} ${item.subject || ""}`.toLowerCase().includes(term)
    );
  }, [rows, search]);

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">All Exams</h1>
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <TableSearch
            value={search}
            onChange={(value) => updateQuery({ q: value, page: 1 })}
            placeholder="Search exams"
          />
          <div className="flex items-center gap-4 self-end">
            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-lamaYellow"><Filter className="w-4 h-4 text-gray-600" /></button>
            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-lamaYellow"><SlidersHorizontal className="w-4 h-4 text-gray-600" /></button>
            <button onClick={openCreate} className="w-8 h-8 flex items-center justify-center rounded-full bg-lamaYellow"><Plus className="w-4 h-4 text-gray-600" /></button>
          </div>
        </div>
      </div>

      {formOpen ? (
        <div className="mt-4 rounded-xl border border-slate-200 p-4 bg-slate-50">
          <div className="grid md:grid-cols-4 gap-3">
            <input className="px-3 py-2 rounded-lg border border-slate-200" placeholder="Exam title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            <select className="px-3 py-2 rounded-lg border border-slate-200" value={form.subject_id} onChange={(e) => setForm((f) => ({ ...f, subject_id: e.target.value }))}>
              <option value="">Select subject</option>
              {subjects.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select className="px-3 py-2 rounded-lg border border-slate-200" value={form.class_id} onChange={(e) => setForm((f) => ({ ...f, class_id: e.target.value }))}>
              <option value="">Select class</option>
              {classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input type="date" className="px-3 py-2 rounded-lg border border-slate-200" value={form.exam_date} onChange={(e) => setForm((f) => ({ ...f, exam_date: e.target.value }))} />
            <input className="px-3 py-2 rounded-lg border border-slate-200" placeholder="Duration (minutes)" value={form.duration_minutes} onChange={(e) => setForm((f) => ({ ...f, duration_minutes: e.target.value }))} />
            <input className="px-3 py-2 rounded-lg border border-slate-200" placeholder="Total marks" value={form.total_marks} onChange={(e) => setForm((f) => ({ ...f, total_marks: e.target.value }))} />
            <input className="px-3 py-2 rounded-lg border border-slate-200 md:col-span-2" placeholder="Description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button onClick={onSave} disabled={saving} className="px-3 py-2 rounded-lg bg-slate-900 text-white flex items-center gap-2">{saving ? "Saving..." : <><Save className="w-4 h-4" /> Save</>}</button>
            <button onClick={() => setFormOpen(false)} className="px-3 py-2 rounded-lg border border-slate-300 text-slate-700 flex items-center gap-2"><X className="w-4 h-4" /> Cancel</button>
          </div>
        </div>
      ) : null}

      <Table columns={columns} renderRow={renderRow} data={visibleRows} />
      <Pagination
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={(nextPage) => updateQuery({ page: nextPage })}
      />
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import { Filter, SlidersHorizontal, Plus, Edit, Trash2, X, Save } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { computeRange } from "@/lib/list-query-state";
import { useListQuery } from "@/lib/use-list-query";
import { buildTeacherDirectory, mapLessonRows } from "@/lib/live-schema-adapters";

const columns = [
  { header: "Title", accessor: "title" },
  { header: "Class", accessor: "class" },
  { header: "Teacher", accessor: "teacher", className: "hidden md:table-cell" },
  { header: "Time", accessor: "time", className: "hidden md:table-cell" },
  { header: "Actions", accessor: "action" },
];

type LessonForm = {
  id?: string;
  title: string;
  subject_id: string;
  class_id: string;
  teacher_id: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
};

const emptyForm: LessonForm = {
  title: "",
  subject_id: "",
  class_id: "",
  teacher_id: "",
  day_of_week: "1",
  start_time: "08:00",
  end_time: "09:00",
};

export default function LessonList() {
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<LessonForm>(emptyForm);
  const { page, pageSize, q, updateQuery } = useListQuery();
  const search = q || "";

  const fetchRows = useCallback(async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    const { data: me } = await supabase.from("profiles").select("school_id").eq("id", auth.user.id).single();
    if (!me?.school_id) return;
    setSchoolId(me.school_id);

    const { from, to } = computeRange(page, pageSize);

    const [{ data: lessonsData, count }, { data: subjectsData }, { data: classesData }, { data: teacherRows }] = await Promise.all([
      supabase
        .from("lessons")
        .select("id, title, subject_id, class_id, teacher_id, day_of_week, start_time, end_time", { count: "exact" })
        .eq("school_id", me.school_id)
        .order("created_at", { ascending: false })
        .range(from, to),
      supabase.from("subjects").select("id, name").eq("school_id", me.school_id),
      supabase.from("classes").select("id, name").eq("school_id", me.school_id),
      supabase.from("teachers").select("id, profile_id").eq("school_id", me.school_id),
    ]);
    setTotal(count || 0);

    const teacherProfileIds = Array.from(new Set((teacherRows || []).map((row: any) => row.profile_id).filter(Boolean)));
    const { data: teacherProfiles } = teacherProfileIds.length
      ? await supabase.from("profiles").select("id, first_name, last_name, email").in("id", teacherProfileIds)
      : { data: [] as any[] };

    setSubjects(subjectsData || []);
    setClasses(classesData || []);
    const teacherDirectory = buildTeacherDirectory(teacherRows || [], teacherProfiles || []);
    setTeachers(teacherDirectory.options);

    const subjectMap = Object.fromEntries((subjectsData || []).map((s: any) => [s.id, s.name]));
    const classMap = Object.fromEntries((classesData || []).map((c: any) => [c.id, c.name]));
    setRows(mapLessonRows(lessonsData || [], classMap, subjectMap, teacherDirectory.nameByTeacherId));
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
      teacher_id: item.teacher_id || "",
      day_of_week: String(item.day_of_week || 1),
      start_time: item.start_time || "08:00",
      end_time: item.end_time || "09:00",
    });
    setFormOpen(true);
  };

  const onSave = async () => {
    if (!schoolId) return;
    if (!form.subject_id || !form.class_id || !form.teacher_id) {
      toast.error("Subject, class, and teacher are required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        school_id: schoolId,
        title: form.title || null,
        subject_id: form.subject_id,
        class_id: form.class_id,
        teacher_id: form.teacher_id,
        day_of_week: Number(form.day_of_week || 1),
        start_time: form.start_time || null,
        end_time: form.end_time || null,
      };
      if (editingId) {
        const { error } = await supabase.from("lessons").update(payload).eq("id", editingId);
        if (error) throw error;
        toast.success("Lesson updated");
      } else {
        const { error } = await supabase.from("lessons").insert(payload);
        if (error) throw error;
        toast.success("Lesson created");
      }
      setFormOpen(false);
      setForm(emptyForm);
      setEditingId(null);
      fetchRows();
    } catch (e: any) {
      toast.error(e.message || "Failed to save lesson");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id: string) => {
    if (!confirm("Delete this lesson?")) return;
    const { error } = await supabase.from("lessons").delete().eq("id", id);
    if (error) {
      toast.error(error.message || "Delete failed");
      return;
    }
    toast.success("Lesson deleted");
    fetchRows();
  };

  const renderRow = (item: any) => (
    <tr key={item.id} className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-lamaPurpleLight">
      <td className="p-4">{item.title || item.subject}</td>
      <td>{item.class}</td>
      <td className="hidden md:table-cell">{item.teacher}</td>
      <td className="hidden md:table-cell">{item.time}</td>
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
      `${item.title || ""} ${item.subject || ""} ${item.class || ""} ${item.teacher || ""}`
        .toLowerCase()
        .includes(term)
    );
  }, [rows, search]);

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">All Lessons</h1>
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <TableSearch
            value={search}
            onChange={(value) => updateQuery({ q: value, page: 1 })}
            placeholder="Search lessons"
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
            <input className="px-3 py-2 rounded-lg border border-slate-200" placeholder="Title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            <select className="px-3 py-2 rounded-lg border border-slate-200" value={form.subject_id} onChange={(e) => setForm((f) => ({ ...f, subject_id: e.target.value }))}>
              <option value="">Select subject</option>
              {subjects.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select className="px-3 py-2 rounded-lg border border-slate-200" value={form.class_id} onChange={(e) => setForm((f) => ({ ...f, class_id: e.target.value }))}>
              <option value="">Select class</option>
              {classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select className="px-3 py-2 rounded-lg border border-slate-200" value={form.teacher_id} onChange={(e) => setForm((f) => ({ ...f, teacher_id: e.target.value }))}>
              <option value="">Select teacher</option>
              {teachers.map((t: any) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
            <input className="px-3 py-2 rounded-lg border border-slate-200" placeholder="Day (1-7)" value={form.day_of_week} onChange={(e) => setForm((f) => ({ ...f, day_of_week: e.target.value }))} />
            <input type="time" className="px-3 py-2 rounded-lg border border-slate-200" value={form.start_time} onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value }))} />
            <input type="time" className="px-3 py-2 rounded-lg border border-slate-200" value={form.end_time} onChange={(e) => setForm((f) => ({ ...f, end_time: e.target.value }))} />
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

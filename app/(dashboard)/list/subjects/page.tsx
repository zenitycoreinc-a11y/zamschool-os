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

const columns = [
  { header: "Subject Name", accessor: "name" },
  { header: "Code", accessor: "code", className: "hidden md:table-cell" },
  { header: "Description", accessor: "description", className: "hidden lg:table-cell" },
  { header: "Actions", accessor: "action" },
];

type SubjectForm = { id?: string; name: string; code: string; description: string };
const emptyForm: SubjectForm = { name: "", code: "", description: "" };

export default function SubjectList() {
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<SubjectForm>(emptyForm);
  const { page, pageSize, q, updateQuery } = useListQuery();
  const search = q || "";

  const fetchRows = useCallback(async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    const { data: me } = await supabase.from("profiles").select("school_id").eq("id", auth.user.id).single();
    if (!me?.school_id) return;
    setSchoolId(me.school_id);

    const { from, to } = computeRange(page, pageSize);

    const { data, count } = await supabase
      .from("subjects")
      .select("id, name, code, description", { count: "exact" })
      .eq("school_id", me.school_id)
      .order("created_at", { ascending: false })
      .range(from, to);
    setTotal(count || 0);
    setRows(data || []);
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
    setForm({ id: item.id, name: item.name || "", code: item.code || "", description: item.description || "" });
    setFormOpen(true);
  };

  const onSave = async () => {
    if (!schoolId) return;
    if (!form.name.trim()) {
      toast.error("Subject name is required");
      return;
    }
    setSaving(true);
    try {
      const payload = { school_id: schoolId, name: form.name.trim(), code: form.code || null, description: form.description || null };
      if (editingId) {
        const { error } = await supabase.from("subjects").update(payload).eq("id", editingId);
        if (error) throw error;
        toast.success("Subject updated");
      } else {
        const { error } = await supabase.from("subjects").insert(payload);
        if (error) throw error;
        toast.success("Subject created");
      }
      setFormOpen(false);
      setForm(emptyForm);
      setEditingId(null);
      fetchRows();
    } catch (e: any) {
      toast.error(e.message || "Failed to save subject");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id: string) => {
    if (!confirm("Delete this subject?")) return;
    const { error } = await supabase.from("subjects").delete().eq("id", id);
    if (error) {
      toast.error(error.message || "Delete failed");
      return;
    }
    toast.success("Subject deleted");
    fetchRows();
  };

  const renderRow = (item: any) => (
    <tr key={item.id} className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-lamaPurpleLight">
      <td className="p-4">{item.name}</td>
      <td className="hidden md:table-cell">{item.code || "-"}</td>
      <td className="hidden lg:table-cell">{item.description || "-"}</td>
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
      `${item.name || ""} ${item.code || ""} ${item.description || ""}`.toLowerCase().includes(term)
    );
  }, [rows, search]);

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">All Subjects</h1>
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <TableSearch
            value={search}
            onChange={(value) => updateQuery({ q: value, page: 1 })}
            placeholder="Search subjects"
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
          <div className="grid md:grid-cols-3 gap-3">
            <input className="px-3 py-2 rounded-lg border border-slate-200" placeholder="Subject name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            <input className="px-3 py-2 rounded-lg border border-slate-200" placeholder="Code" value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} />
            <input className="px-3 py-2 rounded-lg border border-slate-200" placeholder="Description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
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

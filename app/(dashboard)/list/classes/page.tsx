"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import { Filter, SlidersHorizontal, Plus, Edit, Trash2, X, Save } from "lucide-react";
import { toast } from "sonner";
import { computeRange } from "@/lib/list-query-state";
import { useListQuery } from "@/lib/use-list-query";
import { adminApiJson } from "@/lib/admin-browser-api";

const columns = [
  { header: "Class Name", accessor: "name" },
  { header: "Capacity", accessor: "capacity", className: "hidden md:table-cell" },
  { header: "Grade", accessor: "grade", className: "hidden md:table-cell" },
  { header: "Supervisor", accessor: "supervisor", className: "hidden lg:table-cell" },
  { header: "Actions", accessor: "action" },
];

type ClassRow = {
  id: string;
  name: string;
  capacity: number | null;
  grade_id: string | null;
  grade: string;
  supervisor: string;
};

type GradeOption = {
  id: string;
  label: string;
};

type ClassForm = {
  id?: string;
  name: string;
  grade_id: string;
  grade_level: string;
  capacity: string;
};

const emptyForm: ClassForm = { name: "", grade_id: "", grade_level: "", capacity: "40" };

export default function ClassList() {
  const [rows, setRows] = useState<ClassRow[]>([]);
  const [grades, setGrades] = useState<GradeOption[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ClassForm>(emptyForm);
  const { page, pageSize, q, updateQuery } = useListQuery();
  const search = q || "";

  const fetchRows = useCallback(async () => {
    try {
      const [classesBody, gradesBody] = await Promise.all([
        adminApiJson<{ data?: any[] }>("/api/admin/classes"),
        adminApiJson<{ data?: any[] }>("/api/admin/grades").catch(() => ({ data: [] })),
      ]);

      setRows(
        (classesBody.data || []).map((item) => {
          const firstName = String(item?.profiles?.first_name || "").trim();
          const lastName = String(item?.profiles?.last_name || "").trim();
          const email = String(item?.profiles?.email || "").trim();
          const supervisor = [firstName, lastName].filter(Boolean).join(" ") || email || "Unassigned";
          const gradeName = String(item?.grades?.name || "").trim();
          const gradeLevel = item?.grades?.level;
          return {
            id: String(item.id),
            name: String(item.name || ""),
            capacity: item.capacity ?? null,
            grade_id: item.grade_id || null,
            grade: gradeName || (gradeLevel ? `Grade ${gradeLevel}` : "-"),
            supervisor,
          };
        })
      );

      setGrades(
        (gradesBody.data || []).flatMap((grade) => {
          const id = typeof grade?.id === "string" ? grade.id : "";
          if (!id) return [];
          const label =
            String(grade?.name || "").trim() ||
            (Number.isFinite(grade?.level) ? `Grade ${grade.level}` : "");
          return label ? [{ id, label }] : [];
        })
      );
    } catch (error: any) {
      toast.error(error?.message || "Failed to load classes");
    }
  }, []);

  useEffect(() => {
    void fetchRows();
  }, [fetchRows]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormOpen(true);
  };

  const openEdit = (item: ClassRow) => {
    setEditingId(item.id);
    setForm({
      id: item.id,
      name: item.name || "",
      grade_id: item.grade_id || "",
      grade_level: "",
      capacity: item.capacity?.toString() || "40",
    });
    setFormOpen(true);
  };

  const onSave = async () => {
    if (!form.name.trim()) {
      toast.error("Class name is required");
      return;
    }

    setSaving(true);
    try {
      const derivedGradeLevel = form.grade_level
        ? Number(form.grade_level)
        : deriveGradeLevel(form.name);
      const payload = {
        gradeId: form.grade_id || null,
        gradeLevel: Number.isFinite(derivedGradeLevel) ? derivedGradeLevel : undefined,
        name: form.name.trim(),
        capacity: form.capacity ? Number(form.capacity) : undefined,
      };

      if (editingId) {
        await adminApiJson("/api/admin/classes", {
          method: "PUT",
          body: JSON.stringify({
            id: editingId,
            name: payload.name,
            capacity: payload.capacity,
          }),
        });
        toast.success("Class updated");
      } else {
        await adminApiJson("/api/admin/classes", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toast.success("Class created");
      }

      setFormOpen(false);
      setForm(emptyForm);
      setEditingId(null);
      await fetchRows();
    } catch (error: any) {
      toast.error(error?.message || "Failed to save class");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id: string) => {
    if (!confirm("Delete this class?")) return;

    try {
      await adminApiJson(`/api/admin/classes?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      toast.success("Class deleted");
      await fetchRows();
    } catch (error: any) {
      toast.error(error?.message || "Delete failed");
    }
  };

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((item) =>
      `${item.name || ""} ${item.grade || ""} ${item.supervisor || ""}`.toLowerCase().includes(term)
    );
  }, [rows, search]);

  const pagedRows = useMemo(() => {
    const { from, to } = computeRange(page, pageSize);
    return filteredRows.slice(from, to + 1);
  }, [filteredRows, page, pageSize]);

  const renderRow = (item: ClassRow) => (
    <tr key={item.id} className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-lamaPurpleLight">
      <td className="p-4">{item.name}</td>
      <td className="hidden md:table-cell">{item.capacity ?? "-"}</td>
      <td className="hidden md:table-cell">{item.grade}</td>
      <td className="hidden lg:table-cell">{item.supervisor}</td>
      <td>
        <div className="flex items-center gap-2">
          <button onClick={() => openEdit(item)} className="w-7 h-7 flex items-center justify-center rounded-full bg-lamaSky">
            <Edit className="w-4 h-4 text-white" />
          </button>
          <button onClick={() => onDelete(item.id)} className="w-7 h-7 flex items-center justify-center rounded-full bg-lamaPurple">
            <Trash2 className="w-4 h-4 text-white" />
          </button>
        </div>
      </td>
    </tr>
  );

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">All Classes</h1>
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <TableSearch
            value={search}
            onChange={(value) => updateQuery({ q: value, page: 1 })}
            placeholder="Search classes"
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
            <input className="px-3 py-2 rounded-lg border border-slate-200" placeholder="Class name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            {editingId ? null : grades.length > 0 ? (
              <select className="px-3 py-2 rounded-lg border border-slate-200" value={form.grade_id} onChange={(e) => setForm((f) => ({ ...f, grade_id: e.target.value }))}>
                <option value="">No grade selected</option>
                {grades.map((g) => (
                  <option key={g.id} value={g.id}>{g.label}</option>
                ))}
              </select>
            ) : (
              <input
                type="number"
                min="1"
                max="13"
                className="px-3 py-2 rounded-lg border border-slate-200"
                placeholder="Grade level (optional)"
                value={form.grade_level}
                onChange={(e) => setForm((f) => ({ ...f, grade_level: e.target.value }))}
              />
            )}
            <input className="px-3 py-2 rounded-lg border border-slate-200" placeholder="Capacity" value={form.capacity} onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))} />
          </div>
          {grades.length === 0 ? (
            <p className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              No grades exist for this school yet. Create grades in <a href="/app/admin/grading-scales" className="underline font-medium">Grades &amp; Scales</a> before assigning classes.
            </p>
          ) : null}
          <div className="mt-3 flex items-center gap-2">
            <button onClick={onSave} disabled={saving} className="px-3 py-2 rounded-lg bg-slate-900 text-white flex items-center gap-2">{saving ? "Saving..." : <><Save className="w-4 h-4" /> Save</>}</button>
            <button onClick={() => setFormOpen(false)} className="px-3 py-2 rounded-lg border border-slate-300 text-slate-700 flex items-center gap-2"><X className="w-4 h-4" /> Cancel</button>
          </div>
        </div>
      ) : null}

      <Table columns={columns} renderRow={renderRow} data={pagedRows} />
      <Pagination
        page={page}
        pageSize={pageSize}
        total={filteredRows.length}
        onPageChange={(nextPage) => updateQuery({ page: nextPage })}
      />
    </div>
  );
}

function deriveGradeLevel(value: string) {
  const match = String(value || "").match(/(\d{1,2})/);
  return match ? Number(match[1]) : undefined;
}

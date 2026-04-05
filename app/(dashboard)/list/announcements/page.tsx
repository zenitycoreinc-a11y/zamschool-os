"use client";

export const dynamic = "force-dynamic";

import Pagination from "@/components/Pagination";
import DetailPanel from "@/components/DetailPanel";
import type { DetailBadge } from "@/components/DetailPanel";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import { Plus, Edit, Trash2, Loader2, X, Save, Megaphone, Pin } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";
import { computeRange } from "@/lib/list-query-state";
import { useListQuery } from "@/lib/use-list-query";
import { adminApiJson } from "@/lib/admin-browser-api";

const columns = [
  { header: "Title", accessor: "title" },
  { header: "Audience", accessor: "audience" },
  { header: "Class", accessor: "class" },
  { header: "Date", accessor: "date", className: "hidden md:table-cell" },
  { header: "Actions", accessor: "action" },
];

type AnnouncementRow = {
  id: string;
  title: string;
  content: string;
  target_role: string | null;
  target_class_id: string | null;
  is_pinned: boolean;
  expires_at: string | null;
  audience: string;
  class: string;
  date: string;
};

type ClassOption = {
  id: string;
  label: string;
};

type AnnouncementForm = {
  title: string;
  content: string;
  targetRole: string;
  targetClassId: string;
  isPinned: boolean;
  expiresAt: string;
};

const emptyForm: AnnouncementForm = {
  title: "",
  content: "",
  targetRole: "",
  targetClassId: "",
  isPinned: false,
  expiresAt: "",
};

export default function AnnouncementList() {
  const [announcementsData, setAnnouncementsData] = useState<AnnouncementRow[]>([]);
  const [classOptions, setClassOptions] = useState<ClassOption[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<AnnouncementRow | null>(null);
  const [form, setForm] = useState<AnnouncementForm>(emptyForm);
  const { page, pageSize, q, updateQuery } = useListQuery();
  const search = q || "";

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const [announcementsBody, classesBody] = await Promise.all([
        adminApiJson<{ data?: any[] }>("/api/admin/announcements"),
        adminApiJson<{ data?: any[] }>("/api/admin/classes"),
      ]);

      const classMap = Object.fromEntries(
        (classesBody.data || []).map((item) => {
          const gradeName = String(item?.grades?.name || "").trim();
          const className = String(item?.name || "").trim();
          const label = [gradeName, className].filter(Boolean).join(" - ") || className || "Class";
          return [item.id, label];
        })
      );

      setClassOptions(
        Object.entries(classMap).map(([id, label]) => ({
          id,
          label: String(label),
        }))
      );

      setAnnouncementsData(
        (announcementsBody.data || []).map((item) => ({
          id: String(item.id),
          title: String(item.title || ""),
          content: String(item.content || ""),
          target_role: item.target_role || null,
          target_class_id: item.target_class_id || null,
          is_pinned: Boolean(item.is_pinned),
          expires_at: item.expires_at || null,
          audience: formatAudience(item.target_role),
          class: item.target_class_id ? classMap[item.target_class_id] || "Class" : "All classes",
          date: formatDate(item.created_at),
        }))
      );
    } catch (error: any) {
      toast.error(error?.message || "Failed to load announcements");
      setAnnouncementsData([]);
    } finally {
      setLoading(false);
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

  const openEdit = (item: AnnouncementRow) => {
    setSelectedAnnouncement(null);
    setEditingId(item.id);
    setForm({
      title: item.title,
      content: item.content,
      targetRole: item.target_role || "",
      targetClassId: item.target_class_id || "",
      isPinned: item.is_pinned,
      expiresAt: item.expires_at ? item.expires_at.slice(0, 16) : "",
    });
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      toast.error("Title and content are required");
      return;
    }

    setSaving(true);
    const loadingToast = toast.loading(editingId ? "Updating announcement..." : "Creating announcement...");
    try {
      const payload = {
        title: form.title.trim(),
        content: form.content.trim(),
        targetRole: form.targetRole || null,
        targetClassId: form.targetClassId || null,
        isPinned: form.isPinned,
        expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
      };

      if (editingId) {
        await adminApiJson("/api/admin/announcements", {
          method: "PUT",
          body: JSON.stringify({ id: editingId, ...payload }),
        });
        toast.success("Announcement updated", { id: loadingToast });
      } else {
        await adminApiJson("/api/admin/announcements", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toast.success("Announcement created", { id: loadingToast });
      }

      setFormOpen(false);
      setEditingId(null);
      setForm(emptyForm);
      await fetchRows();
    } catch (error: any) {
      toast.error(error?.message || "Failed to save announcement", { id: loadingToast });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this announcement?")) return;

    setDeletingId(id);
    const loadingToast = toast.loading("Deleting announcement...");
    try {
      await adminApiJson(`/api/admin/announcements?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      toast.success("Announcement deleted", { id: loadingToast });
      await fetchRows();
    } catch (error: any) {
      toast.error(error?.message || "Failed to delete", { id: loadingToast });
    } finally {
      setDeletingId(null);
    }
  };

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return announcementsData;
    return announcementsData.filter((item) =>
      `${item.title || ""} ${item.class || ""} ${item.audience || ""} ${item.content || ""}`.toLowerCase().includes(term)
    );
  }, [announcementsData, search]);

  const pagedRows = useMemo(() => {
    const { from, to } = computeRange(page, pageSize);
    return filteredRows.slice(from, to + 1);
  }, [filteredRows, page, pageSize]);

  const metrics = useMemo(() => ({
    total: announcementsData.length,
    pinned: announcementsData.filter((item) => item.is_pinned).length,
    targeted: announcementsData.filter((item) => item.target_role || item.target_class_id).length,
  }), [announcementsData]);

  const renderRow = (item: AnnouncementRow) => (
    <tr
      key={item.id}
      role="button"
      tabIndex={0}
      onClick={() => setSelectedAnnouncement(item)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          setSelectedAnnouncement(item);
        }
      }}
      className="border-b border-slate-100 text-sm hover:bg-slate-50 cursor-pointer"
    >
      <td className="p-4">
        <div className="font-medium text-slate-800">{item.title}</div>
        <div className="mt-1 text-xs text-slate-500 line-clamp-2">{item.content}</div>
      </td>
      <td className="text-slate-600">{item.audience}</td>
      <td className="text-slate-600">{item.class}</td>
      <td className="hidden md:table-cell text-slate-600">{item.date}</td>
      <td>
        <div className="flex items-center gap-2">
          <button
            onClick={(event) => {
              event.stopPropagation();
              openEdit(item);
            }}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-sky-100 text-sky-700 hover:bg-sky-200"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={(event) => {
              event.stopPropagation();
              void handleDelete(item.id);
            }}
            disabled={deletingId === item.id}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-rose-100 text-rose-700 hover:bg-rose-200 disabled:opacity-50"
          >
            {deletingId === item.id ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
          </button>
        </div>
      </td>
    </tr>
  );

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 flex items-center justify-center gap-3">
        <Loader2 className="w-5 h-5 animate-spin text-sky-600" />
        <span className="text-sm text-slate-500">Loading announcements...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:justify-between">
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-600">Broadcast Desk</p>
              <h1 className="mt-2 text-2xl font-bold text-slate-900 md:text-3xl">Announcements</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Publish clear updates, pin the urgent ones, and keep role or class targeting visible before you send.</p>
            </div>
            <div className="flex flex-wrap gap-3 text-sm">
              <Metric label="All announcements" value={String(metrics.total)} icon={<Megaphone className="h-4 w-4" />} />
              <Metric label="Pinned" value={String(metrics.pinned)} icon={<Pin className="h-4 w-4" />} />
              <Metric label="Targeted" value={String(metrics.targeted)} icon={<Megaphone className="h-4 w-4" />} />
            </div>
          </div>

          <div className="flex flex-col gap-3 xl:w-[360px]">
            <TableSearch
              value={search}
              onChange={(value) => updateQuery({ q: value, page: 1 })}
              placeholder="Search announcements"
            />
            <button
              onClick={openCreate}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
            >
              <Plus className="w-4 h-4" />
              Create announcement
            </button>
          </div>
        </div>
      </section>

      {formOpen ? (
        <section className="rounded-[28px] border border-slate-200 p-5 bg-white shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">{editingId ? "Edit announcement" : "New announcement"}</h2>
          <div className="mt-4 grid md:grid-cols-2 gap-3">
            <input
              className="px-3 py-2 rounded-lg border border-slate-200"
              placeholder="Announcement title"
              value={form.title}
              onChange={(e) => setForm((current) => ({ ...current, title: e.target.value }))}
            />
            <select
              className="px-3 py-2 rounded-lg border border-slate-200"
              value={form.targetRole}
              onChange={(e) => setForm((current) => ({ ...current, targetRole: e.target.value }))}
            >
              <option value="">All roles</option>
              <option value="admin">Admin</option>
              <option value="teacher">Teacher</option>
              <option value="student">Student</option>
              <option value="parent">Parent</option>
            </select>
            <select
              className="px-3 py-2 rounded-lg border border-slate-200"
              value={form.targetClassId}
              onChange={(e) => setForm((current) => ({ ...current, targetClassId: e.target.value }))}
            >
              <option value="">All classes</option>
              {classOptions.map((option) => (
                <option key={option.id} value={option.id}>{option.label}</option>
              ))}
            </select>
            <input
              type="datetime-local"
              className="px-3 py-2 rounded-lg border border-slate-200"
              value={form.expiresAt}
              onChange={(e) => setForm((current) => ({ ...current, expiresAt: e.target.value }))}
            />
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.isPinned}
                onChange={(e) => setForm((current) => ({ ...current, isPinned: e.target.checked }))}
              />
              Pin this announcement
            </label>
            <textarea
              className="px-3 py-2 rounded-lg border border-slate-200 md:col-span-2 min-h-32"
              placeholder="Announcement content"
              value={form.content}
              onChange={(e) => setForm((current) => ({ ...current, content: e.target.value }))}
            />
          </div>
          <div className="mt-4 flex items-center gap-2">
            <button onClick={handleSave} disabled={saving} className="px-4 py-2 rounded-lg bg-slate-900 text-white flex items-center gap-2 hover:bg-slate-800 disabled:opacity-60">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
            </button>
            <button onClick={() => setFormOpen(false)} className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 flex items-center gap-2 hover:bg-slate-50"><X className="w-4 h-4" /> Cancel</button>
          </div>
        </section>
      ) : null}

      <section className="rounded-[28px] border border-slate-200 bg-white shadow-sm overflow-hidden">
        <Table columns={columns} renderRow={renderRow} data={pagedRows} />
        <Pagination
          page={page}
          pageSize={pageSize}
          total={filteredRows.length}
          onPageChange={(nextPage) => updateQuery({ page: nextPage })}
        />
      </section>

      <DetailPanel
        open={Boolean(selectedAnnouncement)}
        title={selectedAnnouncement?.title || ""}
        eyebrow="Announcement details"
        subtitle="Review the full announcement before editing, expiring, or sharing it."
        badges={selectedAnnouncement ? buildAnnouncementBadges(selectedAnnouncement) : []}
        meta={selectedAnnouncement ? buildAnnouncementMeta(selectedAnnouncement) : []}
        onClose={() => setSelectedAnnouncement(null)}
        footer={selectedAnnouncement ? (
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={() => openEdit(selectedAnnouncement)}
              className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Edit announcement
            </button>
          </div>
        ) : null}
      >
        <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Announcement body</p>
          <div className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">
            {selectedAnnouncement?.content || "No announcement body was provided."}
          </div>
        </section>
      </DetailPanel>
    </div>
  );
}

function Metric({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-slate-500">
        {icon}
        {label}
      </div>
      <div className="mt-2 text-lg font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function formatAudience(value: unknown) {
  const role = String(value || "").trim().toLowerCase();
  if (!role) return "All roles";
  return `${role.charAt(0).toUpperCase()}${role.slice(1)} only`;
}

function buildAnnouncementBadges(item: AnnouncementRow): DetailBadge[] {
  return [
    { label: item.is_pinned ? "Pinned" : "Standard", tone: item.is_pinned ? "accent" : "default" },
    { label: item.audience, tone: "default" },
  ];
}

function buildAnnouncementMeta(item: AnnouncementRow) {
  const meta = [
    { label: "Published", value: item.date || "-" },
    { label: "Audience", value: item.audience || "All roles" },
    { label: "Class", value: item.class || "All classes" },
  ];

  if (item.expires_at) {
    meta.push({ label: "Expires", value: formatDate(item.expires_at) });
  }

  return meta;
}

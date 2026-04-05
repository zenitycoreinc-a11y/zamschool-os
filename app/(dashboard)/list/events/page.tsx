"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import Pagination from "@/components/Pagination";
import DetailPanel from "@/components/DetailPanel";
import type { DetailBadge } from "@/components/DetailPanel";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import { Plus, Edit, Trash2, X, Save, Loader2, CalendarDays, MapPin } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";
import { computeRange } from "@/lib/list-query-state";
import { useListQuery } from "@/lib/use-list-query";
import { adminApiJson } from "@/lib/admin-browser-api";

const columns = [
  { header: "Title", accessor: "title" },
  { header: "Audience", accessor: "audience" },
  { header: "Class", accessor: "class" },
  { header: "Date", accessor: "date", className: "hidden md:table-cell" },
  { header: "Start Time", accessor: "startTime", className: "hidden md:table-cell" },
  { header: "End Time", accessor: "endTime", className: "hidden md:table-cell" },
  { header: "Actions", accessor: "action" },
];

type EventRow = {
  id: string;
  title: string;
  description: string;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  target_role: string | null;
  target_class_id: string | null;
  audience: string;
  class: string;
  date: string;
  startTime: string;
  endTime: string;
};

type ClassOption = {
  id: string;
  label: string;
};

type EventForm = {
  title: string;
  description: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  location: string;
  targetRole: string;
  targetClassId: string;
};

const emptyForm: EventForm = {
  title: "",
  description: "",
  eventDate: "",
  startTime: "",
  endTime: "",
  location: "",
  targetRole: "",
  targetClassId: "",
};

export default function EventList() {
  const [rows, setRows] = useState<EventRow[]>([]);
  const [classOptions, setClassOptions] = useState<ClassOption[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<EventRow | null>(null);
  const [form, setForm] = useState<EventForm>(emptyForm);
  const { page, pageSize, q, updateQuery } = useListQuery();
  const search = q || "";

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const [eventsBody, classesBody] = await Promise.all([
        adminApiJson<{ data?: any[] }>("/api/admin/events"),
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

      setRows(
        (eventsBody.data || []).map((item) => ({
          id: String(item.id),
          title: String(item.title || ""),
          description: String(item.description || ""),
          event_date: String(item.event_date || ""),
          start_time: item.start_time || null,
          end_time: item.end_time || null,
          location: item.location || null,
          target_role: item.target_role || null,
          target_class_id: item.target_class_id || null,
          audience: formatAudience(item.target_role),
          class: item.target_class_id ? classMap[item.target_class_id] || "Class" : "All classes",
          date: item.event_date ? formatDate(item.event_date) : "-",
          startTime: item.start_time || "-",
          endTime: item.end_time || "-",
        }))
      );
    } catch (error: any) {
      toast.error(error?.message || "Failed to load events");
      setRows([]);
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

  const openEdit = (item: EventRow) => {
    setSelectedEvent(null);
    setEditingId(item.id);
    setForm({
      title: item.title,
      description: item.description,
      eventDate: item.event_date || "",
      startTime: item.start_time || "",
      endTime: item.end_time || "",
      location: item.location || "",
      targetRole: item.target_role || "",
      targetClassId: item.target_class_id || "",
    });
    setFormOpen(true);
  };

  const onSave = async () => {
    if (!form.title.trim() || !form.eventDate) {
      toast.error("Title and event date are required");
      return;
    }

    setSaving(true);
    const loadingToast = toast.loading(editingId ? "Updating event..." : "Creating event...");
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        eventDate: form.eventDate,
        startTime: form.startTime || undefined,
        endTime: form.endTime || undefined,
        location: form.location.trim() || undefined,
        targetRole: form.targetRole || null,
        targetClassId: form.targetClassId || null,
      };

      if (editingId) {
        await adminApiJson("/api/admin/events", {
          method: "PUT",
          body: JSON.stringify({ id: editingId, ...payload }),
        });
        toast.success("Event updated", { id: loadingToast });
      } else {
        await adminApiJson("/api/admin/events", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toast.success("Event created", { id: loadingToast });
      }

      setFormOpen(false);
      setForm(emptyForm);
      setEditingId(null);
      await fetchRows();
    } catch (error: any) {
      toast.error(error?.message || "Failed to save event", { id: loadingToast });
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id: string) => {
    if (!confirm("Delete this event?")) return;

    const loadingToast = toast.loading("Deleting event...");
    try {
      await adminApiJson(`/api/admin/events?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      toast.success("Event deleted", { id: loadingToast });
      await fetchRows();
    } catch (error: any) {
      toast.error(error?.message || "Delete failed", { id: loadingToast });
    }
  };

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((item) =>
      `${item.title || ""} ${item.class || ""} ${item.location || ""} ${item.audience || ""}`.toLowerCase().includes(term)
    );
  }, [rows, search]);

  const pagedRows = useMemo(() => {
    const { from, to } = computeRange(page, pageSize);
    return filteredRows.slice(from, to + 1);
  }, [filteredRows, page, pageSize]);

  const metrics = useMemo(() => {
    const targeted = rows.filter((item) => item.target_role || item.target_class_id).length;
    const upcoming = rows.filter((item) => item.event_date && new Date(item.event_date).getTime() >= startOfToday()).length;
    return {
      total: rows.length,
      targeted,
      upcoming,
    };
  }, [rows]);

  const renderRow = (item: EventRow) => (
    <tr
      key={item.id}
      role="button"
      tabIndex={0}
      onClick={() => setSelectedEvent(item)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          setSelectedEvent(item);
        }
      }}
      className="border-b border-slate-100 text-sm hover:bg-slate-50 cursor-pointer"
    >
      <td className="p-4">
        <div className="font-medium text-slate-800">{item.title}</div>
        <div className="mt-1 text-xs text-slate-500 line-clamp-2">{item.description || item.location || "No event summary yet."}</div>
      </td>
      <td className="text-slate-600">{item.audience}</td>
      <td className="text-slate-600">{item.class}</td>
      <td className="hidden md:table-cell text-slate-600">{item.date}</td>
      <td className="hidden md:table-cell text-slate-600">{item.startTime}</td>
      <td className="hidden md:table-cell text-slate-600">{item.endTime}</td>
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
              void onDelete(item.id);
            }}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-rose-100 text-rose-700 hover:bg-rose-200"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 flex items-center justify-center gap-3">
        <Loader2 className="w-5 h-5 animate-spin text-sky-600" />
        <span className="text-sm text-slate-500">Loading events...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:justify-between">
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-600">Calendar Planning</p>
              <h1 className="mt-2 text-2xl font-bold text-slate-900 md:text-3xl">Events</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Schedule school moments, target the right audience, and keep timing and location details visible at a glance.</p>
            </div>
            <div className="flex flex-wrap gap-3 text-sm">
              <Metric label="All events" value={String(metrics.total)} icon={<CalendarDays className="h-4 w-4" />} />
              <Metric label="Targeted" value={String(metrics.targeted)} icon={<MapPin className="h-4 w-4" />} />
              <Metric label="Upcoming" value={String(metrics.upcoming)} icon={<CalendarDays className="h-4 w-4" />} />
            </div>
          </div>

          <div className="flex flex-col gap-3 xl:w-[360px]">
            <TableSearch
              value={search}
              onChange={(value) => updateQuery({ q: value, page: 1 })}
              placeholder="Search events"
            />
            <button onClick={openCreate} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800">
              <Plus className="w-4 h-4" /> Create event
            </button>
          </div>
        </div>
      </section>

      {formOpen ? (
        <section className="rounded-[28px] border border-slate-200 p-5 bg-white shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">{editingId ? "Edit event" : "New event"}</h2>
          <div className="mt-4 grid md:grid-cols-4 gap-3">
            <input className="px-3 py-2 rounded-lg border border-slate-200" placeholder="Event title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            <select className="px-3 py-2 rounded-lg border border-slate-200" value={form.targetRole} onChange={(e) => setForm((f) => ({ ...f, targetRole: e.target.value }))}>
              <option value="">All roles</option>
              <option value="admin">Admin</option>
              <option value="teacher">Teacher</option>
              <option value="student">Student</option>
              <option value="parent">Parent</option>
            </select>
            <select className="px-3 py-2 rounded-lg border border-slate-200" value={form.targetClassId} onChange={(e) => setForm((f) => ({ ...f, targetClassId: e.target.value }))}>
              <option value="">All classes</option>
              {classOptions.map((option) => (
                <option key={option.id} value={option.id}>{option.label}</option>
              ))}
            </select>
            <input className="px-3 py-2 rounded-lg border border-slate-200" placeholder="Location" value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} />
            <input type="date" className="px-3 py-2 rounded-lg border border-slate-200" value={form.eventDate} onChange={(e) => setForm((f) => ({ ...f, eventDate: e.target.value }))} />
            <input type="time" className="px-3 py-2 rounded-lg border border-slate-200" value={form.startTime} onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))} />
            <input type="time" className="px-3 py-2 rounded-lg border border-slate-200" value={form.endTime} onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))} />
            <textarea className="px-3 py-2 rounded-lg border border-slate-200 md:col-span-4 min-h-28" placeholder="Description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="mt-4 flex items-center gap-2">
            <button onClick={onSave} disabled={saving} className="px-4 py-2 rounded-lg bg-slate-900 text-white flex items-center gap-2 hover:bg-slate-800 disabled:opacity-60">
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
        open={Boolean(selectedEvent)}
        title={selectedEvent?.title || ""}
        eyebrow="Event details"
        subtitle="Present the full event context clearly before you edit, reschedule, or communicate it."
        badges={selectedEvent ? buildEventBadges(selectedEvent) : []}
        meta={selectedEvent ? buildEventMeta(selectedEvent) : []}
        onClose={() => setSelectedEvent(null)}
        footer={selectedEvent ? (
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={() => openEdit(selectedEvent)}
              className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Edit event
            </button>
          </div>
        ) : null}
      >
        <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Event overview</p>
          <div className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">
            {selectedEvent?.description || "No event description has been provided yet."}
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

function startOfToday() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now.getTime();
}

function buildEventBadges(item: EventRow): DetailBadge[] {
  return [
    { label: item.audience, tone: "default" },
    { label: item.event_date && new Date(item.event_date).getTime() >= startOfToday() ? "Upcoming" : "Scheduled", tone: "accent" },
  ];
}

function buildEventMeta(item: EventRow) {
  const meta = [
    { label: "Event date", value: item.date || "-" },
    { label: "Time", value: formatEventTimeRange(item.start_time, item.end_time) },
    { label: "Audience", value: item.audience || "All roles" },
    { label: "Class", value: item.class || "All classes" },
  ];

  if (item.location) {
    meta.push({ label: "Location", value: item.location });
  }

  return meta;
}

function formatEventTimeRange(startTime: string | null, endTime: string | null) {
  if (!startTime && !endTime) return "Time not set";
  if (startTime && endTime) return `${startTime} - ${endTime}`;
  return startTime || endTime || "Time not set";
}

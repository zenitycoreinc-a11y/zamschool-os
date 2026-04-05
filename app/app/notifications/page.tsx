"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Bell, CheckCheck, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { adminApiJson } from "@/lib/admin-browser-api";
import DetailPanel from "@/components/DetailPanel";
import type { DetailBadge } from "@/components/DetailPanel";
import {
  buildInboxCounts,
  canMarkAllAsRead,
  filterInboxItems,
  type InboxItem,
} from "@/lib/notifications-inbox";

type InboxRecord = InboxItem & { recordId?: string };

export default function NotificationsPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<InboxRecord[]>([]);
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"all" | "unread" | "read">("all");
  const [selectedItem, setSelectedItem] = useState<InboxRecord | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const response = await adminApiJson<{ data?: InboxRecord[] }>("/api/admin/notifications");
        setItems(Array.isArray(response.data) ? response.data : []);
      } catch (err: any) {
        toast.error(err?.message || "Failed to load notifications inbox");
        setItems([]);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const counts = useMemo(() => buildInboxCounts(items), [items]);
  const visible = useMemo(() => filterInboxItems(items, { query, mode }), [items, mode, query]);

  async function markItemRead(item: InboxRecord) {
    if (item.status === "read") return;
    if (item.type !== "notification" || !item.recordId) {
      setItemStatus(item.id, "read");
      return;
    }

    const previous = items;
    setItemStatus(item.id, "read");
    try {
      await adminApiJson(`/api/admin/notifications?id=${encodeURIComponent(item.recordId)}`, { method: "PUT" });
    } catch (err: any) {
      setItems(previous);
      setSelectedItem(previous.find((entry) => entry.id === item.id) || null);
      toast.error(err?.message || "Failed to persist read state");
    }
  }

  async function openItem(item: InboxRecord) {
    const nextSelected = item.status === "unread" ? { ...item, status: "read" as const } : item;
    setSelectedItem(nextSelected);

    if (item.status === "unread") {
      await markItemRead(item);
    }
  }

  async function markAllAsRead() {
    const unread = items.filter((item) => item.status === "unread");
    if (unread.length === 0) return;
    const notifIds = unread.filter((item) => item.type === "notification" && item.recordId).map((item) => item.recordId as string);

    if (notifIds.length === 0) {
      setItems((prev) => prev.map((item) => ({ ...item, status: "read" })));
      setSelectedItem((current) => (current ? { ...current, status: "read" } : current));
      return;
    }

    const results = await Promise.allSettled(notifIds.map((id) => adminApiJson(`/api/admin/notifications?id=${encodeURIComponent(id)}`, { method: "PUT" }).then(() => id)));
    const succeeded = new Set(results.filter((result): result is PromiseFulfilledResult<string> => result.status === "fulfilled").map((result) => result.value));
    const failedCount = results.length - succeeded.size;

    setItems((prev) => prev.map((item) => {
      if (item.type !== "notification" || !item.recordId) return { ...item, status: "read" };
      if (succeeded.has(item.recordId)) return { ...item, status: "read" };
      return item;
    }));
    setSelectedItem((current) => {
      if (!current) return current;
      if (current.type !== "notification" || !current.recordId) {
        return { ...current, status: "read" };
      }
      if (succeeded.has(current.recordId)) {
        return { ...current, status: "read" };
      }
      return current;
    });

    if (failedCount > 0) {
      toast.error(failedCount === 1 ? "One notification could not be marked as read" : `${failedCount} notifications could not be marked as read`);
    }
  }

  function setItemStatus(id: string, status: InboxRecord["status"]) {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, status } : item)));
    setSelectedItem((current) => (current?.id === id ? { ...current, status } : current));
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:justify-between">
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-600">Inbox Triage</p>
              <h1 className="mt-2 text-2xl font-bold text-slate-900 md:text-3xl">Notifications</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Review unread work, open the underlying item, and clear the queue with explicit inbox actions.</p>
            </div>
            <div className="flex flex-wrap gap-3 text-sm">
              <CountCard label="All items" value={String(counts.all)} />
              <CountCard label="Unread" value={String(counts.unread)} />
              <CountCard label="Read" value={String(counts.read)} />
            </div>
          </div>

          <div className="w-full rounded-[24px] border border-slate-200 bg-slate-50 p-4 xl:max-w-xl">
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Search inbox</span>
              <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <Search className="h-4 w-4 text-slate-400" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search title, type, or details" className="w-full bg-transparent text-sm text-slate-700 outline-none" />
              </div>
            </label>

            <div className="mt-3 flex flex-wrap gap-2">
              {([
                { key: "all", label: "All" },
                { key: "unread", label: "Unread" },
                { key: "read", label: "Read" },
              ] as const).map((item) => (
                <button key={item.key} type="button" onClick={() => setMode(item.key)} className={`rounded-full px-3 py-2 text-xs font-semibold ${mode === item.key ? "bg-sky-500 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"}`}>
                  {item.label}
                </button>
              ))}
            </div>

            {canMarkAllAsRead(items) ? (
              <button type="button" onClick={() => void markAllAsRead()} className="mt-3 inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800">
                <CheckCheck className="h-4 w-4" /> Mark all as read
              </button>
            ) : null}
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4 md:px-6">
          <div className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <Bell className="h-5 w-5 text-sky-600" /> Inbox items
          </div>
          <p className="mt-1 text-sm text-slate-500">Unread items are emphasized, while read items step back visually.</p>
        </div>

        {loading ? (
          <div className="flex justify-center p-10"><Loader2 className="h-5 w-5 animate-spin text-slate-400" /></div>
        ) : (
          <div className="space-y-3 p-4 md:p-6">
            {visible.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">No inbox items match this view.</div>
            ) : visible.map((item) => (
              <article
                key={`${item.type}-${item.id}`}
                role="button"
                tabIndex={0}
                onClick={() => { void openItem(item); }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    void openItem(item);
                  }
                }}
                className={`rounded-[24px] border px-4 py-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${item.status === "unread" ? "border-sky-200 bg-sky-50/60" : "border-slate-200 bg-white"} cursor-pointer`}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${item.status === "unread" ? "bg-sky-500 text-white" : "bg-slate-100 text-slate-600"}`}>{item.status}</span>
                      <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600 ring-1 ring-slate-200">{item.type}</span>
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900">{item.title}</h2>
                      <p className="mt-2 text-sm leading-6 text-slate-500">{item.body}</p>
                    </div>
                    <p className="text-xs text-slate-400">{formatTs(item.timestamp)}</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        void openItem(item);
                      }}
                      className="inline-flex items-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
                    >
                      View details
                    </button>
                    {item.status === "unread" ? (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          void markItemRead(item);
                        }}
                        className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Mark as read
                      </button>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <DetailPanel
        open={Boolean(selectedItem)}
        title={selectedItem?.title || ""}
        eyebrow={selectedItem ? `${capitalizeLabel(selectedItem.type)} details` : ""}
        subtitle="Read the full item clearly, then decide whether you need to jump to the related workspace."
        badges={selectedItem ? buildNotificationBadges(selectedItem) : []}
        meta={selectedItem ? buildNotificationMeta(selectedItem) : []}
        onClose={() => setSelectedItem(null)}
        footer={selectedItem ? (
          <div className="flex flex-wrap justify-end gap-2">
            {selectedItem.status === "unread" ? (
              <button
                type="button"
                onClick={() => void markItemRead(selectedItem)}
                className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Mark as read
              </button>
            ) : null}
            {selectedItem.href && selectedItem.href !== "/app/notifications" ? (
              <Link
                href={selectedItem.href}
                className="inline-flex items-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Go to section
              </Link>
            ) : null}
          </div>
        ) : null}
      >
        <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Message</p>
          <div className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">
            {selectedItem?.body || "No additional details were provided for this item."}
          </div>
        </section>
      </DetailPanel>
    </div>
  );
}

function CountCard({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"><div className="text-xs uppercase tracking-[0.16em] text-slate-500">{label}</div><div className="mt-2 text-lg font-semibold text-slate-900">{value}</div></div>;
}

function formatTs(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function capitalizeLabel(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function buildNotificationBadges(item: InboxRecord): DetailBadge[] {
  return [
    { label: item.status, tone: item.status === "unread" ? "accent" : "default" },
    { label: capitalizeLabel(item.type), tone: "default" },
  ];
}

function buildNotificationMeta(item: InboxRecord) {
  return [
    { label: "Received", value: formatTs(item.timestamp) },
    { label: "Section", value: formatNotificationSection(item.href) },
  ];
}

function formatNotificationSection(href: string) {
  if (href.includes("/announcements")) return "Announcements";
  if (href.includes("/events")) return "Events";
  return "Notifications";
}

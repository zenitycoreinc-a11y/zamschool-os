"use client";

import { useEffect, useMemo, useState } from "react";
import { Bell, CheckCheck, Loader2, Search } from "lucide-react";

import { adminApiJson } from "@/lib/admin-browser-api";
import DetailPanel from "@/components/DetailPanel";
import type { DetailBadge } from "@/components/DetailPanel";

type NotificationRow = {
  id: string;
  title: string;
  message?: string | null;
  body?: string | null;
  type?: string | null;
  is_read?: boolean;
  created_at?: string | null;
};

export default function TeacherNotificationsPage() {
  const [loading, setLoading] = useState(true);
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState("");
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [selectedNotification, setSelectedNotification] = useState<NotificationRow | null>(null);

  useEffect(() => {
    void loadNotifications();
  }, []);

  const filteredNotifications = useMemo(() => {
    const term = query.trim().toLowerCase();
    return notifications.filter((notification) => {
      const matchesSearch =
        !term ||
        `${notification.title || ""} ${notification.message || ""} ${notification.body || ""} ${notification.type || ""}`
          .toLowerCase()
          .includes(term);

      if (!matchesSearch) return false;

      if (filter === "unread") return !notification.is_read;
      if (filter === "read") return Boolean(notification.is_read);
      return true;
    });
  }, [filter, notifications, query]);

  async function loadNotifications() {
    setLoading(true);
    setError("");

    try {
      const response = await adminApiJson<{ data?: NotificationRow[] }>(
        "/api/teacher/notifications?limit=50"
      );
      setNotifications(Array.isArray(response.data) ? response.data : []);
    } catch (loadError: any) {
      setNotifications([]);
      setError(loadError?.message || "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }

  async function markAsRead(notificationId: string) {
    setMarkingId(notificationId);

    try {
      await adminApiJson(`/api/teacher/notifications?id=${encodeURIComponent(notificationId)}`, {
        method: "PUT",
      });
      setNotifications((current) =>
        current.map((item) =>
          item.id === notificationId ? { ...item, is_read: true } : item
        )
      );
      setSelectedNotification((current) =>
        current?.id === notificationId ? { ...current, is_read: true } : current
      );
    } catch (markError: any) {
      setError(markError?.message || "Failed to update notification");
    } finally {
      setMarkingId(null);
    }
  }

  async function markAllAsRead() {
    setMarkingId("all");

    try {
      await adminApiJson("/api/teacher/notifications", {
        method: "PUT",
        body: JSON.stringify({ markAll: true }),
      });

      setNotifications((current) => current.map((item) => ({ ...item, is_read: true })));
      setSelectedNotification((current) => (current ? { ...current, is_read: true } : current));
    } catch (markError: any) {
      setError(markError?.message || "Failed to update notifications");
    } finally {
      setMarkingId(null);
    }
  }

  async function openNotification(notification: NotificationRow) {
    const nextNotification = notification.is_read ? notification : { ...notification, is_read: true };
    setSelectedNotification(nextNotification);

    if (!notification.is_read) {
      await markAsRead(notification.id);
    }
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-400">
              Teacher Inbox
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">Notifications</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              Review your teacher notifications and clear unread items from one focused inbox.
            </p>
          </div>

          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-600">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search notifications"
              className="bg-transparent outline-none"
            />
          </label>

          <div className="flex flex-wrap gap-2">
            {[
              { value: "all", label: "All" },
              { value: "unread", label: "Unread" },
              { value: "read", label: "Read" },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setFilter(option.value)}
                className={`rounded-full px-3 py-2 text-xs font-semibold ${
                  filter === option.value
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {error ? (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        {notifications.some((item) => !item.is_read) ? (
          <div className="mt-4">
            <button
              type="button"
              onClick={() => void markAllAsRead()}
              disabled={markingId === "all"}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {markingId === "all" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCheck className="h-4 w-4" />}
              Mark all as read
            </button>
          </div>
        ) : null}
      </section>

      <section className="space-y-4">
        {loading ? (
          <div className="grid place-items-center rounded-3xl border border-slate-200 bg-white p-10 shadow-sm">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-500 shadow-sm">
            No notifications match this view.
          </div>
        ) : (
          filteredNotifications.map((notification) => (
            <article
              key={notification.id}
              role="button"
              tabIndex={0}
              onClick={() => { void openNotification(notification); }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  void openNotification(notification);
                }
              }}
              className={`rounded-3xl border p-6 shadow-sm ${
                notification.is_read
                  ? "border-slate-200 bg-white"
                  : "border-sky-200 bg-sky-50/50"
              } cursor-pointer`}
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sky-600">
                    <Bell className="h-4 w-4" />
                    <span className="text-xs font-semibold uppercase tracking-[0.18em]">
                      {notification.type || "Notification"}
                    </span>
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">{notification.title}</h2>
                    <p className="mt-3 text-sm leading-6 text-slate-600">
                      {notification.message || notification.body || "No notification details provided."}
                    </p>
                  </div>
                  <p className="text-xs text-slate-400">
                    {formatTimestamp(notification.created_at)}
                  </p>
                </div>

                {!notification.is_read ? (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      void markAsRead(notification.id);
                    }}
                    disabled={markingId === notification.id}
                    className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {markingId === notification.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCheck className="h-4 w-4" />
                    )}
                    Mark as read
                  </button>
                ) : null}
              </div>
            </article>
          ))
        )}
      </section>

      <DetailPanel
        open={Boolean(selectedNotification)}
        title={selectedNotification?.title || ""}
        eyebrow="Notification details"
        subtitle="Read the full notification clearly without losing your place in the inbox."
        badges={selectedNotification ? buildTeacherNotificationBadges(selectedNotification) : []}
        meta={selectedNotification ? buildTeacherNotificationMeta(selectedNotification) : []}
        onClose={() => setSelectedNotification(null)}
        footer={selectedNotification && !selectedNotification.is_read ? (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => void markAsRead(selectedNotification.id)}
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
            >
              <CheckCheck className="h-4 w-4" />
              Mark as read
            </button>
          </div>
        ) : null}
      >
        <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Message</p>
          <div className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">
            {selectedNotification?.message || selectedNotification?.body || "No notification details provided."}
          </div>
        </section>
      </DetailPanel>
    </div>
  );
}

function formatTimestamp(value: string | null | undefined) {
  if (!value) return "Unknown time";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function buildTeacherNotificationBadges(notification: NotificationRow): DetailBadge[] {
  return [
    { label: notification.is_read ? "Read" : "Unread", tone: notification.is_read ? "default" : "accent" },
    { label: String(notification.type || "Notification"), tone: "default" },
  ];
}

function buildTeacherNotificationMeta(notification: NotificationRow) {
  return [
    { label: "Received", value: formatTimestamp(notification.created_at) },
    { label: "Type", value: String(notification.type || "Notification") },
  ];
}

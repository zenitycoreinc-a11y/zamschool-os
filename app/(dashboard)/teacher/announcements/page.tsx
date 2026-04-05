"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Megaphone, Search } from "lucide-react";

import { adminApiJson } from "@/lib/admin-browser-api";
import DetailPanel from "@/components/DetailPanel";
import type { DetailBadge } from "@/components/DetailPanel";
import { formatDate } from "@/lib/utils";

type AnnouncementRow = {
  id: string;
  title: string;
  content?: string | null;
  body?: string | null;
  created_at?: string | null;
  published_at?: string | null;
  target_role?: string | null;
};

export default function TeacherAnnouncementsPage() {
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [audienceFilter, setAudienceFilter] = useState("all");
  const [error, setError] = useState("");
  const [announcements, setAnnouncements] = useState<AnnouncementRow[]>([]);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<AnnouncementRow | null>(null);

  useEffect(() => {
    const loadAnnouncements = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await adminApiJson<{ data?: AnnouncementRow[] }>(
          "/api/teacher/announcements?limit=40"
        );
        setAnnouncements(Array.isArray(response.data) ? response.data : []);
      } catch (loadError: any) {
        setAnnouncements([]);
        setError(loadError?.message || "Failed to load announcements");
      } finally {
        setLoading(false);
      }
    };

    void loadAnnouncements();
  }, []);

  const filteredAnnouncements = useMemo(() => {
    const term = query.trim().toLowerCase();
    return announcements.filter((announcement) => {
      const matchesSearch =
        !term ||
        `${announcement.title || ""} ${announcement.content || ""} ${announcement.body || ""}`
          .toLowerCase()
          .includes(term);

      if (!matchesSearch) return false;

      const role = String(announcement.target_role || "").trim().toUpperCase();
      if (audienceFilter === "teacher") return role === "TEACHER";
      if (audienceFilter === "schoolwide") return !role || role === "ALL" || role === "GENERAL";
      return true;
    });
  }, [announcements, audienceFilter, query]);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-400">
              Teacher Updates
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">Announcements</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              Review school updates addressed to teachers from a dedicated announcements feed.
            </p>
          </div>

          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-600">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search announcements"
              className="bg-transparent outline-none"
            />
          </label>

          <div className="flex flex-wrap gap-2">
            {[
              { value: "all", label: "All updates" },
              { value: "teacher", label: "Teacher only" },
              { value: "schoolwide", label: "Schoolwide" },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setAudienceFilter(option.value)}
                className={`rounded-full px-3 py-2 text-xs font-semibold ${
                  audienceFilter === option.value
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
      </section>

      <section className="space-y-4">
        {loading ? (
          <div className="grid place-items-center rounded-3xl border border-slate-200 bg-white p-10 shadow-sm">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          </div>
        ) : filteredAnnouncements.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-500 shadow-sm">
            No announcements match this view.
          </div>
        ) : (
          filteredAnnouncements.map((announcement) => (
            <button
              key={announcement.id}
              type="button"
              onClick={() => setSelectedAnnouncement(announcement)}
              className="w-full rounded-3xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:border-slate-300"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sky-600">
                    <Megaphone className="h-4 w-4" />
                    <span className="text-xs font-semibold uppercase tracking-[0.18em]">
                      Announcement
                    </span>
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">{announcement.title}</h2>
                    <p className="mt-3 text-sm leading-6 text-slate-600">
                      {announcement.content || announcement.body || "No announcement details provided."}
                    </p>
                  </div>
                </div>
                <div className="text-sm text-slate-400">
                  {formatDate(announcement.published_at || announcement.created_at || "")}
                </div>
              </div>
            </button>
          ))
        )}
      </section>

      <DetailPanel
        open={Boolean(selectedAnnouncement)}
        title={selectedAnnouncement?.title || ""}
        eyebrow="Announcement details"
        subtitle="Read the full school update in a clearer, more focused view."
        badges={selectedAnnouncement ? buildTeacherAnnouncementBadges(selectedAnnouncement) : []}
        meta={selectedAnnouncement ? buildTeacherAnnouncementMeta(selectedAnnouncement) : []}
        onClose={() => setSelectedAnnouncement(null)}
      >
        <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Announcement body</p>
          <div className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">
            {selectedAnnouncement?.content || selectedAnnouncement?.body || "No announcement details provided."}
          </div>
        </section>
      </DetailPanel>
    </div>
  );
}

function buildTeacherAnnouncementBadges(announcement: AnnouncementRow): DetailBadge[] {
  const targetRole = String(announcement.target_role || "").trim();
  const badges: DetailBadge[] = [{ label: "Announcement", tone: "accent" }];

  if (targetRole) {
    badges.push({ label: `${targetRole} audience`, tone: "default" });
  }

  return badges;
}

function buildTeacherAnnouncementMeta(announcement: AnnouncementRow) {
  return [
    { label: "Published", value: formatAnnouncementDate(announcement.published_at || announcement.created_at) },
    { label: "Audience", value: String(announcement.target_role || "All roles") },
  ];
}

function formatAnnouncementDate(value: string | null | undefined) {
  if (!value) return "Unknown date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return formatDate(date);
}

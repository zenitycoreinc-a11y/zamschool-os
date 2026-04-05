"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Clock3, Loader2, MapPin, Search } from "lucide-react";

import { adminApiJson } from "@/lib/admin-browser-api";
import DetailPanel from "@/components/DetailPanel";
import { formatDate } from "@/lib/utils";

type EventRow = {
  id: string;
  title: string;
  description?: string | null;
  event_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  location?: string | null;
};

export default function TeacherEventsPage() {
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState("upcoming");
  const [error, setError] = useState("");
  const [events, setEvents] = useState<EventRow[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventRow | null>(null);

  useEffect(() => {
    const loadEvents = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await adminApiJson<{ data?: EventRow[] }>(
          `/api/teacher/events?limit=40&upcomingOnly=${scope === "upcoming" ? "true" : "false"}`
        );
        setEvents(Array.isArray(response.data) ? response.data : []);
      } catch (loadError: any) {
        setEvents([]);
        setError(loadError?.message || "Failed to load events");
      } finally {
        setLoading(false);
      }
    };

    void loadEvents();
  }, [scope]);

  const filteredEvents = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) {
      return events;
    }

    return events.filter((event) =>
      `${event.title || ""} ${event.description || ""} ${event.location || ""}`
        .toLowerCase()
        .includes(term)
    );
  }, [events, query]);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-400">
              Teacher Calendar
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">Events</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              See upcoming school events relevant to your teaching role from a dedicated teacher calendar.
            </p>
          </div>

          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-600">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search events"
              className="bg-transparent outline-none"
            />
          </label>

          <div className="flex flex-wrap gap-2">
            {[
              { value: "upcoming", label: "Upcoming only" },
              { value: "all", label: "All events" },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setScope(option.value)}
                className={`rounded-full px-3 py-2 text-xs font-semibold ${
                  scope === option.value ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"
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
        ) : filteredEvents.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-500 shadow-sm">
            No upcoming events match this view.
          </div>
        ) : (
          filteredEvents.map((event) => (
            <button
              key={event.id}
              type="button"
              onClick={() => setSelectedEvent(event)}
              className="w-full rounded-3xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:border-slate-300"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sky-600">
                    <CalendarDays className="h-4 w-4" />
                    <span className="text-xs font-semibold uppercase tracking-[0.18em]">Event</span>
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">{event.title}</h2>
                    <p className="mt-3 text-sm leading-6 text-slate-600">
                      {event.description || "No event description has been provided yet."}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 text-sm text-slate-500">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-slate-400" />
                    <span>{formatDate(event.event_date || "")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock3 className="h-4 w-4 text-slate-400" />
                    <span>{formatTimeRange(event.start_time, event.end_time)}</span>
                  </div>
                  {event.location ? (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-slate-400" />
                      <span>{event.location}</span>
                    </div>
                  ) : null}
                </div>
              </div>
            </button>
          ))
        )}
      </section>

      <DetailPanel
        open={Boolean(selectedEvent)}
        title={selectedEvent?.title || ""}
        eyebrow="Event details"
        subtitle="See the full event schedule and venue details in one focused panel."
        badges={selectedEvent ? [{ label: "Event", tone: "accent" }] : []}
        meta={selectedEvent ? buildTeacherEventMeta(selectedEvent) : []}
        onClose={() => setSelectedEvent(null)}
      >
        <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Event description</p>
          <div className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">
            {selectedEvent?.description || "No event description has been provided yet."}
          </div>
        </section>
      </DetailPanel>
    </div>
  );
}

function formatTimeRange(startTime: string | null | undefined, endTime: string | null | undefined) {
  if (!startTime && !endTime) return "Time not set";
  if (startTime && endTime) return `${startTime} - ${endTime}`;
  return startTime || endTime || "Time not set";
}

function buildTeacherEventMeta(event: EventRow) {
  const meta = [
    { label: "Event date", value: formatTeacherEventDate(event.event_date) },
    { label: "Time", value: formatTimeRange(event.start_time, event.end_time) },
  ];

  if (event.location) {
    meta.push({ label: "Location", value: event.location });
  }

  return meta;
}

function formatTeacherEventDate(value: string | null | undefined) {
  if (!value) return "Unknown date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return formatDate(date);
}

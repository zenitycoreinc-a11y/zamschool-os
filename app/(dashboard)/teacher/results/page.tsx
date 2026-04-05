"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Eye,
  Loader2,
  Megaphone,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { format } from "date-fns";

import { getDisplayName } from "@/lib/profile-utils";

type TeacherResultRow = {
  id: string;
  score: number | null;
  grade: string | null;
  remarks: string | null;
  created_at: string | null;
  published_at: string | null;
  published_by: string | null;
  student_id: string | null;
  assignment_id: string | null;
  exam_id: string | null;
  student: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  } | null;
  assignments: {
    title: string;
    due_date: string | null;
    total_marks: number;
    classes: {
      name: string;
    };
    subjects: {
      name: string;
    };
  };
  submitted_at: string | null;
  graded_at: string | null;
  status: "not-submitted" | "pending-grade" | "graded";
  publish_status: "draft" | "published";
};

type TeacherResultsResponse = {
  data?: TeacherResultRow[];
  error?: string;
};

type PublishResponse = {
  success?: boolean;
  data?: {
    publishedCount: number;
    publishedAt: string;
    resultIds: string[];
  };
  error?: string;
};

export default function TeacherResultsPage() {
  const [results, setResults] = useState<TeacherResultRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState("all");
  const [actionError, setActionError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [publishingAssignmentId, setPublishingAssignmentId] = useState<string | null>(null);
  const [selectedResult, setSelectedResult] = useState<TeacherResultRow | null>(null);

  useEffect(() => {
    void loadResults();
  }, []);

  const assignmentPublishState = useMemo(() => {
    const state = new Map<string, { title: string; total: number; published: number; draft: number }>();

    for (const result of results) {
      const assignmentId = result.assignment_id;
      if (!assignmentId) continue;

      const current = state.get(assignmentId) || {
        title: result.assignments.title,
        total: 0,
        published: 0,
        draft: 0,
      };

      current.total += 1;
      if (result.publish_status === "published") {
        current.published += 1;
      } else {
        current.draft += 1;
      }

      state.set(assignmentId, current);
    }

    return state;
  }, [results]);

  const summary = useMemo(() => {
    return {
      total: results.length,
      graded: results.filter((result) => result.status === "graded").length,
      draft: results.filter((result) => result.publish_status === "draft").length,
      published: results.filter((result) => result.publish_status === "published").length,
    };
  }, [results]);

  const filteredResults = useMemo(
    () =>
      results.filter((result) => {
        const studentName = result.student ? getDisplayName(result.student) : "Unknown Student";
        const matchesSearch =
          studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          result.assignments.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          result.assignments.classes.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          result.assignments.subjects.name.toLowerCase().includes(searchTerm.toLowerCase());

        if (!matchesSearch) return false;

        switch (filter) {
          case "draft":
            return result.publish_status === "draft";
          case "published":
            return result.publish_status === "published";
          case "pending":
            return result.status === "pending-grade";
          default:
            return true;
        }
      }),
    [filter, results, searchTerm]
  );

  async function loadResults() {
    setLoading(true);
    setActionError("");

    try {
      const response = await fetch("/api/teacher/results", {
        cache: "no-store",
      });
      const payload = (await response.json()) as TeacherResultsResponse;

      if (!response.ok) {
        throw new Error(payload.error || "Failed to load teacher results");
      }

      setResults(payload.data || []);
    } catch (loadError: any) {
      setResults([]);
      setActionError(loadError?.message || "Failed to load teacher results");
    } finally {
      setLoading(false);
    }
  }

  async function publishAssignmentResults(assignmentId: string) {
    setPublishingAssignmentId(assignmentId);
    setActionError("");
    setActionMessage("");

    try {
      const response = await fetch("/api/teacher/results-publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignmentId }),
      });
      const payload = (await response.json()) as PublishResponse;

      if (!response.ok) {
        throw new Error(payload.error || "Failed to publish results");
      }

      setResults((current) =>
        current.map((result) =>
          result.assignment_id === assignmentId
            ? {
                ...result,
                publish_status: "published",
                published_at: payload.data?.publishedAt || new Date().toISOString(),
              }
            : result
        )
      );
      setActionMessage(
        `Published ${payload.data?.publishedCount || 0} result(s) for ${assignmentPublishState.get(assignmentId)?.title || "assignment"}.`
      );
    } catch (publishError: any) {
      setActionError(publishError?.message || "Failed to publish results");
    } finally {
      setPublishingAssignmentId(null);
    }
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-400">
              Teacher results
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">Results</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              Track grading progress, spot unpublished marks, and publish finished result sets when they are ready.
            </p>
            <Link
              href="/teacher/teaching"
              className="mt-3 inline-flex text-sm font-semibold text-sky-600"
            >
              Back to teaching hub
            </Link>
          </div>

          <div className="flex flex-wrap gap-3">
            <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-600">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search results"
                className="bg-transparent outline-none"
              />
            </label>
            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-sky-200"
            >
              <option value="all">All results</option>
              <option value="draft">Draft only</option>
              <option value="published">Published only</option>
              <option value="pending">Pending grading</option>
            </select>
          </div>
        </div>

        {actionError ? (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {actionError}
          </div>
        ) : null}
        {actionMessage ? (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {actionMessage}
          </div>
        ) : null}
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ResultStat label="Rows" value={String(summary.total)} icon={Eye} />
        <ResultStat label="Graded" value={String(summary.graded)} icon={CheckCircle2} />
        <ResultStat label="Draft" value={String(summary.draft)} icon={Sparkles} />
        <ResultStat label="Published" value={String(summary.published)} icon={Megaphone} />
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Publish queue</h2>
            <p className="text-sm text-slate-500">Assignments with draft results can be published from here.</p>
          </div>
          {loading ? <Loader2 className="h-5 w-5 animate-spin text-slate-400" /> : null}
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          {Array.from(assignmentPublishState.entries()).map(([assignmentId, state]) => (
            <div key={assignmentId} className="rounded-2xl border border-slate-200 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-slate-900">{state.title}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {state.published}/{state.total} published
                  </p>
                </div>
                {state.draft > 0 ? (
                  <button
                    type="button"
                    onClick={() => void publishAssignmentResults(assignmentId)}
                    disabled={publishingAssignmentId === assignmentId}
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                  >
                    {publishingAssignmentId === assignmentId ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Megaphone className="h-4 w-4" />
                    )}
                    Publish
                  </button>
                ) : (
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                    Fully published
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Result register</h2>
            <p className="text-sm text-slate-500">{filteredResults.length} visible row(s)</p>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          {!loading && filteredResults.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
              No results match this view.
            </div>
          ) : null}

          {filteredResults.map((result) => {
            const studentName = result.student ? getDisplayName(result.student) : "Unknown Student";
            return (
              <article key={result.id} className="rounded-2xl border border-slate-200 p-5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold text-slate-900">{studentName}</h3>
                      <span className={gradePill(result.publish_status)}>
                        {result.publish_status === "published" ? "Published" : "Draft"}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-500">
                      {result.assignments.title} | {result.assignments.classes.name} | {result.assignments.subjects.name}
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[360px]">
                    <MiniStat label="Score" value={result.score != null ? String(result.score) : "-"} />
                    <MiniStat label="Grade" value={result.grade || "-"} />
                    <MiniStat label="Submitted" value={formatDateLabel(result.submitted_at)} />
                    <MiniStat label="Published" value={formatDateLabel(result.published_at)} />
                  </div>
                </div>

                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setSelectedResult(result)}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <Eye className="h-4 w-4" />
                    View details
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {selectedResult ? (
        <div className="fixed inset-0 z-40 grid place-items-center bg-slate-900/40 p-4">
          <section className="w-full max-w-3xl rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-400">
                  Result details
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-900">
                  {selectedResult.student ? getDisplayName(selectedResult.student) : "Unknown Student"}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setSelectedResult(null)}
                className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <MiniStat label="Assignment" value={selectedResult.assignments.title} />
              <MiniStat label="Class" value={selectedResult.assignments.classes.name} />
              <MiniStat label="Subject" value={selectedResult.assignments.subjects.name} />
              <MiniStat label="Publish state" value={selectedResult.publish_status} />
              <MiniStat label="Score" value={selectedResult.score != null ? String(selectedResult.score) : "-"} />
              <MiniStat label="Grade" value={selectedResult.grade || "-"} />
            </div>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Remarks</p>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                {selectedResult.remarks || "No remarks were recorded for this result."}
              </p>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function formatDateLabel(value: string | null | undefined) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return format(date, "dd MMM yyyy");
}

function gradePill(status: "draft" | "published") {
  return status === "published"
    ? "rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700"
    : "rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700";
}

function ResultStat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: any;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">{value}</p>
        </div>
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-sky-50 text-sky-600">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-2 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

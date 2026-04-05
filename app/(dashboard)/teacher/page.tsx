"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  GraduationCap,
  Loader2,
  MoveRight,
  Sparkles,
  Users,
} from "lucide-react";

import Announcements from "@/components/Announcements";
import { useTeacherWorkspace } from "@/components/TeacherWorkspaceProvider";
import { buildRollcallCompletionState } from "@/lib/attendance-access";
import { fetchGatewayRead } from "@/lib/gateway-read-client";
import { formatLocalDateInputValue } from "@/lib/local-date";
import { useTeacherWorkspacePreferences } from "@/lib/teacher-workspace-preferences";

type LessonRosterRow = {
  id: string;
  status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED" | null;
};

type LessonRow = {
  id: string;
  className: string;
  subjectName: string;
  startTime: string | null;
  endTime: string | null;
  room: string | null;
  rosterCount: number;
  roster: LessonRosterRow[];
};

type RollcallResponse = {
  success?: boolean;
  data?: LessonRow[];
  error?: string;
};

type TeacherOversightItem = {
  title: string;
  meta: string;
};

type TeacherActivity = {
  assignments: TeacherOversightItem[];
  attendance: TeacherOversightItem[];
  results: TeacherOversightItem[];
};

type DashboardDetailResponse = {
  data?: {
    teacher?: {
      oversight?: {
        recentAssignments?: Array<{
          title?: string | null;
          className?: string | null;
          dueDate?: string | null;
        }>;
        recentAttendance?: Array<{
          sessionName?: string | null;
          date?: string | null;
          status?: string | null;
        }>;
        recentResults?: Array<{
          studentName?: string | null;
          subjectName?: string | null;
          grade?: string | null;
          score?: number | null;
        }>;
      } | null;
    } | null;
  } | null;
  error?: string;
};

export default function TeacherDashboardPage() {
  const {
    account,
    stats,
    workload,
    loading: workspaceLoading,
  } = useTeacherWorkspace();
  const { preferences } = useTeacherWorkspacePreferences();
  const [lessonsLoading, setLessonsLoading] = useState(true);
  const [activityLoading, setActivityLoading] = useState(true);
  const [lessonsError, setLessonsError] = useState("");
  const [activityError, setActivityError] = useState("");
  const [lessons, setLessons] = useState<LessonRow[]>([]);
  const [activity, setActivity] = useState<TeacherActivity>({
    assignments: [],
    attendance: [],
    results: [],
  });
  const today = useMemo(() => formatLocalDateInputValue(), []);

  useEffect(() => {
    let cancelled = false;

    async function loadLessons() {
      setLessonsLoading(true);
      setLessonsError("");

      try {
        const response = await fetchGatewayRead(`/api/teacher/classes?date=${today}`, {
          cache: "no-store",
          fallbackToLocal: true,
        });
        const payload = (await response.json()) as RollcallResponse;
        if (!response.ok) {
          throw new Error(payload.error || "Failed to load today's lessons");
        }

        if (!cancelled) {
          setLessons(payload.data || []);
        }
      } catch (loadError: unknown) {
        if (!cancelled) {
          setLessons([]);
          setLessonsError(
            loadError instanceof Error ? loadError.message : "Failed to load today's lessons"
          );
        }
      } finally {
        if (!cancelled) {
          setLessonsLoading(false);
        }
      }
    }

    void loadLessons();

    return () => {
      cancelled = true;
    };
  }, [today]);

  useEffect(() => {
    let cancelled = false;

    async function loadActivity() {
      setActivityLoading(true);
      setActivityError("");

      try {
        const response = await fetchGatewayRead("/api/teacher/dashboard", {
          cache: "no-store",
          fallbackToLocal: true,
        });
        const payload = (await response.json()) as DashboardDetailResponse;
        if (!response.ok) {
          throw new Error(payload.error || "Failed to load teacher activity");
        }

        const oversight = payload.data?.teacher?.oversight;
        if (!cancelled) {
          setActivity({
            assignments:
              oversight?.recentAssignments?.map((item) => ({
                title: item.title || "Assignment",
                meta: `${item.className || "Class"}${item.dueDate ? ` | Due ${item.dueDate}` : ""}`,
              })) || [],
            attendance:
              oversight?.recentAttendance?.map((item) => ({
                title: item.sessionName || "Lesson",
                meta: `${item.date || "No date"}${item.status ? ` | ${item.status}` : ""}`,
              })) || [],
            results:
              oversight?.recentResults?.map((item) => ({
                title: item.studentName || "Student",
                meta: `${item.subjectName || "Subject"}${item.grade ? ` | ${item.grade}` : ""}${item.score != null ? ` | ${item.score}` : ""}`,
              })) || [],
          });
        }
      } catch (loadError: unknown) {
        if (!cancelled) {
          setActivity({
            assignments: [],
            attendance: [],
            results: [],
          });
          setActivityError(
            loadError instanceof Error ? loadError.message : "Failed to load teacher activity"
          );
        }
      } finally {
        if (!cancelled) {
          setActivityLoading(false);
        }
      }
    }

    void loadActivity();

    return () => {
      cancelled = true;
    };
  }, []);

  const teacher = account?.teacher;
  const compactCards = preferences.compactCards;
  const classesCount = useMemo(() => new Set(lessons.map((lesson) => lesson.className)).size, [lessons]);
  const dashboardStatCards = [
    {
      label: "Lessons",
      value: workspaceLoading ? "..." : String(stats.lessons),
      icon: CalendarClock,
      href: "/teacher/teaching",
      clickable: true,
    },
    {
      label: "Students",
      value: workspaceLoading ? "..." : String(stats.students),
      icon: GraduationCap,
      href: "/teacher/students",
      clickable: true,
    },
    {
      label: "Classes",
      value: lessonsLoading ? "..." : String(classesCount),
      icon: Users,
      href: "/teacher/classes",
      clickable: true,
    },
    {
      label: "Completed",
      value: workspaceLoading ? "..." : String(stats.completed),
      icon: CheckCircle2,
      href: "/teacher/attendance?filter=completed",
      clickable: false,
    },
    {
      label: "Pending",
      value: workspaceLoading ? "..." : String(teacher?.pendingRollCalls ?? stats.pending),
      icon: ClipboardList,
      href: "/teacher/classes?filter=pending",
      clickable: false,
    },
  ] as const;

  return (
    <div className={`flex-1 ${compactCards ? "space-y-5 p-3 md:p-5" : "space-y-6 p-4 md:p-6"}`}>
      <section className={`rounded-3xl border border-slate-200 bg-white shadow-sm ${compactCards ? "p-5" : "p-6"}`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-400">
              Teacher Dashboard
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">
              Daily workspace overview
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              Keep the main teacher actions simple: open lessons, students, or classes from the
              cards below and check notifications from the top bar.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/teacher/classes"
              className="inline-flex items-center gap-2 rounded-2xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-700"
            >
              Open Rollcall
              <MoveRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <div className={`grid md:grid-cols-2 xl:grid-cols-5 ${compactCards ? "gap-3" : "gap-4"}`}>
        {dashboardStatCards.map((card) => (
          <DashboardCard key={card.label} compactCards={compactCards} {...card} />
        ))}
      </div>

      <section className={`rounded-3xl border border-slate-200 bg-white shadow-sm ${compactCards ? "p-5" : "p-6"}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Teacher shortcuts
            </p>
            <h2 className="mt-2 text-xl font-semibold text-slate-900">Only the pages you use most</h2>
          </div>
          {workspaceLoading ? <Loader2 className="h-5 w-5 animate-spin text-slate-400" /> : null}
        </div>

        <div className={`mt-5 grid md:grid-cols-2 xl:grid-cols-3 ${compactCards ? "gap-3" : "gap-4"}`}>
          <ActionCard
            href="/teacher/notifications"
            label="Notifications"
            value={workspaceLoading ? "..." : String(workload.unreadNotifications)}
            icon={Bell}
            compactCards={compactCards}
          />
          <ActionCard
            href="/teacher/classes"
            label="Pending rollcall"
            value={workspaceLoading ? "..." : String(teacher?.pendingRollCalls ?? stats.pending)}
            icon={CalendarClock}
            compactCards={compactCards}
          />
          <ActionCard
            href="/teacher/teaching"
            label="Lessons today"
            value={workspaceLoading ? "..." : String(stats.lessons)}
            icon={Sparkles}
            compactCards={compactCards}
          />
        </div>
      </section>

      <div className={`grid xl:grid-cols-[minmax(0,1fr),380px] ${compactCards ? "gap-5" : "gap-6"}`}>
        <div className={compactCards ? "space-y-5" : "space-y-6"}>
          <section className={`rounded-3xl border border-slate-200 bg-white shadow-sm ${compactCards ? "p-5" : "p-6"}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Account snapshot
                </p>
                <h2 className="mt-2 text-xl font-semibold text-slate-900">
                  Admin-provided teacher details
                </h2>
              </div>
              {workspaceLoading ? <Loader2 className="h-5 w-5 animate-spin text-slate-400" /> : null}
            </div>

            <div className={`mt-5 grid md:grid-cols-2 ${compactCards ? "gap-3" : "gap-4"}`}>
              <SnapshotCard compactCards={compactCards} label="Employee number" value={teacher?.employeeId || "Not assigned"} />
              <SnapshotCard compactCards={compactCards} label="Department" value={teacher?.department || "Not assigned"} />
              <SnapshotCard
                compactCards={compactCards}
                label="Specialization"
                value={teacher?.specialization || "Not assigned"}
              />
              <SnapshotCard compactCards={compactCards} label="Tenure" value={teacher?.tenure?.label || "Not recorded"} />
            </div>

            <div className={`mt-5 grid xl:grid-cols-3 ${compactCards ? "gap-3" : "gap-4"}`}>
              <TagListCard
                compactCards={compactCards}
                title="Assigned classes"
                items={teacher?.assignedClasses?.map((item) => item.name) || []}
                emptyLabel="No classes assigned yet."
              />
              <TagListCard
                compactCards={compactCards}
                title="Assigned subjects"
                items={teacher?.assignedSubjects?.map((item) => item.name) || []}
                emptyLabel="No subjects assigned yet."
              />
              <TagListCard
                compactCards={compactCards}
                title="Supervised classes"
                items={teacher?.supervisedClasses?.map((item) => item.name) || []}
                emptyLabel="No supervised classes yet."
              />
            </div>
          </section>

          <section className={`rounded-3xl border border-slate-200 bg-white shadow-sm ${compactCards ? "p-5" : "p-6"}`}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Today&apos;s lessons</h2>
                <p className="text-sm text-slate-500">{today}</p>
              </div>
              {lessonsLoading ? <Loader2 className="h-5 w-5 animate-spin text-slate-400" /> : null}
            </div>

            {lessonsError ? (
              <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {lessonsError}
              </div>
            ) : null}

            <div className={`${compactCards ? "mt-4 space-y-2.5" : "mt-5 space-y-3"}`}>
              {!lessonsLoading && lessons.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
                  No teacher lessons are available for rollcall yet.
                </div>
              ) : null}

              {lessons.map((lesson) => {
                const marked = lesson.roster.filter((student) => Boolean(student.status)).length;
                const state = buildRollcallCompletionState({
                  rosterCount: lesson.rosterCount,
                  selectedStatuses: marked,
                });

                return (
                  <Link
                    key={lesson.id}
                    href={`/teacher/classes?lessonId=${lesson.id}&view=roster`}
                    className={`block rounded-2xl border border-slate-200 transition hover:border-sky-200 hover:bg-sky-50/40 ${compactCards ? "px-4 py-3" : "px-4 py-4"}`}
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <p className="font-semibold text-slate-900">{lesson.subjectName}</p>
                        <p className="mt-1 text-sm text-slate-500">
                          {lesson.className} | {formatTimeRange(lesson.startTime, lesson.endTime)}
                          {lesson.room ? ` | Room ${lesson.room}` : ""}
                        </p>
                      </div>
                      <span className={stateBadge(state)}>
                        {state === "complete"
                          ? "Saved"
                          : state === "incomplete"
                            ? "Pending"
                            : "Empty"}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        </div>

        <div className={compactCards ? "space-y-5" : "space-y-6"}>
          <section className={`rounded-3xl border border-slate-200 bg-white shadow-sm ${compactCards ? "p-5" : "p-6"}`}>
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Recent activity
              </p>
              {activityLoading ? <Loader2 className="h-5 w-5 animate-spin text-slate-400" /> : null}
            </div>

            {activityError ? (
              <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {activityError}
              </div>
            ) : null}

            <div className={`${compactCards ? "mt-4 space-y-3" : "mt-4 space-y-4"}`}>
              <ActivityList
                title="Assignments"
                href="/teacher/assignments"
                items={activity.assignments}
                emptyLabel="No recent assignments."
                compactCards={compactCards}
              />
              <ActivityList
                title="Attendance"
                href="/teacher/attendance"
                items={activity.attendance}
                emptyLabel="No recent attendance activity."
                compactCards={compactCards}
              />
              <ActivityList
                title="Results"
                href="/teacher/results"
                items={activity.results}
                emptyLabel="No recent results."
                compactCards={compactCards}
              />
            </div>
          </section>

          <Announcements />
        </div>
      </div>
    </div>
  );
}

function DashboardCard({
  label,
  value,
  icon: Icon,
  href,
  clickable,
  compactCards,
}: {
  label: string;
  value: string;
  icon: any;
  href: string;
  clickable: boolean;
  compactCards?: boolean;
}) {
  const className = `rounded-3xl border border-slate-200 bg-white shadow-sm ${
    clickable
      ? "transition hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-md"
      : ""
  } ${compactCards ? "p-4" : "p-5"}`;

  const content = (
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className={`font-semibold text-slate-900 ${compactCards ? "mt-2 text-2xl" : "mt-3 text-3xl"}`}>{value}</p>
          {clickable ? (
            <p className={`text-xs font-semibold uppercase tracking-[0.16em] text-sky-600 ${compactCards ? "mt-2" : "mt-3"}`}>
              Open page
            </p>
          ) : (
            <p className={`text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 ${compactCards ? "mt-2" : "mt-3"}`}>
              Overview only
            </p>
          )}
        </div>
        <div className={`grid place-items-center rounded-2xl bg-sky-50 text-sky-600 ${compactCards ? "h-10 w-10" : "h-12 w-12"}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
  );

  if (!clickable) {
    return <div className={className}>{content}</div>;
  }

  return (
    <Link href={href} className={className}>
      {content}
    </Link>
  );
}

function ActionCard({
  href,
  label,
  value,
  icon: Icon,
  compactCards,
}: {
  href: string;
  label: string;
  value: string;
  icon: any;
  compactCards?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`rounded-2xl border border-slate-200 bg-slate-50 transition hover:border-slate-300 hover:bg-white ${
        compactCards ? "px-4 py-3.5" : "px-4 py-4"
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">{label}</p>
          <p className={`font-semibold text-slate-900 ${compactCards ? "mt-1.5 text-xl" : "mt-2 text-2xl"}`}>{value}</p>
        </div>
        <div className={`grid place-items-center rounded-2xl bg-white text-sky-600 shadow-sm ${compactCards ? "h-10 w-10" : "h-11 w-11"}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </Link>
  );
}

function SnapshotCard({
  label,
  value,
  compactCards,
}: {
  label: string;
  value: string;
  compactCards?: boolean;
}) {
  return (
    <div className={`rounded-2xl border border-slate-200 bg-slate-50 ${compactCards ? "px-4 py-3.5" : "px-4 py-4"}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className={`font-semibold text-slate-900 ${compactCards ? "mt-1.5 text-sm" : "mt-2 text-base"}`}>{value}</p>
    </div>
  );
}

function TagListCard({
  title,
  items,
  emptyLabel,
  compactCards,
}: {
  title: string;
  items: string[];
  emptyLabel: string;
  compactCards?: boolean;
}) {
  return (
    <div className={`rounded-2xl border border-slate-200 ${compactCards ? "p-3.5" : "p-4"}`}>
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {items.length === 0 ? (
          <p className="text-sm text-slate-500">{emptyLabel}</p>
        ) : (
          items.map((item) => (
            <span
              key={item}
              className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
            >
              {item}
            </span>
          ))
        )}
      </div>
    </div>
  );
}

function ActivityList({
  title,
  href,
  items,
  emptyLabel,
  compactCards,
}: {
  title: string;
  href: string;
  items: TeacherOversightItem[];
  emptyLabel: string;
  compactCards?: boolean;
}) {
  return (
    <section className={`rounded-2xl border border-slate-200 bg-slate-50 ${compactCards ? "p-3.5" : "p-4"}`}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        <Link href={href} className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-600">
          Open
        </Link>
      </div>
      <div className={`${compactCards ? "mt-3 space-y-2.5" : "mt-3 space-y-3"}`}>
        {items.length === 0 ? (
          <Link
            href={href}
            className="block rounded-2xl bg-white px-4 py-3 text-sm text-slate-500 transition hover:border-slate-200 hover:text-slate-700"
          >
            {emptyLabel}
          </Link>
        ) : (
          items.map((item, index) => (
            <Link
              key={`${item.title}-${index}`}
              href={href}
              className="block rounded-2xl bg-white px-4 py-3 transition hover:-translate-y-0.5 hover:shadow-sm"
            >
              <p className="text-sm font-semibold text-slate-900">{item.title}</p>
              <p className="mt-1 text-xs text-slate-500">{item.meta}</p>
            </Link>
          ))
        )}
      </div>
    </section>
  );
}

function stateBadge(state: "complete" | "incomplete" | "empty") {
  if (state === "complete") {
    return "rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700";
  }
  if (state === "incomplete") {
    return "rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700";
  }
  return "rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500";
}

function formatTimeRange(startTime: string | null, endTime: string | null) {
  if (!startTime && !endTime) return "Time not set";
  if (startTime && endTime) return `${startTime} - ${endTime}`;
  return startTime || endTime || "Time not set";
}

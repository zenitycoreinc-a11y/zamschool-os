"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, ClipboardCheck, MessageSquare, Users } from "lucide-react";

import { useTeacherWorkspacePreferences } from "@/lib/teacher-workspace-preferences";

const primaryFlow = [
  {
    title: "Mark rollcall",
    description: "Open the live roster, complete attendance, and catch missing status entries early.",
    href: "/teacher/classes",
    cta: "Open classes",
  },
  {
    title: "Student support",
    description: "See who is slipping on attendance or performance and act before it becomes a bigger issue.",
    href: "/teacher/students",
    cta: "Open students",
  },
  {
    title: "Assignments",
    description: "Create class-scoped work, track grading backlog, and keep deadlines visible.",
    href: "/teacher/assignments",
    cta: "Review assignments",
  },
  {
    title: "Results",
    description: "Publish completed marks and review draft or pending result sets in one place.",
    href: "/teacher/results",
    cta: "Open results",
  },
];

const supportFlow = [
  {
    title: "Attendance history",
    description: "Trace recurring absence or lateness patterns across your classes.",
    href: "/teacher/attendance",
  },
  {
    title: "Message families",
    description: "Reach students, parents, and admins directly from the teacher communication workspace.",
    href: "/teacher/messages",
  },
];

export default function TeacherTeachingPage() {
  const { preferences } = useTeacherWorkspacePreferences();
  const compactCards = preferences.compactCards;

  return (
    <div className="space-y-6">
      <section
        className={`rounded-3xl border border-slate-200 bg-white shadow-sm ${
          compactCards ? "p-5" : "p-6"
        }`}
      >
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-400">
          Teacher Teaching Hub
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">Teaching workspace</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-500">
          Move through rollcall, intervention, assignments, and family communication from one
          focused operational surface.
        </p>
      </section>

      <section
        className={`rounded-3xl border border-slate-200 bg-white shadow-sm ${
          compactCards ? "p-5" : "p-6"
        }`}
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-400">
              Teaching flow
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">Daily execution loop</h2>
          </div>
          <ClipboardCheck className="h-5 w-5 text-sky-600" />
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-4">
          {primaryFlow.map((item) => (
            <section
              key={item.title}
              className={`rounded-3xl border border-slate-200 bg-slate-50 ${
                compactCards ? "p-4" : "p-5"
              }`}
            >
              <h3 className="text-lg font-semibold text-slate-900">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">{item.description}</p>
              <Link
                href={item.href}
                className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-sky-600"
              >
                {item.cta}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </section>
          ))}
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr),minmax(0,0.9fr)]">
        <section
          className={`rounded-3xl border border-slate-200 bg-white shadow-sm ${
            compactCards ? "p-5" : "p-6"
          }`}
        >
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-sky-600" />
            <h2 className="text-xl font-semibold text-slate-900">Student support</h2>
          </div>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
            Use the students workspace to identify who is missing too much school, who is slipping
            academically, and which class needs intervention first.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/teacher/students"
              className="inline-flex rounded-2xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white hover:bg-sky-700"
            >
              Open students
            </Link>
            <Link
              href="/teacher/classes?filter=pending"
              className="inline-flex rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Review pending rollcall
            </Link>
          </div>
        </section>

        <section
          className={`rounded-3xl border border-slate-200 bg-white shadow-sm ${
            compactCards ? "p-5" : "p-6"
          }`}
        >
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-sky-600" />
            <h2 className="text-xl font-semibold text-slate-900">Message families</h2>
          </div>
          <div className="mt-5 space-y-4">
            {supportFlow.map((item) => (
              <Link
                key={item.title}
                href={item.href}
                className="flex items-start justify-between gap-3 rounded-2xl border border-slate-200 px-4 py-4 transition hover:border-sky-200 hover:bg-sky-50/60"
              >
                <div>
                  <p className="font-semibold text-slate-900">{item.title}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-500">{item.description}</p>
                </div>
                {item.title === "Attendance history" ? (
                  <BookOpen className="mt-1 h-4 w-4 shrink-0 text-slate-400" />
                ) : (
                  <MessageSquare className="mt-1 h-4 w-4 shrink-0 text-slate-400" />
                )}
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

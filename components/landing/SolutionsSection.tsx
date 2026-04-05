"use client";

import { useState } from "react";
import {
  Shield,
  GraduationCap,
  BookOpen,
  UsersRound,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { useReveal } from "@/hooks/useReveal";

const roles = [
  {
    key: "admin",
    label: "Admin",
    icon: Shield,
    color: "text-sky-600",
    activeBg: "bg-sky-50 border-sky-200",
    activeText: "text-sky-700",
    iconBg: "bg-sky-100",
    pill: "bg-sky-100 text-sky-700",
    gradientFrom: "from-sky-50",
    accentBar: "bg-sky-400",
    ctaBg: "bg-sky-500 hover:bg-sky-400 shadow-sky-500/25",
    headline: "Total visibility. Total control.",
    description:
      "Run your entire school from one command centre. Monitor every class, every student, every teacher — with real-time dashboards and automated reports that save hours every week.",
    features: [
      "Real-time admin dashboard with live stats",
      "Manage all students, teachers & parents",
      "Full attendance reports across all classes",
      "Fee collection tracking & finance charts",
      "Announcements broadcast to entire school",
      "Bulk import students & staff via CSV",
      "Role-based access for every user type",
      "Exam scheduling & result management",
    ],
    cta: "Set up your school",
    mockStats: [
      { label: "Students", value: "1,248", color: "bg-lamaPurple" },
      { label: "Teachers", value: "64", color: "bg-lamaYellow" },
      { label: "Attendance", value: "91%", color: "bg-lamaPurple" },
      { label: "Classes", value: "32", color: "bg-lamaYellow" },
    ],
  },
  {
    key: "teacher",
    label: "Teacher",
    icon: GraduationCap,
    color: "text-violet-600",
    activeBg: "bg-violet-50 border-violet-200",
    activeText: "text-violet-700",
    iconBg: "bg-violet-100",
    pill: "bg-violet-100 text-violet-700",
    gradientFrom: "from-violet-50",
    accentBar: "bg-violet-400",
    ctaBg: "bg-violet-500 hover:bg-violet-400 shadow-violet-500/25",
    headline: "Focus on teaching. We handle the rest.",
    description:
      "Mark attendance in seconds, enter exam scores, post assignments, and message parents — all without leaving ZamSchool OS. Spend less time on admin and more time inspiring students.",
    features: [
      "One-tap daily attendance marking",
      "Class timetable & lesson planner",
      "Enter and review student exam scores",
      "Post assignments with due dates",
      "View individual student performance",
      "Direct messaging with parents",
      "Announcements to your classes",
      "Generate class-level reports",
    ],
    cta: "Explore teacher tools",
    mockStats: [
      { label: "My Classes", value: "6", color: "bg-lamaSkyLight" },
      { label: "Students", value: "183", color: "bg-lamaYellowLight" },
      { label: "Avg. Score", value: "74%", color: "bg-lamaSkyLight" },
      { label: "Absent Today", value: "4", color: "bg-lamaYellowLight" },
    ],
  },
  {
    key: "student",
    label: "Student",
    icon: BookOpen,
    color: "text-amber-600",
    activeBg: "bg-amber-50 border-amber-200",
    activeText: "text-amber-700",
    iconBg: "bg-amber-100",
    pill: "bg-amber-100 text-amber-700",
    gradientFrom: "from-amber-50",
    accentBar: "bg-amber-400",
    ctaBg: "bg-amber-500 hover:bg-amber-400 shadow-amber-500/25",
    headline: "Everything you need to stay on track.",
    description:
      "View your timetable, check upcoming exams, track your results, and stay up-to-date with school announcements — all from your phone or laptop, wherever you are.",
    features: [
      "Personal timetable & class schedule",
      "View upcoming exams & assignments",
      "Check results and grade history",
      "See your own attendance record",
      "School-wide announcements feed",
      "Downloadable result reports",
      "Access from any device",
      "Instant notifications for updates",
    ],
    cta: "Join as a student",
    mockStats: [
      { label: "Attendance", value: "93%", color: "bg-lamaPurple" },
      { label: "Avg. Grade", value: "A−", color: "bg-lamaYellow" },
      { label: "Assignments", value: "3", color: "bg-lamaPurple" },
      { label: "Next Exam", value: "Mon", color: "bg-lamaYellow" },
    ],
  },
  {
    key: "parent",
    label: "Parent",
    icon: UsersRound,
    color: "text-emerald-600",
    activeBg: "bg-emerald-50 border-emerald-200",
    activeText: "text-emerald-700",
    iconBg: "bg-emerald-100",
    pill: "bg-emerald-100 text-emerald-700",
    gradientFrom: "from-emerald-50",
    accentBar: "bg-emerald-400",
    ctaBg: "bg-emerald-500 hover:bg-emerald-400 shadow-emerald-500/25",
    headline: "Stay close to your child's education.",
    description:
      "Never miss an important school update again. Track your child's attendance in real time, receive fee reminders, check exam results, and communicate directly with teachers.",
    features: [
      "Real-time attendance notifications",
      "View your child's exam results",
      "Fee payment status & reminders",
      "Direct messaging with teachers",
      "School announcements & events",
      "Academic performance history",
      "Multiple children on one account",
      "Works on any mobile device",
    ],
    cta: "Register as a parent",
    mockStats: [
      { label: "Attendance", value: "96%", color: "bg-lamaSkyLight" },
      { label: "Last Result", value: "B+", color: "bg-lamaYellowLight" },
      { label: "Fees Paid", value: "✓", color: "bg-lamaSkyLight" },
      { label: "Messages", value: "2", color: "bg-lamaYellowLight" },
    ],
  },
] as const;

type RoleKey = (typeof roles)[number]["key"];

// ── Role mockup card ──────────────────────────────────────────────────────────

function RoleMockup({ role }: { role: (typeof roles)[number] }) {
  return (
    <div className="w-full max-w-sm">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        {/* Chrome */}
        <div className="bg-gray-50 border-b border-gray-100 px-4 py-2.5 flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
          </div>
          <div className="flex-1 bg-white border border-gray-200 rounded-full px-3 py-0.5">
            <span className="text-[10px] text-gray-400 font-mono">
              zamschool.zm/{role.key}
            </span>
          </div>
        </div>

        {/* Page header */}
        <div className="px-5 pt-5 pb-3 border-b border-gray-50">
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center ${role.iconBg} flex-shrink-0`}
            >
              <role.icon className={`w-5 h-5 ${role.color}`} />
            </div>
            <div>
              <p className="text-[13px] font-extrabold text-slate-800 leading-tight">
                {role.label} Dashboard
              </p>
              <p className="text-[10px] text-slate-400">
                Hillcrest Primary · Lusaka
              </p>
            </div>
          </div>
        </div>

        {/* Stat cards */}
        <div className="p-4 grid grid-cols-2 gap-2.5">
          {role.mockStats.map((card) => (
            <div key={card.label} className={`${card.color} rounded-xl p-3`}>
              <p className="text-[10px] font-semibold text-slate-500 mb-1">
                {card.label}
              </p>
              <p className="text-lg font-extrabold text-slate-800 leading-none">
                {card.value}
              </p>
            </div>
          ))}
        </div>

        {/* Recent activity */}
        <div className="px-4 pb-5">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2.5">
            Recent Activity
          </p>
          <div className="flex flex-col gap-2">
            {[
              "Attendance marked for Grade 7A",
              "New announcement posted",
              "Exam results uploaded",
            ].map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-2.5 p-2.5 bg-gray-50 rounded-xl"
              >
                <div
                  className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${role.accentBar}`}
                />
                <p className="text-[11px] text-slate-600 leading-snug">
                  {item}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Floating badge — pure CSS float animation */}
      <div className="hidden xl:flex absolute -bottom-4 -right-4 items-center gap-2.5 bg-white rounded-xl px-4 py-2.5 shadow-lg border border-gray-100 animate-float">
        <div
          className={`w-7 h-7 rounded-lg flex items-center justify-center ${role.iconBg}`}
        >
          <role.icon className={`w-4 h-4 ${role.color}`} />
        </div>
        <div>
          <p className="text-[10px] font-bold text-slate-800 leading-none">
            {role.label} View
          </p>
          <p className="text-[9px] text-slate-400 leading-none mt-0.5">
            Active now
          </p>
        </div>
        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse ml-1" />
      </div>
    </div>
  );
}

// ── Main section ──────────────────────────────────────────────────────────────

export default function SolutionsSection() {
  const [active, setActive] = useState<RoleKey>("admin");
  const [animating, setAnimating] = useState(false);

  const { ref: headerRevealRef, visible: headerRevealVisible } = useReveal({ margin: "0px 0px 24% 0px" });
  const { ref: tabsRevealRef, visible: tabsRevealVisible } = useReveal({ margin: "0px 0px 20% 0px" });
  const { ref: contentRevealRef, visible: contentRevealVisible } = useReveal({ margin: "0px 0px 16% 0px" });

  const current = roles.find((r) => r.key === active)!;

  const switchRole = (key: RoleKey) => {
    if (key === active || animating) return;
    setAnimating(true);
    // tiny fade-out then switch
    setTimeout(() => {
      setActive(key);
      setAnimating(false);
    }, 200);
  };

  return (
    <section id="solutions" className="py-28 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        {/* ── Section header ──────────────────────────────────── */}
        <div
          ref={headerRevealRef}
          className="text-center max-w-2xl mx-auto mb-14"
          style={{
            opacity: headerRevealVisible ? 1 : 0,
            transform: headerRevealVisible
              ? "translateY(0)"
              : "translateY(6px)",
            transition:
              "opacity 0.36s cubic-bezier(0.22,1,0.36,1), transform 0.36s cubic-bezier(0.22,1,0.36,1)",
          }}
        >
          <span className="inline-block bg-lamaYellowLight text-amber-700 text-xs font-bold tracking-wider uppercase px-4 py-2 rounded-full mb-5 border border-lamaYellow/50">
            Built for Everyone
          </span>
          <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight leading-[1.1]">
            One platform,{" "}
            <span className="bg-gradient-to-r from-amber-500 to-sky-500 bg-clip-text text-transparent">
              four perspectives
            </span>
          </h2>
          <p className="mt-5 text-slate-500 text-lg leading-relaxed">
            Every person in your school gets a tailored experience —
            purpose-built for their specific role and responsibilities.
          </p>
        </div>

        {/* ── Role tab switcher ───────────────────────────────── */}
        <div
          ref={tabsRevealRef}
          className="flex flex-wrap justify-center gap-3 mb-12"
          style={{
            opacity: tabsRevealVisible ? 1 : 0,
            transform: tabsRevealVisible
              ? "translateY(0)"
              : "translateY(8px)",
            transition:
              "opacity 0.28s ease-out 0.15s, transform 0.28s ease-out 0.15s",
          }}
        >
          {roles.map((role) => {
            const isActive = active === role.key;
            return (
              <button
                key={role.key}
                onClick={() => switchRole(role.key)}
                className={`flex items-center gap-2.5 px-5 py-3 rounded-2xl border-2 font-semibold text-sm transition-all duration-200 ${
                  isActive
                    ? `${role.activeBg} ${role.activeText} shadow-md -translate-y-0.5`
                    : "bg-white border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700 hover:-translate-y-px"
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors duration-200 ${
                    isActive ? role.iconBg : "bg-gray-100"
                  }`}
                >
                  <role.icon
                    className={`w-4 h-4 transition-colors duration-200 ${
                      isActive ? role.color : "text-gray-400"
                    }`}
                  />
                </div>
                {role.label}
                {/* Active dot */}
                <span
                  className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                    isActive
                      ? `${role.accentBar} opacity-100 scale-100`
                      : "opacity-0 scale-0"
                  }`}
                />
              </button>
            );
          })}
        </div>

        {/* ── Tab content — CSS opacity transition ──────────── */}
        <div
          ref={contentRevealRef}
          style={{
            opacity: contentRevealVisible ? (animating ? 0 : 1) : 0,
            transform: contentRevealVisible
              ? animating
                ? "translateY(-4px)"
                : "translateY(0)"
              : "translateY(10px)",
            transition: animating
              ? "opacity 0.18s ease-in, transform 0.18s ease-in"
              : "opacity 0.26s cubic-bezier(0.22,1,0.36,1), transform 0.26s cubic-bezier(0.22,1,0.36,1)",
          }}
          className={`rounded-3xl overflow-hidden border border-gray-100 shadow-lg bg-gradient-to-br ${current.gradientFrom} to-white`}
        >
          <div className="grid lg:grid-cols-2 gap-0">
            {/* ── Left: copy ──────────────────────────────────── */}
            <div className="p-8 md:p-12 flex flex-col justify-center">
              {/* Role badge */}
              <span
                className={`inline-flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full w-fit mb-6 ${current.pill}`}
              >
                <current.icon className="w-3.5 h-3.5" />
                For {current.label}s
              </span>

              {/* Headline */}
              <h3 className="text-2xl md:text-3xl font-extrabold text-slate-900 leading-tight mb-4">
                {current.headline}
              </h3>

              {/* Description */}
              <p className="text-slate-500 leading-relaxed mb-8">
                {current.description}
              </p>

              {/* Feature list */}
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 mb-10">
                {current.features.map((feat) => (
                  <li
                    key={feat}
                    className="flex items-start gap-2.5 text-sm text-slate-700"
                  >
                    <CheckCircle2
                      className={`w-4 h-4 mt-0.5 flex-shrink-0 ${current.color}`}
                    />
                    {feat}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <Link
                href="/register"
                className={`inline-flex items-center gap-2.5 self-start px-6 py-3.5 rounded-full font-bold text-sm text-white transition-all duration-200 shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 ${current.ctaBg}`}
              >
                {current.cta}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* ── Right: role mockup ───────────────────────────── */}
            <div className="hidden lg:flex items-center justify-center p-8 md:p-12 relative">
              <RoleMockup role={current} />
            </div>
          </div>
        </div>

        {/* ── Indicator dots ──────────────────────────────────── */}
        <div className="flex justify-center gap-2 mt-8">
          {roles.map((role) => (
            <button
              key={role.key}
              onClick={() => switchRole(role.key)}
              aria-label={`Switch to ${role.label}`}
              className={`rounded-full transition-all duration-300 ${
                active === role.key
                  ? `w-6 h-2 ${role.accentBar}`
                  : "w-2 h-2 bg-gray-200 hover:bg-gray-300"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}


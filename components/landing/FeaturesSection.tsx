"use client";

import {
  ArrowRight,
  GraduationCap,
  Users,
  CalendarCheck,
  MessageSquare,
  ClipboardList,
  BadgeDollarSign,
} from "lucide-react";
import { useReveal } from "@/hooks/useReveal";

const features = [
  {
    icon: GraduationCap,
    title: "Student Management",
    description:
      "Complete student profiles, enrollment tracking, academic history, and performance analytics — all in one place.",
    color: "bg-lamaSkyLight",
    iconBg: "bg-sky-100",
    iconColor: "text-sky-600",
    border: "border-lamaSky/40",
    hoverBorder: "hover:border-sky-300",
    accent: "group-hover:text-sky-600",
    tag: "Core",
    tagColor: "bg-sky-100 text-sky-600",
    learnMoreColor: "text-sky-600",
  },
  {
    icon: Users,
    title: "Teacher & Staff",
    description:
      "Manage teacher profiles, subject assignments, timetables, and staff evaluations with full role-based access.",
    color: "bg-lamaPurpleLight",
    iconBg: "bg-violet-100",
    iconColor: "text-violet-600",
    border: "border-lamaPurple/40",
    hoverBorder: "hover:border-violet-300",
    accent: "group-hover:text-violet-600",
    tag: "Core",
    tagColor: "bg-violet-100 text-violet-600",
    learnMoreColor: "text-violet-600",
  },
  {
    icon: CalendarCheck,
    title: "Attendance Tracking",
    description:
      "Daily roll call, real-time absence reports, trends over time, and automated parent notifications via SMS or email.",
    color: "bg-lamaYellowLight",
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
    border: "border-lamaYellow/40",
    hoverBorder: "hover:border-amber-300",
    accent: "group-hover:text-amber-600",
    tag: "Popular",
    tagColor: "bg-amber-100 text-amber-600",
    learnMoreColor: "text-amber-600",
  },
  {
    icon: MessageSquare,
    title: "Parent Communication",
    description:
      "Seamless two-way messaging between school and parents. Share progress reports, announcements, and fee reminders instantly.",
    color: "bg-lamaSkyLight",
    iconBg: "bg-sky-100",
    iconColor: "text-sky-600",
    border: "border-lamaSky/40",
    hoverBorder: "hover:border-sky-300",
    accent: "group-hover:text-sky-600",
    tag: "Popular",
    tagColor: "bg-sky-100 text-sky-600",
    learnMoreColor: "text-sky-600",
  },
  {
    icon: ClipboardList,
    title: "Exams & Results",
    description:
      "Schedule exams, capture marks, calculate grades automatically, and generate printable result slips for every student.",
    color: "bg-lamaPurpleLight",
    iconBg: "bg-violet-100",
    iconColor: "text-violet-600",
    border: "border-lamaPurple/40",
    hoverBorder: "hover:border-violet-300",
    accent: "group-hover:text-violet-600",
    tag: "Core",
    tagColor: "bg-violet-100 text-violet-600",
    learnMoreColor: "text-violet-600",
  },
  {
    icon: BadgeDollarSign,
    title: "Finance & Fees",
    description:
      "Track fee collections, generate payment receipts, and visualise school income vs expenses with rich, interactive charts.",
    color: "bg-lamaYellowLight",
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
    border: "border-lamaYellow/40",
    hoverBorder: "hover:border-amber-300",
    accent: "group-hover:text-amber-600",
    tag: "New",
    tagColor: "bg-amber-100 text-amber-600",
    learnMoreColor: "text-amber-600",
  },
];

// Stagger delays for each card
const CARD_DELAYS = ["0ms", "40ms", "80ms", "120ms", "160ms", "200ms"];

export default function FeaturesSection() {
  const { ref: headerRevealRef, visible: headerRevealVisible } = useReveal({ margin: "0px 0px 24% 0px" });
  const { ref: gridRevealRef, visible: gridRevealVisible } = useReveal({ margin: "0px 0px 20% 0px" });
  const { ref: footerRevealRef, visible: footerRevealVisible } = useReveal({ margin: "0px 0px 16% 0px" });

  return (
    <section id="features" className="py-28 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        {/* ── Section header ─────────────────────────────────── */}
        <div
          ref={headerRevealRef}
          className="text-center max-w-2xl mx-auto mb-16"
          style={{
            opacity: headerRevealVisible ? 1 : 0,
            transform: headerRevealVisible
              ? "translateY(0)"
              : "translateY(6px)",
            transition:
              "opacity 0.36s cubic-bezier(0.22,1,0.36,1), transform 0.36s cubic-bezier(0.22,1,0.36,1)",
          }}
        >
          <span className="inline-block bg-lamaSkyLight text-sky-700 text-xs font-bold tracking-wider uppercase px-4 py-2 rounded-full mb-5 border border-lamaSky/40">
            Platform Features
          </span>
          <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight leading-[1.1]">
            Everything your school needs,{" "}
            <span className="bg-gradient-to-r from-sky-500 to-violet-500 bg-clip-text text-transparent">
              in one place
            </span>
          </h2>
          <p className="mt-5 text-slate-500 text-lg leading-relaxed">
            Replace registers, spreadsheets, and scattered apps with a single
            platform that works the way African schools actually operate.
          </p>
        </div>

        {/* ── Feature cards grid ─────────────────────────────── */}
        <div
          ref={gridRevealRef}
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-5"
        >
          {features.map((feature, i) => (
            <div
              key={feature.title}
              className={`group relative ${feature.color} border ${feature.border} ${feature.hoverBorder} rounded-2xl p-7 cursor-default overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-1.5`}
              style={{
                opacity: gridRevealVisible ? 1 : 0,
                transform: gridRevealVisible
                  ? "translateY(0)"
                  : "translateY(6px)",
                transition: `opacity 0.32s cubic-bezier(0.22,1,0.36,1) ${CARD_DELAYS[i]}, transform 0.32s cubic-bezier(0.22,1,0.36,1) ${CARD_DELAYS[i]}, box-shadow 0.2s ease, border-color 0.2s ease`,
              }}
            >
              {/* Tag */}
              <span
                className={`absolute top-5 right-5 text-[10px] font-bold px-2.5 py-1 rounded-full ${feature.tagColor}`}
              >
                {feature.tag}
              </span>

              {/* Icon */}
              <div
                className={`w-[52px] h-[52px] rounded-2xl ${feature.iconBg} flex items-center justify-center mb-5 shadow-sm group-hover:scale-110 transition-transform duration-300`}
              >
                <feature.icon className={`w-6 h-6 ${feature.iconColor}`} />
              </div>

              {/* Title */}
              <h3
                className={`text-[17px] font-extrabold text-slate-900 mb-2.5 transition-colors duration-200 ${feature.accent}`}
              >
                {feature.title}
              </h3>

              {/* Description */}
              <p className="text-slate-500 text-sm leading-relaxed">
                {feature.description}
              </p>

              {/* Learn more link — slides in on hover via CSS */}
              <div
                className={`mt-5 inline-flex items-center gap-1.5 text-sm font-semibold opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all duration-200 ${feature.learnMoreColor}`}
              >
                Learn more
                <ArrowRight className="w-3.5 h-3.5" />
              </div>

              {/* Decorative glow blob */}
              <div className="absolute -bottom-8 -right-8 w-28 h-28 rounded-full bg-white/40 blur-2xl pointer-events-none group-hover:scale-150 transition-transform duration-500" />
            </div>
          ))}
        </div>

        {/* ── Bottom caption ─────────────────────────────────── */}
        <div
          ref={footerRevealRef}
          className="mt-16 text-center"
          style={{
            opacity: footerRevealVisible ? 1 : 0,
            transform: footerRevealVisible
              ? "translateY(0)"
              : "translateY(8px)",
            transition:
              "opacity 0.28s ease-out 0.3s, transform 0.28s ease-out 0.3s",
          }}
        >
          <p className="text-slate-400 text-sm">
            And much more — timetables, bulk imports, role-based dashboards, and
            AI-powered insights.
          </p>
        </div>
      </div>
    </section>
  );
}


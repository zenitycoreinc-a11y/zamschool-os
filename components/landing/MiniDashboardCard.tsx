"use client";

import Image from "next/image";
import {
  BarChart,
  Bar,
  XAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import {
  Home,
  GraduationCap,
  Users,
  BookOpen,
  CalendarCheck,
  Megaphone,
  Bell,
  MoreHorizontal,
} from "lucide-react";

const attendanceData = [
  { day: "Mon", present: 88 },
  { day: "Tue", present: 93 },
  { day: "Wed", present: 79 },
  { day: "Thu", present: 96 },
  { day: "Fri", present: 84 },
];

const statCards = [
  { label: "Students", value: "1,248", color: "bg-lamaPurple" },
  { label: "Teachers", value: "64",    color: "bg-lamaYellow" },
  { label: "Parents",  value: "980",   color: "bg-lamaPurple" },
  { label: "Classes",  value: "32",    color: "bg-lamaYellow" },
];

const sideNavItems = [
  { icon: Home,          label: "Dashboard",    active: true  },
  { icon: GraduationCap, label: "Students",     active: false },
  { icon: Users,         label: "Teachers",     active: false },
  { icon: BookOpen,      label: "Classes",      active: false },
  { icon: CalendarCheck, label: "Attendance",   active: false },
  { icon: Megaphone,     label: "Announcements",active: false },
];

const announcements = [
  { title: "Term 3 Exams Begin",     date: "Oct 14", bg: "bg-lamaSkyLight",    border: "border-lamaSky/30"    },
  { title: "Sports Day – All Students", date: "Oct 18", bg: "bg-lamaPurpleLight", border: "border-lamaPurple/30" },
  { title: "Fee Payment Deadline",   date: "Oct 31", bg: "bg-lamaYellowLight", border: "border-lamaYellow/30" },
];

export default function MiniDashboardCard() {
  return (
    <div
      className="relative w-full max-w-[580px] mx-auto rounded-2xl overflow-hidden"
      style={{
        transform: "perspective(1400px) rotateY(-10deg) rotateX(4deg) scale(1)",
        boxShadow:
          "0 60px 120px rgba(0,0,0,0.45), 0 20px 40px rgba(0,0,0,0.2), 0 0 0 1px rgba(255,255,255,0.08)",
        transformStyle: "preserve-3d",
      }}
    >
      {/* ── Browser chrome ─────────────────────────────── */}
      <div className="bg-[#1e2333] border-b border-white/10 px-4 py-3 flex items-center gap-3">
        {/* Traffic lights */}
        <div className="flex gap-1.5 flex-shrink-0">
          <div className="w-3 h-3 rounded-full bg-red-400/90" />
          <div className="w-3 h-3 rounded-full bg-yellow-400/90" />
          <div className="w-3 h-3 rounded-full bg-green-400/90" />
        </div>
        {/* Address bar */}
        <div className="flex-1 bg-white/10 rounded-full px-3 py-1 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
          <span className="text-[11px] text-white/50 font-mono truncate">
            app.zamschool.zm/admin
          </span>
        </div>
      </div>

      {/* ── Dashboard body ──────────────────────────────── */}
      <div className="flex bg-[#F7F8FA]" style={{ height: 400 }}>

        {/* Sidebar */}
        <div className="w-14 bg-slate-900 flex flex-col items-center py-4 gap-1 flex-shrink-0">
          {/* Logo mark */}
          <div className="w-8 h-8 rounded-xl overflow-hidden mb-3 shadow-lg">
            <Image
              src="/icon.png"
              alt="ZamSchool OS"
              width={32}
              height={32}
              className="w-full h-full object-cover"
            />
          </div>
          {sideNavItems.map(({ icon: Icon, label, active }) => (
            <div
              key={label}
              title={label}
              className={`w-9 h-9 rounded-xl flex items-center justify-center cursor-default transition-colors ${
                active
                  ? "bg-lamaSky/20 text-sky-300"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <Icon className="w-4 h-4" />
            </div>
          ))}
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-hidden p-3 gap-3 min-w-0">

          {/* Top bar */}
          <div className="flex items-center justify-between flex-shrink-0">
            <div>
              <p className="text-[11px] font-bold text-slate-800 leading-tight">Admin Dashboard</p>
              <p className="text-[9px] text-slate-400">Hillcrest Primary · Lusaka</p>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center">
                <Bell className="w-3 h-3 text-slate-400" />
              </div>
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white text-[9px] font-extrabold shadow">
                A
              </div>
            </div>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-4 gap-2 flex-shrink-0">
            {statCards.map((card) => (
              <div
                key={card.label}
                className={`${card.color} rounded-xl p-2.5`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="text-[8px] bg-white/60 text-green-600 font-bold px-1.5 py-0.5 rounded-full">
                    2025/26
                  </span>
                  <MoreHorizontal className="w-3 h-3 text-slate-400" />
                </div>
                <p className="text-sm font-extrabold text-slate-800">{card.value}</p>
                <p className="text-[9px] font-semibold text-slate-500 capitalize">{card.label}</p>
              </div>
            ))}
          </div>

          {/* Charts + announcements row */}
          <div className="grid grid-cols-5 gap-2 flex-1 min-h-0">

            {/* Attendance bar chart */}
            <div className="col-span-3 bg-white rounded-xl p-2.5 flex flex-col min-h-0">
              <div className="flex items-center justify-between mb-1 flex-shrink-0">
                <p className="text-[10px] font-bold text-slate-700">Weekly Attendance</p>
                <MoreHorizontal className="w-3 h-3 text-slate-300" />
              </div>
              <div className="flex-1 min-h-0 min-w-0">
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <BarChart data={attendanceData} barSize={10} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                    <XAxis
                      dataKey="day"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 8, fill: "#9ca3af" }}
                    />
                    <Tooltip
                      cursor={{ fill: "rgba(195,235,250,0.15)" }}
                      contentStyle={{
                        fontSize: "10px",
                        borderRadius: "8px",
                        border: "none",
                        boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
                        padding: "4px 8px",
                      }}
                      formatter={(v) => [`${Number(v ?? 0)}%`, "Present"]}
                    />
                    <Bar
                      dataKey="present"
                      fill="#C3EBFA"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Announcements */}
            <div className="col-span-2 bg-white rounded-xl p-2.5 flex flex-col min-h-0">
              <p className="text-[10px] font-bold text-slate-700 mb-2 flex-shrink-0">
                Announcements
              </p>
              <div className="flex flex-col gap-1.5 flex-1 overflow-hidden">
                {announcements.map((ann) => (
                  <div
                    key={ann.title}
                    className={`${ann.bg} border ${ann.border} rounded-lg px-2 py-1.5`}
                  >
                    <p className="text-[8.5px] font-semibold text-slate-700 leading-tight truncate">
                      {ann.title}
                    </p>
                    <p className="text-[8px] text-slate-400 mt-0.5">{ann.date}</p>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Shine overlay */}
      <div
        className="absolute inset-0 pointer-events-none rounded-2xl"
        style={{
          background:
            "linear-gradient(135deg, rgba(255,255,255,0.07) 0%, transparent 50%, rgba(0,0,0,0.05) 100%)",
        }}
      />
    </div>
  );
}

"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, Play, ChevronDown } from "lucide-react";
import MiniDashboardCard from "./MiniDashboardCard";

const bullets = [
  "Real-time attendance tracking",
  "Parent communication portal",
  "Automated report generation",
  "Works on any device, anywhere",
];

export default function HeroSection() {
  const scrollDown = () => {
    const el = document.getElementById("features");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section
      id="hero"
      className="relative min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 overflow-hidden flex flex-col"
    >
      {/* ── Dot-grid background ──────────────────────────────── */}
      <div
        className="absolute inset-0 opacity-[0.07] pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle, #ffffff 1px, transparent 1px)",
          backgroundSize: "36px 36px",
        }}
      />

      {/* ── Ambient colour orbs ──────────────────────────────── */}
      <div className="absolute -top-32 left-1/4 w-[600px] h-[600px] bg-sky-500/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-violet-600/15 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-1/2 left-0 w-[300px] h-[300px] bg-blue-400/10 rounded-full blur-[80px] pointer-events-none" />

      {/* ── Main content ─────────────────────────────────────── */}
      <div className="relative flex-1 max-w-7xl mx-auto px-6 pt-28 pb-16 w-full grid lg:grid-cols-2 gap-10 xl:gap-20 items-center">
        {/* ── LEFT – copy ──────────────────────────────────────── */}
        <div className="flex flex-col">
          {/* Live badge */}
          <div className="animate-fade-up inline-flex items-center gap-2.5 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2 text-sm text-sky-300 font-semibold w-fit mb-8 shadow-lg">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
            </span>
            Now live for Zambian schools 🇿🇲
          </div>

          {/* Headline */}
          <h1 className="animate-fade-up delay-100 text-5xl md:text-6xl xl:text-[4.25rem] font-extrabold text-white leading-[1.06] tracking-tight">
            The Smart School
            <span className="block mt-1 bg-gradient-to-r from-sky-300 via-blue-300 to-violet-300 bg-clip-text text-transparent">
              Operating System
            </span>
            <span className="block text-white/90">for Modern African</span>
            <span className="block text-white/90">Schools.</span>
          </h1>

          {/* Description */}
          <p className="animate-fade-up delay-200 mt-6 text-lg text-slate-300/90 max-w-lg leading-relaxed">
            Manage students, teachers, attendance, parent communication, exams,
            and finances — all in one powerful platform built for Africa.
          </p>

          {/* Bullet points */}
          <ul className="animate-fade-up delay-300 mt-7 flex flex-col gap-2.5">
            {bullets.map((point) => (
              <li
                key={point}
                className="flex items-center gap-3 text-slate-300 text-sm"
              >
                <CheckCircle2 className="w-4 h-4 text-sky-400 flex-shrink-0" />
                {point}
              </li>
            ))}
          </ul>

          {/* CTA row */}
          <div className="animate-fade-up delay-400 mt-10 flex flex-wrap gap-4">
            <Link
              href="/register"
              className="inline-flex items-center gap-2.5 bg-sky-500 hover:bg-sky-400 text-white px-8 py-4 rounded-full font-bold text-[15px] transition-all duration-200 shadow-xl shadow-sky-500/30 hover:shadow-sky-400/40 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]"
            >
              Get Started Free
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2.5 bg-white/10 hover:bg-white/[0.16] text-white border border-white/20 px-8 py-4 rounded-full font-bold text-[15px] backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]"
            >
              <Play className="w-4 h-4 fill-current" />
              Explore Platform
            </Link>
          </div>

          {/* Trust pills */}
          <div className="animate-fade-up delay-600 mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 text-slate-400 text-sm">
            {[
              { highlight: "500+", rest: "Students enrolled" },
              { highlight: "Free", rest: "to start" },
              { highlight: "No", rest: "credit card needed" },
            ].map(({ highlight, rest }, i) => (
              <span key={i} className="flex items-center gap-1.5">
                <span className="font-bold text-white">{highlight}</span>
                <span>{rest}</span>
                {i < 2 && (
                  <span className="ml-6 w-1 h-1 rounded-full bg-slate-600" />
                )}
              </span>
            ))}
          </div>
        </div>

        {/* ── RIGHT – floating dashboard card ──────────────────── */}
        {/*
          Shown on ALL screen sizes:
          – On mobile/tablet: full-width below the copy (stacked grid)
          – On large screens: right column with 3-D perspective tilt
        */}
        <div
          className="animate-scale-in delay-300 flex items-center justify-center"
          style={{ perspective: "1200px" }}
        >
          {/* Outer glow halo */}
          <div className="relative w-full">
            <div className="absolute -inset-6 rounded-3xl bg-gradient-to-br from-sky-400/20 to-violet-500/20 blur-2xl pointer-events-none" />

            {/* ── Floating "live" badge ─────────────────────────── */}
            <div
              className="animate-float absolute -top-4 -left-4 z-10
                hidden sm:flex items-center gap-2 bg-white rounded-xl
                px-3.5 py-2 shadow-xl border border-gray-100"
            >
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
              </span>
              <span className="text-[11px] font-bold text-slate-700 whitespace-nowrap">
                Live dashboard
              </span>
            </div>

            {/* ── "Students today" floating stat ───────────────── */}
            <div
              className="animate-float absolute -bottom-4 -right-4 z-10
                hidden sm:flex items-center gap-2.5 bg-white rounded-xl
                px-3.5 py-2.5 shadow-xl border border-gray-100"
              style={{ animationDelay: "0.8s" }}
            >
              <div className="w-7 h-7 rounded-lg bg-lamaSkyLight flex items-center justify-center flex-shrink-0">
                <span className="text-sky-500 text-xs font-extrabold">96%</span>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-800 leading-none">
                  Attendance today
                </p>
                <p className="text-[9px] text-slate-400 leading-none mt-0.5">
                  Hillcrest Primary
                </p>
              </div>
            </div>

            <MiniDashboardCard />
          </div>
        </div>
      </div>

      {/* ── Scroll-down cue ──────────────────────────────────── */}
      <div className="relative flex justify-center pb-10">
        <button
          onClick={scrollDown}
          aria-label="Scroll to features"
          className="group flex flex-col items-center gap-2 text-white/50 hover:text-white/90 transition-colors duration-200 focus:outline-none"
        >
          <span className="text-[11px] font-semibold tracking-widest uppercase">
            Scroll to explore
          </span>

          {/* Animated chevron stack */}
          <span className="flex flex-col items-center gap-0 relative h-8">
            <ChevronDown
              className="w-5 h-5 absolute top-0"
              style={{
                animation: "scrollCue 1.6s ease-in-out infinite",
                animationDelay: "0s",
              }}
            />
            <ChevronDown
              className="w-5 h-5 absolute top-2.5 opacity-50"
              style={{
                animation: "scrollCue 1.6s ease-in-out infinite",
                animationDelay: "0.25s",
              }}
            />
          </span>

          {/* Mouse icon */}
          <div className="relative w-5 h-8 rounded-full border-2 border-white/30 group-hover:border-white/60 transition-colors duration-200 flex justify-center pt-1 mt-1">
            <span
              className="w-0.5 h-2 rounded-full bg-white/60"
              style={{
                animation: "scrollWheel 1.6s ease-in-out infinite",
              }}
            />
          </div>
        </button>
      </div>

      {/* ── Keyframes for the scroll cue ─────────────────────── */}
      <style>{`
        @keyframes scrollCue {
          0%   { opacity: 0;   transform: translateY(-4px); }
          50%  { opacity: 1;   transform: translateY(4px);  }
          100% { opacity: 0;   transform: translateY(10px); }
        }
        @keyframes scrollWheel {
          0%   { opacity: 1;   transform: translateY(0);    }
          60%  { opacity: 0;   transform: translateY(8px);  }
          100% { opacity: 0;   transform: translateY(8px);  }
        }
      `}</style>

      {/* ── Bottom fade into next section ────────────────────── */}
      <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-white to-transparent pointer-events-none" />
    </section>
  );
}

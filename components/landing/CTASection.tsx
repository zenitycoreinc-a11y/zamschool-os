"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, Sparkles } from "lucide-react";
import { useReveal } from "@/hooks/useReveal";

const perks = [
  "Free to start — no credit card",
  "Set up your school in under 10 minutes",
  "Full platform access from day one",
  "Cancel or upgrade anytime",
];

const avatarGradients = [
  "bg-gradient-to-br from-sky-400 to-blue-600",
  "bg-gradient-to-br from-violet-400 to-purple-600",
  "bg-gradient-to-br from-amber-400 to-orange-500",
  "bg-gradient-to-br from-emerald-400 to-teal-600",
];

const avatarLabels = ["H", "S", "C", "R"];

export default function CTASection() {
  const { ref: badgeRevealRef, visible: badgeRevealVisible } = useReveal({ margin: "0px 0px 24% 0px" });
  const { ref: headRevealRef, visible: headRevealVisible } = useReveal({ margin: "0px 0px 24% 0px" });
  const { ref: subRevealRef, visible: subRevealVisible } = useReveal({ margin: "0px 0px 20% 0px" });
  const { ref: perksRevealRef, visible: perksRevealVisible } = useReveal({ margin: "0px 0px 20% 0px" });
  const { ref: btnsRevealRef, visible: btnsRevealVisible } = useReveal({ margin: "0px 0px 16% 0px" });
  const { ref: socialRevealRef, visible: socialRevealVisible } = useReveal({ margin: "0px 0px 16% 0px" });

  return (
    <section
      id="about"
      className="relative py-32 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 overflow-hidden"
    >
      {/* Dot-grid background */}
      <div
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "radial-gradient(circle, #ffffff 1px, transparent 1px)",
          backgroundSize: "36px 36px",
        }}
      />

      {/* Ambient orbs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-sky-500/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-[400px] h-[300px] bg-violet-600/15 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[300px] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative max-w-4xl mx-auto px-6 text-center">
        {/* ── Badge ──────────────────────────────────────────── */}
        <div
          ref={badgeRevealRef}
          style={{
            opacity: badgeRevealVisible ? 1 : 0,
            transform: badgeRevealVisible
              ? "translateY(0)"
              : "translateY(8px)",
            transition:
              "opacity 0.28s cubic-bezier(0.22,1,0.36,1), transform 0.28s cubic-bezier(0.22,1,0.36,1)",
          }}
          className="inline-flex items-center gap-2.5 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-5 py-2.5 text-sm text-sky-300 font-semibold mb-8"
        >
          <Sparkles className="w-4 h-4 text-amber-300" />
          Start your free school today — takes less than 10 minutes
        </div>

        {/* ── Headline ───────────────────────────────────────── */}
        <div
          ref={headRevealRef}
          style={{
            opacity: headRevealVisible ? 1 : 0,
            transform: headRevealVisible
              ? "translateY(0)"
              : "translateY(6px)",
            transition:
              "opacity 0.42s cubic-bezier(0.22,1,0.36,1) 0.08s, transform 0.42s cubic-bezier(0.22,1,0.36,1) 0.08s",
          }}
        >
          <h2 className="text-5xl md:text-6xl xl:text-7xl font-extrabold text-white leading-[1.07] tracking-tight">
            Ready to transform
            <span className="block mt-2 bg-gradient-to-r from-sky-300 via-blue-300 to-violet-300 bg-clip-text text-transparent">
              your school?
            </span>
          </h2>
        </div>

        {/* ── Sub-copy ───────────────────────────────────────── */}
        <div
          ref={subRevealRef}
          style={{
            opacity: subRevealVisible ? 1 : 0,
            transform: subRevealVisible ? "translateY(0)" : "translateY(8px)",
            transition:
              "opacity 0.34s ease-out 0.22s, transform 0.34s ease-out 0.22s",
          }}
        >
          <p className="mt-7 text-lg md:text-xl text-slate-300/90 max-w-2xl mx-auto leading-relaxed">
            Join schools across Zambia already running smarter with ZamSchool
            OS. Register your school in minutes and give every student, teacher,
            and parent the platform they deserve.
          </p>
        </div>

        {/* ── Perks row ──────────────────────────────────────── */}
        <div
          ref={perksRevealRef}
          style={{
            opacity: perksRevealVisible ? 1 : 0,
            transform: perksRevealVisible
              ? "translateY(0)"
              : "translateY(8px)",
            transition:
              "opacity 0.32s ease-out 0.35s, transform 0.32s ease-out 0.35s",
          }}
          className="mt-8 flex flex-wrap justify-center gap-x-8 gap-y-3"
        >
          {perks.map((perk) => (
            <span
              key={perk}
              className="flex items-center gap-2.5 text-slate-300 text-sm"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              {perk}
            </span>
          ))}
        </div>

        {/* ── CTA buttons ────────────────────────────────────── */}
        <div
          ref={btnsRevealRef}
          style={{
            opacity: btnsRevealVisible ? 1 : 0,
            transform: btnsRevealVisible
              ? "translateY(0)"
              : "translateY(10px)",
            transition:
              "opacity 0.34s ease-out 0.45s, transform 0.34s ease-out 0.45s",
          }}
          className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link
            href="/register"
            className="group inline-flex items-center gap-3 bg-sky-500 hover:bg-sky-400 text-white px-10 py-5 rounded-full font-extrabold text-lg transition-all duration-200 shadow-2xl shadow-sky-500/35 hover:shadow-sky-400/45 hover:-translate-y-1 active:translate-y-0"
          >
            Register Your School
            <ArrowRight className="w-5 h-5 transition-transform duration-200 group-hover:translate-x-1" />
          </Link>

          <Link
            href="/login"
            className="inline-flex items-center gap-3 bg-white/10 hover:bg-white/[0.16] text-white border border-white/20 px-10 py-5 rounded-full font-bold text-lg backdrop-blur-sm transition-all duration-200 hover:-translate-y-1 active:translate-y-0"
          >
            Login to Existing School
          </Link>
        </div>

        {/* ── Social proof badge ─────────────────────────────── */}
        <div
          ref={socialRevealRef}
          style={{
            opacity: socialRevealVisible ? 1 : 0,
            transform: socialRevealVisible ? "scale(1)" : "scale(0.9)",
            transition:
              "opacity 0.32s cubic-bezier(0.22,1,0.36,1) 0.65s, transform 0.32s cubic-bezier(0.22,1,0.36,1) 0.65s",
          }}
          className="mt-14 inline-flex items-center gap-4 bg-white/[0.07] backdrop-blur-sm border border-white/10 rounded-2xl px-6 py-4"
        >
          {/* Stacked avatars */}
          <div className="flex -space-x-2.5 flex-shrink-0">
            {avatarGradients.map((grad, i) => (
              <div
                key={i}
                className={`w-8 h-8 rounded-full ${grad} border-2 border-slate-900 flex items-center justify-center text-white text-[10px] font-extrabold shadow`}
              >
                {avatarLabels[i]}
              </div>
            ))}
          </div>

          <div className="text-left">
            <p className="text-white font-bold text-sm leading-none">
              50+ schools already onboard
            </p>
            <p className="text-slate-400 text-xs mt-1 leading-none">
              Hillcrest, St. Mary&apos;s, Copperbelt Academy &amp; more
            </p>
          </div>

          {/* Live indicator */}
          <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
            </span>
            <span className="text-emerald-400 text-[11px] font-bold">Live</span>
          </div>
        </div>
      </div>
    </section>
  );
}


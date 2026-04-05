"use client";

import { useEffect, useState, useCallback } from "react";

const sections = [
  { id: "hero",             label: "Home"        },
  { id: "features",        label: "Features"    },
  { id: "dashboard",       label: "Dashboard"   },
  { id: "solutions",       label: "Solutions"   },
  { id: "testimonials",    label: "Testimonials"},
  { id: "pricing",         label: "Pricing"     },
  { id: "about",           label: "Get Started" },
];

/** Dot colours paired to each section */
const DOT_COLOURS: Record<string, string> = {
  hero:          "bg-sky-400   shadow-[0_0_0_4px_rgba(56,189,248,0.22)]",
  features:      "bg-violet-400 shadow-[0_0_0_4px_rgba(167,139,250,0.22)]",
  dashboard:     "bg-sky-400   shadow-[0_0_0_4px_rgba(56,189,248,0.22)]",
  solutions:     "bg-amber-400  shadow-[0_0_0_4px_rgba(251,191,36,0.22)]",
  testimonials:  "bg-violet-400 shadow-[0_0_0_4px_rgba(167,139,250,0.22)]",
  pricing:       "bg-sky-400   shadow-[0_0_0_4px_rgba(56,189,248,0.22)]",
  about:         "bg-emerald-400 shadow-[0_0_0_4px_rgba(52,211,153,0.22)]",
};

export default function ScrollIndicator() {
  const [active, setActive]         = useState("hero");
  const [visible, setVisible]       = useState(false);
  const [clicked, setClicked]       = useState<string | null>(null);

  /* ── Show the indicator only after the user scrolls a little ── */
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 120);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* ── Track which section is currently in the viewport ──────── */
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActive(entry.target.id);
          }
        });
      },
      { threshold: 0.35 }
    );

    sections.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  /* ── Smooth-scroll to a section on click ───────────────────── */
  const scrollTo = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (!el) return;

    /* Ripple feedback */
    setClicked(id);
    setTimeout(() => setClicked(null), 600);

    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  return (
    <nav
      aria-label="Page sections"
      className={`fixed right-5 top-1/2 -translate-y-1/2 z-40
        hidden lg:flex flex-col gap-3.5 items-end
        transition-all duration-500
        ${visible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-6 pointer-events-none"}`}
    >
      {sections.map(({ id, label }) => {
        const isActive  = active  === id;
        const isClicked = clicked === id;

        return (
          <button
            key={id}
            onClick={() => scrollTo(id)}
            title={label}
            aria-label={`Scroll to ${label}`}
            className="group relative flex items-center gap-3 focus:outline-none"
          >
            {/* ── Floating label (appears on hover) ─────────── */}
            <span
              className={`
                text-[11px] font-semibold whitespace-nowrap
                px-2.5 py-1 rounded-full
                pointer-events-none select-none
                transition-all duration-200
                ${isActive
                  ? "bg-white text-slate-800 shadow-md opacity-100 translate-x-0"
                  : "bg-white/90 text-slate-600 shadow opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0"}
              `}
            >
              {label}
            </span>

            {/* ── Dot ──────────────────────────────────────── */}
            <span className="relative flex items-center justify-center">

              {/* Ping ring — only on active dot */}
              {isActive && (
                <span
                  className={`
                    absolute inline-flex rounded-full opacity-50 animate-ping
                    ${isActive ? DOT_COLOURS[id] : ""}
                    w-3 h-3
                  `}
                />
              )}

              {/* Click ripple */}
              {isClicked && (
                <span
                  className="absolute rounded-full bg-white/40 animate-ping w-5 h-5"
                />
              )}

              {/* Core dot */}
              <span
                className={`
                  relative inline-flex rounded-full
                  transition-all duration-300 ease-out
                  ${isActive
                    ? `w-3.5 h-3.5 ${DOT_COLOURS[id]}`
                    : "w-2 h-2 bg-slate-300/70 group-hover:bg-slate-400 group-hover:scale-125"}
                `}
              />
            </span>
          </button>
        );
      })}
    </nav>
  );
}

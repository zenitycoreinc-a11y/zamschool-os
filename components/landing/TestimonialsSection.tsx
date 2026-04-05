"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Star, ChevronLeft, ChevronRight, Quote } from "lucide-react";
import { useReveal } from "@/hooks/useReveal";

const testimonials = [
  {
    id: 1,
    name: "Mr. Bwalya Mwila",
    title: "Headteacher",
    school: "Hillcrest Primary School",
    location: "Lusaka, Zambia",
    avatar: "BM",
    avatarBg: "bg-gradient-to-br from-sky-400 to-blue-600",
    rating: 5,
    quote:
      "ZamSchool OS has completely transformed how we run our school. What used to take my admin team a full day — generating reports, tracking attendance, communicating with parents — now takes less than an hour. I wish we had this years ago.",
    highlight: "Saves us hours every single week.",
    tag: "Primary School",
    tagColor: "bg-lamaSkyLight text-sky-700",
    accentBorder: "border-lamaSky/40",
  },
  {
    id: 2,
    name: "Mrs. Grace Tembo",
    title: "Deputy Principal",
    school: "St. Mary's Secondary School",
    location: "Ndola, Copperbelt",
    avatar: "GT",
    avatarBg: "bg-gradient-to-br from-violet-400 to-purple-600",
    rating: 5,
    quote:
      "The parent communication portal alone is worth everything. Parents used to complain they never knew what was happening at school. Now they get instant notifications, can view their child's results, and message teachers directly. Parent engagement has gone up by 60%.",
    highlight: "Parent engagement up by 60%.",
    tag: "Secondary School",
    tagColor: "bg-lamaPurpleLight text-violet-700",
    accentBorder: "border-lamaPurple/40",
  },
  {
    id: 3,
    name: "Mr. Chanda Mutale",
    title: "School Administrator",
    school: "Copperbelt Academy",
    location: "Kitwe, Copperbelt",
    avatar: "CM",
    avatarBg: "bg-gradient-to-br from-amber-400 to-orange-500",
    rating: 5,
    quote:
      "We manage over 900 students across multiple streams. Before ZamSchool OS, tracking fees alone was a nightmare of spreadsheets. Now I can see exactly who has paid, who hasn't, and generate a full financial report in seconds. It's a game changer.",
    highlight: "Financial tracking finally makes sense.",
    tag: "Large Academy",
    tagColor: "bg-lamaYellowLight text-amber-700",
    accentBorder: "border-lamaYellow/40",
  },
  {
    id: 4,
    name: "Ms. Natasha Phiri",
    title: "Class Teacher – Grade 6",
    school: "Woodlands Primary School",
    location: "Lusaka, Zambia",
    avatar: "NP",
    avatarBg: "bg-gradient-to-br from-emerald-400 to-teal-600",
    rating: 5,
    quote:
      "As a teacher I was sceptical at first, but the attendance marking feature is genuinely faster than our old paper register. I mark 35 students in under a minute, the system notifies absent pupils' parents automatically, and I can see trends over the whole term.",
    highlight: "Attendance marking in under a minute.",
    tag: "Teacher",
    tagColor: "bg-emerald-50 text-emerald-700",
    accentBorder: "border-emerald-300/50",
  },
  {
    id: 5,
    name: "Mr. Joseph Lungu",
    title: "Parent & PTA Chairman",
    school: "Riverside Community School",
    location: "Livingstone, Southern Province",
    avatar: "JL",
    avatarBg: "bg-gradient-to-br from-rose-400 to-pink-600",
    rating: 5,
    quote:
      "As a parent, being able to check my child's attendance and results from my phone means I'm always in the loop. The fee reminders are helpful and I love that I can message the teacher without having to physically go to the school during working hours.",
    highlight: "Always in the loop as a parent.",
    tag: "Parent",
    tagColor: "bg-rose-50 text-rose-700",
    accentBorder: "border-rose-200/50",
  },
];

function StarRating({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`w-4 h-4 ${
            i < count ? "fill-amber-400 text-amber-400" : "text-gray-600"
          }`}
        />
      ))}
    </div>
  );
}

export default function TestimonialsSection() {
  const [active, setActive] = useState(0);
  const [visible, setVisible] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { ref: headerRevealRef, visible: headerRevealVisible } = useReveal({ margin: "0px 0px 24% 0px" });
  const { ref: ratingRevealRef, visible: ratingRevealVisible } = useReveal({ margin: "0px 0px 20% 0px" });
  const { ref: thumbsRevealRef, visible: thumbsRevealVisible } = useReveal({ margin: "0px 0px 16% 0px" });

  const transitionTo = useCallback((index: number) => {
    setVisible(false);
    setTimeout(() => {
      setActive(index);
      setVisible(true);
    }, 220);
  }, []);

  const startTimer = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setActive((prev) => {
        const next = (prev + 1) % testimonials.length;
        setVisible(false);
        setTimeout(() => {
          setActive(next);
          setVisible(true);
        }, 220);
        return prev; // keep prev during fade-out; setTimeout updates it
      });
    }, 6000);
  }, []);

  useEffect(() => {
    startTimer();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [startTimer]);

  const go = (dir: 1 | -1) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    const next = (active + dir + testimonials.length) % testimonials.length;
    transitionTo(next);
    startTimer();
  };

  const goTo = (index: number) => {
    if (index === active) return;
    if (intervalRef.current) clearInterval(intervalRef.current);
    transitionTo(index);
    startTimer();
  };

  const current = testimonials[active];

  return (
    <section
      id="testimonials"
      className="py-28 bg-slate-900 overflow-hidden relative"
    >
      {/* Dot-grid background */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "radial-gradient(circle, #ffffff 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      {/* Ambient orbs */}
      <div className="absolute top-0 left-1/3 w-96 h-96 bg-sky-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/3 w-96 h-96 bg-violet-500/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-6">
        {/* ── Section header ──────────────────────────────────── */}
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
          <span className="inline-block bg-white/10 text-slate-300 text-xs font-bold tracking-wider uppercase px-4 py-2 rounded-full mb-5 border border-white/10">
            Trusted by Schools
          </span>
          <h2 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-[1.1]">
            Schools across Zambia{" "}
            <span className="bg-gradient-to-r from-sky-300 to-violet-300 bg-clip-text text-transparent">
              love ZamSchool OS
            </span>
          </h2>
          <p className="mt-5 text-slate-400 text-lg leading-relaxed">
            From headteachers to parents — here&apos;s what the people who use
            it every day have to say.
          </p>
        </div>

        {/* ── Aggregate star rating ───────────────────────────── */}
        <div
          ref={ratingRevealRef}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 mb-14"
          style={{
            opacity: ratingRevealVisible ? 1 : 0,
            transform: ratingRevealVisible
              ? "translateY(0)"
              : "translateY(8px)",
            transition:
              "opacity 0.28s ease-out 0.15s, transform 0.28s ease-out 0.15s",
          }}
        >
          <div className="flex items-center gap-2">
            <StarRating count={5} />
            <span className="text-white font-extrabold text-lg leading-none">
              5.0
            </span>
          </div>
          <div className="hidden sm:block w-px h-6 bg-white/10" />
          <p className="text-slate-400 text-sm text-center sm:text-left">
            Rated <span className="text-white font-bold">5 stars</span> by
            school administrators, teachers &amp; parents
          </p>
          <div className="hidden sm:block w-px h-6 bg-white/10" />
          {/* Stacked avatars */}
          <div className="flex -space-x-3">
            {testimonials.map((t) => (
              <div
                key={t.id}
                className={`w-8 h-8 rounded-full ${t.avatarBg} flex items-center justify-center text-white text-[9px] font-extrabold border-2 border-slate-900 shadow`}
              >
                {t.avatar}
              </div>
            ))}
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-slate-400 text-[9px] font-bold border-2 border-slate-900">
              +12
            </div>
          </div>
        </div>

        {/* ── Main testimonial card ───────────────────────────── */}
        <div className="relative max-w-4xl mx-auto">
          {/* Card — CSS opacity + translate transition */}
          <div
            className={`border-2 ${current.accentBorder} rounded-3xl p-8 md:p-12 relative overflow-hidden`}
            style={{
              background: "rgba(255,255,255,0.06)",
              backdropFilter: "blur(8px)",
              opacity: visible ? 1 : 0,
              transform: visible ? "translateY(0)" : "translateY(6px)",
              transition: "opacity 0.28s ease-out, transform 0.28s ease-out",
            }}
          >
            {/* Large quote mark */}
            <Quote className="absolute top-6 right-8 w-20 h-20 text-white/[0.04] rotate-180 pointer-events-none" />

            {/* Tag */}
            <span
              className={`inline-block text-[11px] font-bold px-3 py-1 rounded-full mb-6 ${current.tagColor}`}
            >
              {current.tag}
            </span>

            {/* Stars */}
            <div className="mb-5">
              <StarRating count={current.rating} />
            </div>

            {/* Quote text */}
            <blockquote className="text-white/90 text-lg md:text-xl leading-relaxed font-medium mb-6 relative z-10">
              &ldquo;{current.quote}&rdquo;
            </blockquote>

            {/* Highlight callout */}
            <div
              className={`inline-flex items-center gap-2 bg-white/10 border ${current.accentBorder} rounded-full px-4 py-2 mb-8`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="text-sm font-bold text-white/90">
                {current.highlight}
              </span>
            </div>

            {/* Attribution */}
            <div className="flex items-center gap-4 pt-6 border-t border-white/10">
              <div
                className={`w-12 h-12 rounded-2xl ${current.avatarBg} flex items-center justify-center text-white font-extrabold text-sm shadow-lg flex-shrink-0`}
              >
                {current.avatar}
              </div>
              <div>
                <p className="font-bold text-white text-[15px] leading-snug">
                  {current.name}
                </p>
                <p className="text-slate-400 text-sm leading-snug mt-0.5">
                  {current.title}
                </p>
                <p className="text-slate-500 text-xs mt-0.5">
                  {current.school} · {current.location}
                </p>
              </div>
            </div>
          </div>

          {/* ── Navigation row ──────────────────────────────────── */}
          <div className="flex items-center justify-between mt-8">
            {/* Progress dots */}
            <div className="flex gap-2">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  aria-label={`Go to testimonial ${i + 1}`}
                  className={`rounded-full transition-all duration-300 ${
                    i === active
                      ? "w-6 h-2 bg-sky-400"
                      : "w-2 h-2 bg-white/20 hover:bg-white/40"
                  }`}
                />
              ))}
            </div>

            {/* Arrow buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => go(-1)}
                aria-label="Previous testimonial"
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 flex items-center justify-center text-white transition-all duration-200 hover:-translate-x-0.5 active:scale-95"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => go(1)}
                aria-label="Next testimonial"
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 flex items-center justify-center text-white transition-all duration-200 hover:translate-x-0.5 active:scale-95"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ── Reviewer thumbnail pills ────────────────────────── */}
        <div
          ref={thumbsRevealRef}
          className="flex flex-wrap justify-center gap-3 mt-14"
          style={{
            opacity: thumbsRevealVisible ? 1 : 0,
            transform: thumbsRevealVisible
              ? "translateY(0)"
              : "translateY(10px)",
            transition:
              "opacity 0.28s ease-out 0.3s, transform 0.28s ease-out 0.3s",
          }}
        >
          {testimonials.map((t, i) => (
            <button
              key={t.id}
              onClick={() => goTo(i)}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-full border transition-all duration-200 ${
                i === active
                  ? "bg-white/10 border-white/20 shadow-md"
                  : "bg-transparent border-white/[0.07] hover:bg-white/[0.06] hover:border-white/15"
              }`}
            >
              <div
                className={`w-7 h-7 rounded-full ${t.avatarBg} flex items-center justify-center text-white text-[9px] font-extrabold flex-shrink-0 shadow`}
              >
                {t.avatar}
              </div>
              <div className="text-left hidden sm:block">
                <p
                  className={`text-[11px] font-bold leading-none transition-colors duration-200 ${
                    i === active ? "text-white" : "text-slate-400"
                  }`}
                >
                  {t.name.split(" ")[1]}
                </p>
                <p className="text-[9px] text-slate-500 leading-none mt-0.5">
                  {t.school.split(" ")[0]}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}


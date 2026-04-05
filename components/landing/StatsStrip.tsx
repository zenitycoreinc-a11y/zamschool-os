"use client";

import { useEffect, useRef, useState } from "react";
import { School, GraduationCap, Wifi, Globe } from "lucide-react";
import { useReveal } from "@/hooks/useReveal";

const stats = [
  {
    icon: School,
    value: 50,
    decimals: 0,
    suffix: "+",
    label: "Schools Onboarded",
    color: "text-sky-400",
    bg: "bg-sky-400/10",
    delay: "0ms",
  },
  {
    icon: GraduationCap,
    value: 15000,
    decimals: 0,
    suffix: "+",
    label: "Students Managed",
    color: "text-violet-400",
    bg: "bg-violet-400/10",
    delay: "60ms",
  },
  {
    icon: Wifi,
    value: 99.9,
    decimals: 1,
    suffix: "%",
    label: "Platform Uptime",
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
    delay: "120ms",
  },
  {
    icon: Globe,
    value: 4,
    decimals: 0,
    suffix: "",
    label: "Countries Across Africa",
    color: "text-amber-400",
    bg: "bg-amber-400/10",
    delay: "180ms",
  },
];

function AnimatedCounter({
  value,
  decimals,
  suffix,
  run,
}: {
  value: number;
  decimals: number;
  suffix: string;
  run: boolean;
}) {
  const [display, setDisplay] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    if (!run || started.current) return;
    started.current = true;

    const duration = 2000;
    const steps = 60;
    const intervalMs = Math.round(duration / steps);
    let step = 0;

    const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

    const id = setInterval(() => {
      step++;
      const progress = easeOut(Math.min(step / steps, 1));
      setDisplay(progress * value);
      if (step >= steps) {
        setDisplay(value);
        clearInterval(id);
      }
    }, intervalMs);

    return () => clearInterval(id);
  }, [run, value]);

  const formatted =
    decimals > 0
      ? display.toFixed(decimals)
      : Math.floor(display).toLocaleString();

  return (
    <span className="tabular-nums">
      {formatted}
      {suffix}
    </span>
  );
}

export default function StatsStrip() {
  const { ref, visible } = useReveal({ margin: "0px 0px 16% 0px" });

  return (
    <section ref={ref} className="bg-slate-900 border-y border-white/5">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="flex flex-col items-center text-center gap-3 group"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? "translateY(0)" : "translateY(10px)",
                transition: `opacity 0.34s ease-out ${stat.delay}, transform 0.34s ease-out ${stat.delay}`,
              }}
            >
              {/* Icon bubble */}
              <div
                className={`w-12 h-12 rounded-2xl ${stat.bg} flex items-center justify-center mb-1 group-hover:scale-110 transition-transform duration-300`}
              >
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>

              {/* Animated number */}
              <div
                className={`text-4xl xl:text-5xl font-extrabold ${stat.color} leading-none`}
              >
                <AnimatedCounter
                  value={stat.value}
                  decimals={stat.decimals}
                  suffix={stat.suffix}
                  run={visible}
                />
              </div>

              {/* Label */}
              <p className="text-slate-400 text-sm font-medium leading-snug max-w-[140px]">
                {stat.label}
              </p>

              {/* Accent underline */}
              <div
                className={`h-0.5 w-8 rounded-full ${stat.bg} mt-1 group-hover:w-12 transition-all duration-300`}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

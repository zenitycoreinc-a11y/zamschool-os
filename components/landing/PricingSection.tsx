"use client";

import { useState } from "react";
import {
  CheckCircle2,
  Zap,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useReveal } from "@/hooks/useReveal";

const tiers = [
  {
    key: "starter",
    icon: Zap,
    name: "Starter",
    badge: "2 weeks free trial",
    monthlyPrice: 0,
    yearlyPrice: 0,
    priceNote: "Try all features for 14 days",
    description:
      "Perfect for schools getting started. No credit card, no commitment. Experience the full power of ZamSchool OS.",
    cta: "Start Your Free Trial",
    ctaHref: "/register",
    ctaStyle:
      "bg-sky-500 hover:bg-sky-400 text-white shadow-xl shadow-sky-500/30 hover:shadow-sky-400/40",
    cardStyle: "bg-gradient-to-b from-sky-50 to-white border-sky-200 shadow-2xl shadow-sky-100",
    iconBg: "bg-sky-100",
    iconColor: "text-sky-600",
    accentBar: "bg-sky-500",
    checkColor: "text-sky-500",
    highlight: true,
    delay: "0ms",
    features: [
      { text: "Unlimited students (Trial)", included: true },
      { text: "Unlimited teachers (Trial)", included: true },
      { text: "Student & teacher profiles", included: true },
      { text: "Real-time attendance tracking", included: true },
      { text: "Full announcements system", included: true },
      { text: "Two-way parent messaging", included: true },
      { text: "Exam & results management", included: true },
      { text: "Finance & fee tracking", included: true },
      { text: "Automated parent notifications", included: true },
      { text: "Bulk CSV import", included: true },
      { text: "Advanced analytics dashboard", included: true },
      { text: "Priority support", included: true },
    ],
  },
] as const;

export default function PricingSection() {
  const { ref: headerRevealRef, visible: headerRevealVisible } = useReveal({ margin: "0px 0px 24% 0px" });
  const { ref: cardsRevealRef, visible: cardsRevealVisible } = useReveal({ margin: "0px 0px 20% 0px" });
  const { ref: footerRevealRef, visible: footerRevealVisible } = useReveal({ margin: "0px 0px 16% 0px" });

  return (
    <section id="pricing" className="py-28 bg-slate-50 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        {/* ── Section header ─────────────────────────────────── */}
        <div
          ref={headerRevealRef}
          className="text-center max-w-2xl mx-auto mb-12"
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
            Simple Pricing
          </span>
          <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight leading-[1.1]">
            Start your journey with{" "}
            <span className="bg-gradient-to-r from-sky-500 to-violet-500 bg-clip-text text-transparent">
              ZamSchool OS
            </span>
          </h2>
          <p className="mt-5 text-slate-500 text-lg leading-relaxed">
            Get full access to all features for 14 days. No credit card required, no commitment.
          </p>
        </div>

        {/* ── Pricing cards ──────────────────────────────────── */}
        <div
          ref={cardsRevealRef}
          className="flex justify-center items-start"
        >
          {tiers.map((tier) => (
            <div
              key={tier.key}
              className={`relative rounded-3xl border-2 p-8 flex flex-col transition-shadow duration-300 hover:shadow-xl max-w-md w-full ${tier.cardStyle} ${
                tier.highlight ? "scale-[1.05] origin-top" : ""
              }`}
              style={{
                opacity: cardsRevealVisible ? 1 : 0,
                transform: cardsRevealVisible
                  ? "scale(1.05) translateY(0)"
                  : "translateY(14px)",
                transition: `opacity 0.34s cubic-bezier(0.22,1,0.36,1) ${tier.delay}, transform 0.34s cubic-bezier(0.22,1,0.36,1) ${tier.delay}`,
              }}
            >
              {/* Popular badge */}
              {tier.badge && (
                <div
                  className={`absolute -top-3.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[11px] font-extrabold text-white shadow-lg whitespace-nowrap ${tier.accentBar}`}
                >
                  <Sparkles className="w-3 h-3" />
                  {tier.badge}
                </div>
              )}

              {/* Accent top bar */}
              <div
                className={`absolute top-0 left-8 right-8 h-0.5 rounded-full ${tier.accentBar} opacity-60`}
              />

              {/* Icon + name */}
              <div className="flex items-center gap-3 mb-5">
                <div
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center ${tier.iconBg} shadow-sm flex-shrink-0`}
                >
                  <tier.icon className={`w-5 h-5 ${tier.iconColor}`} />
                </div>
                <h3 className="text-xl font-extrabold text-slate-900">
                  {tier.name}
                </h3>
              </div>

              {/* Price */}
              <div className="mb-2">
                <div className="flex items-end gap-2">
                  <span className="text-5xl font-extrabold text-slate-900 leading-none">
                    Free
                  </span>
                </div>
              </div>
              <p className="text-sm font-medium text-slate-500 mb-6">
                {tier.priceNote}
              </p>

              {/* Description */}
              <p className="text-slate-600 text-sm leading-relaxed mb-8">
                {tier.description}
              </p>

              {/* Features */}
              <div className="space-y-4 mb-10 flex-grow">
                {tier.features.map((feature, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <CheckCircle2
                      className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                        feature.included ? tier.checkColor : "text-slate-200"
                      }`}
                    />
                    <span
                      className={`text-sm ${
                        feature.included
                          ? "text-slate-700 font-medium"
                          : "text-slate-400"
                      }`}
                    >
                      {feature.text}
                    </span>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <Link
                href={tier.ctaHref}
                className={`flex items-center justify-center gap-2 w-full py-4 px-6 rounded-2xl font-bold transition-all duration-300 group ${tier.ctaStyle}`}
              >
                {tier.cta}
                <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </div>
          ))}
        </div>

        {/* ── Pricing footer ─────────────────────────────────── */}
        <div
          ref={footerRevealRef}
          className="mt-16 text-center"
          style={{
            opacity: footerRevealVisible ? 1 : 0,
            transform: footerRevealVisible
              ? "translateY(0)"
              : "translateY(6px)",
            transition: "opacity 0.4s ease-out 0.2s, transform 0.4s ease-out 0.2s",
          }}
        >
          <p className="text-slate-500 text-sm font-medium flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              No credit card required
            </span>
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Cancel anytime
            </span>
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Data hosted securely in Africa
            </span>
          </p>
        </div>
      </div>
    </section>
  );
}

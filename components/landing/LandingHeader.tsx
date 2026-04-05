"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X } from "lucide-react";

const navLinks = ["Features", "Solutions", "Pricing", "About"];

export default function LandingHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        "animate-slide-down"
      } ${
        scrolled
          ? "bg-white/90 backdrop-blur-md shadow-sm border-b border-gray-100"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl overflow-hidden shadow-md group-hover:scale-105 transition-transform duration-200">
            <Image
              src="/icon.png"
              alt="ZamSchool OS"
              width={36}
              height={36}
              className="w-full h-full object-cover"
              priority
            />
          </div>
          <span
            className={`font-bold text-xl transition-colors duration-300 ${
              scrolled ? "text-gray-900" : "text-white"
            }`}
          >
            ZamSchool OS
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((item) => (
            <Link
              key={item}
              href={`#${item.toLowerCase()}`}
              className={`font-medium text-sm transition-colors duration-200 hover:text-sky-400 ${
                scrolled ? "text-gray-600" : "text-white/80"
              }`}
            >
              {item}
            </Link>
          ))}
        </nav>

        {/* Desktop CTAs */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/login"
            className={`font-medium text-sm transition-colors duration-200 ${
              scrolled
                ? "text-gray-600 hover:text-gray-900"
                : "text-white/80 hover:text-white"
            }`}
          >
            Login
          </Link>
          <Link
            href="/register"
            className="bg-sky-500 hover:bg-sky-400 text-white px-5 py-2.5 rounded-full font-semibold text-sm transition-all duration-200 shadow-md shadow-sky-500/25 hover:shadow-sky-400/30 hover:-translate-y-px active:translate-y-0"
          >
            Register School
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="Toggle menu"
          className={`md:hidden p-2 rounded-lg transition-colors duration-200 ${
            scrolled
              ? "text-gray-700 hover:bg-gray-100"
              : "text-white hover:bg-white/10"
          }`}
        >
          {mobileOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <Menu className="w-6 h-6" />
          )}
        </button>
      </div>

      {/* Mobile menu — CSS height transition */}
      <div
        className={`md:hidden overflow-hidden bg-white border-b border-gray-100 transition-all duration-300 ease-in-out ${
          mobileOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <nav className="flex flex-col gap-1 px-6 pt-4 pb-6">
          {navLinks.map((item) => (
            <Link
              key={item}
              href={`#${item.toLowerCase()}`}
              onClick={() => setMobileOpen(false)}
              className="font-medium text-gray-700 hover:text-sky-500 py-2.5 text-sm border-b border-gray-50 last:border-0 transition-colors duration-150"
            >
              {item}
            </Link>
          ))}
          <div className="flex flex-col gap-3 pt-4">
            <Link
              href="/login"
              onClick={() => setMobileOpen(false)}
              className="font-semibold text-gray-700 text-center py-3 border-2 border-gray-200 rounded-full text-sm hover:border-sky-300 hover:text-sky-600 transition-colors duration-200"
            >
              Login
            </Link>
            <Link
              href="/register"
              onClick={() => setMobileOpen(false)}
              className="bg-sky-500 hover:bg-sky-400 text-white text-center py-3 rounded-full font-semibold text-sm transition-colors duration-200 shadow-md"
            >
              Register School
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}

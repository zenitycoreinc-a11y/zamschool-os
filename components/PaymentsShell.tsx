"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  Bell,
  CreditCard,
  FileBarChart2,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Menu,
  Search,
  Settings,
  Users,
  X,
  DollarSign,
  TrendingUp,
  AlertCircle,
  FileText,
} from "lucide-react";

const paymentsItems = [
  { href: "/app/payments", label: "Dashboard", icon: LayoutDashboard },
  { href: "/app/payments/students", label: "Student Payments", icon: Users },
  { href: "/app/payments/fees", label: "Fee Management", icon: FileText },
  { href: "/app/messages", label: "Messages", icon: MessageSquare },
  { href: "/app/announcements", label: "Announcements", icon: Bell },
  { href: "/app/settings", label: "Settings", icon: Settings },
  { href: "/app/profile", label: "Profile", icon: Users },
];

const paymentsDock = [
  { href: "/app/payments", label: "Home", icon: LayoutDashboard },
  { href: "/app/payments/students", label: "Students", icon: Users },
  { href: "/app/payments/fees", label: "Fees", icon: FileText },
  { href: "/app/profile", label: "Profile", icon: Settings },
];

function NavItem({
  href,
  label,
  icon: Icon,
  active,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: any;
  active: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all ${
        active
          ? "bg-white text-slate-800 shadow-sm ring-1 ring-slate-200"
          : "text-slate-500 hover:bg-white/70 hover:text-slate-800"
      }`}
    >
      <Icon className={`h-4.5 w-4.5 ${active ? "text-slate-700" : "text-slate-400"}`} />
      <span className="font-medium">{label}</span>
    </Link>
  );
}

export default function PaymentsShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [schoolName, setSchoolName] = useState("Your School");
  const [yearTerm, setYearTerm] = useState("Academic Context");
  const [displayName, setDisplayName] = useState("Your Account");
  const [ready, setReady] = useState(false);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    pendingPayments: 0,
    overduePayments: 0,
    totalStudents: 0,
  });

  useEffect(() => {
    const loadProfile = async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        router.replace("/login?redirectTo=/app/payments");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, school_id, first_name, last_name, email")
        .eq("id", auth.user.id)
        .maybeSingle();

      const role = String(profile?.role || "").toLowerCase();
      if (role !== "payments") {
        router.replace("/login?error=payments_access_required");
        return;
      }

      const resolvedName = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ").trim() || profile?.email || auth.user.email || "Your Account";
      setDisplayName(resolvedName);

      if (!auth.user.email_confirmed_at) {
        router.replace("/verify-email");
        return;
      }

      if (!profile?.school_id) {
        setReady(true);
        return;
      }

      // Load school information
      const { data: school } = await supabase
        .from("schools")
        .select("name")
        .eq("id", profile.school_id)
        .maybeSingle();

      if (school?.name) setSchoolName(school.name);

      // Load academic context
      const { data: year } = await supabase
        .from("academic_years")
        .select("name")
        .eq("school_id", profile.school_id)
        .eq("is_active", true)
        .maybeSingle();

      const { data: term } = await supabase
        .from("terms")
        .select("name")
        .eq("school_id", profile.school_id)
        .eq("is_active", true)
        .maybeSingle();

      const parts = [year?.name, term?.name].filter(Boolean);
      if (parts.length) setYearTerm(parts.join(" • "));

      // Load payments statistics
      try {
        // Get payment statistics
        const { data: payments } = await supabase
          .from("payments")
          .select("amount, status")
          .eq("school_id", profile.school_id);

        const totalRevenue = payments?.filter(p => p.status === 'PAID').reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
        const pendingPayments = payments?.filter(p => p.status === 'PENDING').reduce((sum, p) => sum + (p.amount || 0), 0) || 0;

        // Get student count
        const { count: studentCount } = await supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("school_id", profile.school_id)
          .eq("role", "student");

        setStats({
          totalRevenue,
          pendingPayments,
          overduePayments: 0, // TODO: Calculate based on due dates
          totalStudents: studentCount || 0,
        });
      } catch (error) {
        console.error("Error loading payments stats:", error);
      }

      setReady(true);
    };

    loadProfile();
  }, [pathname, router]);

  const activeSet = useMemo(() => new Set([pathname]), [pathname]);

  const logout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (!ready) {
    return (
      <div className="h-screen w-full grid place-items-center bg-[#f5f6fa]">
        <div className="text-sm text-slate-500">Preparing payments workspace...</div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#f5f6fa] flex overflow-hidden">
      {open && <button className="fixed inset-0 bg-black/25 z-30 lg:hidden" onClick={() => setOpen(false)} aria-label="Close sidebar" />}

      <aside
        className={`fixed lg:relative z-40 inset-y-0 left-0 w-64 bg-[#f7f7f8] border-r border-slate-200/80 transition-transform duration-250 ${
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="h-full flex flex-col">
          <div className="px-4 py-5 border-b border-slate-200/80 flex items-center justify-between">
            <Link href="/app/payments" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden shadow-sm bg-white">
                <Image src="/icon.png" alt="ZamSchool OS" width={40} height={40} className="w-full h-full object-cover" priority />
              </div>
              <div>
                <p className="font-semibold text-slate-900 leading-tight">ZamSchool OS</p>
                <p className="text-xs text-slate-500 leading-tight">Payments Office</p>
              </div>
            </Link>
            <button className="lg:hidden p-2 text-slate-500" onClick={() => setOpen(false)}>
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Payments Stats */}
          <div className="px-3 py-4 border-b border-slate-200/80">
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white rounded-lg p-3 text-center">
                <p className="text-lg font-semibold text-green-600">ZMW {stats.totalRevenue.toLocaleString()}</p>
                <p className="text-xs text-slate-500">Revenue</p>
              </div>
              <div className="bg-white rounded-lg p-3 text-center">
                <p className="text-lg font-semibold text-orange-600">ZMW {stats.pendingPayments.toLocaleString()}</p>
                <p className="text-xs text-slate-500">Pending</p>
              </div>
              <div className="bg-white rounded-lg p-3 text-center">
                <p className="text-lg font-semibold text-slate-800">{stats.totalStudents}</p>
                <p className="text-xs text-slate-500">Students</p>
              </div>
              <div className="bg-white rounded-lg p-3 text-center">
                <p className="text-lg font-semibold text-red-600">{stats.overduePayments}</p>
                <p className="text-xs text-slate-500">Overdue</p>
              </div>
            </div>
          </div>

          <div className="px-3 py-5 overflow-y-auto flex-1">
            <p className="px-3 pb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Menu</p>
            <div className="space-y-1">
              {paymentsItems.map((item) => (
                <NavItem key={item.href} {...item} active={activeSet.has(item.href)} onNavigate={() => setOpen(false)} />
              ))}
            </div>
          </div>

          <div className="p-3 border-t border-slate-200/80">
            <button
              onClick={logout}
              className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-500 hover:bg-white hover:text-red-600 transition-colors"
            >
              <LogOut className="h-4.5 w-4.5" />
              <span className="font-medium">Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="bg-[#f5f6fa] px-4 md:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button className="lg:hidden p-2 -ml-2 text-slate-600" onClick={() => setOpen(true)}>
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden lg:block min-w-0">
              <p className="font-semibold text-slate-900 truncate">{schoolName}</p>
              <p className="text-xs text-slate-500 truncate">{yearTerm}</p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2 rounded-full border border-slate-300/80 bg-transparent px-4 py-2.5 min-w-[340px]">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              readOnly
              value="Search payments..."
              className="bg-transparent text-sm text-slate-400 outline-none w-full"
            />
          </div>

          <div className="flex items-center gap-3">
            <button className="w-9 h-9 rounded-full bg-white/80 border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-white">
              <MessageSquare className="w-4 h-4" />
            </button>
            <button className="w-9 h-9 rounded-full bg-white/80 border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-white">
              <Bell className="w-4 h-4" />
            </button>
            <div className="hidden sm:flex items-center gap-3 pl-2">
              <div className="text-right leading-tight">
                <p className="text-sm font-semibold text-slate-800">{displayName}</p>
                <p className="text-[11px] text-slate-400">Payments Officer</p>
              </div>
              <Link href="/app/profile" className="w-10 h-10 rounded-full overflow-hidden border border-green-200 bg-green-500 text-white grid place-items-center text-sm font-semibold">
                {displayName.slice(0, 1).toUpperCase()}
              </Link>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 pb-24 md:px-6 lg:pb-6">{children}</main>

        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-2 py-2 z-30">
          <div className="grid grid-cols-5 gap-1">
            {paymentsDock.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`flex flex-col items-center justify-center py-2 rounded-lg ${
                    active ? "text-green-600 bg-green-50" : "text-slate-500"
                  }`}
                >
                  <item.icon className="w-4.5 h-4.5" />
                  <span className="text-[10px] mt-1 font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}

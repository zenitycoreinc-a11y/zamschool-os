"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { resolveAppWorkspaceHome } from "@/lib/auth-routing";
import { adminApiJson } from "@/lib/admin-browser-api";
import {
  Bell,
  Building2,
  Calendar,
  CalendarClock,
  ClipboardList,
  CreditCard,
  FileBarChart2,
  FileText,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  MessageSquare,
  MoreHorizontal,
  Search,
  Settings,
  Shield,
  Users,
  X,
} from "lucide-react";

type WorkspaceRole = "admin" | "teacher" | "student" | "parent";
type HeaderPanelKey = "messages" | "notifications" | null;
type SearchItem = {
  href: string;
  label: string;
  hint: string;
};

const adminItems = [
  { href: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/app/admin/school", label: "School", icon: Building2 },
  { href: "/app/admin/users", label: "Users", icon: Users },
  { href: "/app/admin/classes", label: "Classes", icon: GraduationCap },
  { href: "/app/admin/subjects", label: "Subjects", icon: FileText },
  { href: "/app/admin/academic", label: "Academic Years", icon: Calendar },
  { href: "/app/admin/grading-scales", label: "Grades & Scales", icon: ClipboardList },
  { href: "/app/admin/timetable", label: "Timetable", icon: CalendarClock },
  { href: "/app/admin/assignments", label: "Assignments", icon: FileText },
  { href: "/app/announcements", label: "Announcements", icon: Megaphone },
  { href: "/app/notifications", label: "Notifications", icon: Bell },
  { href: "/app/events", label: "Events", icon: Calendar },
  { href: "/app/messages", label: "Messages", icon: MessageSquare },
  { href: "/app/admin/fees", label: "Payments", icon: CreditCard },
  { href: "/app/admin/finance", label: "Finance", icon: FileBarChart2 },
  { href: "/app/admin/audit", label: "Audit", icon: Shield },
  { href: "/app/settings", label: "Settings", icon: Settings },
];

const teacherItems = [
  { href: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/app/teacher", label: "Schedule", icon: CalendarClock },
  { href: "/app/messages", label: "Messages", icon: MessageSquare },
  { href: "/app/announcements", label: "Announcements", icon: Megaphone },
  { href: "/app/events", label: "Events", icon: Calendar },
  { href: "/app/notifications", label: "Notifications", icon: Bell },
  { href: "/app/settings", label: "Settings", icon: Settings },
  { href: "/app/profile", label: "Profile", icon: Users },
];

const studentItems = [
  { href: "/student", label: "Dashboard", icon: LayoutDashboard },
  { href: "/app/announcements", label: "Announcements", icon: Megaphone },
  { href: "/app/events", label: "Events", icon: Calendar },
  { href: "/app/messages", label: "Messages", icon: MessageSquare },
  { href: "/app/settings", label: "Settings", icon: Settings },
  { href: "/app/profile", label: "Profile", icon: Users },
];

const parentItems = [
  { href: "/parent", label: "Dashboard", icon: LayoutDashboard },
  { href: "/app/announcements", label: "Announcements", icon: Megaphone },
  { href: "/app/events", label: "Events", icon: Calendar },
  { href: "/app/messages", label: "Messages", icon: MessageSquare },
  { href: "/app/settings", label: "Settings", icon: Settings },
  { href: "/app/profile", label: "Profile", icon: Users },
];

const adminDock = [
  { href: "/app/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/app/admin/users", label: "Users", icon: Users },
  { href: "/app/admin/finance", label: "Finance", icon: FileBarChart2 },
  { href: "/app/messages", label: "Inbox", icon: MessageSquare },
  { href: "/app/profile", label: "Profile", icon: Settings },
];

const teacherDock = [
  { href: "/app/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/app/teacher", label: "Schedule", icon: CalendarClock },
  { href: "/app/messages", label: "Inbox", icon: MessageSquare },
  { href: "/app/announcements", label: "Updates", icon: Megaphone },
  { href: "/app/profile", label: "Profile", icon: Settings },
];

const studentDock = [
  { href: "/student", label: "Home", icon: LayoutDashboard },
  { href: "/app/announcements", label: "Updates", icon: Megaphone },
  { href: "/app/messages", label: "Inbox", icon: MessageSquare },
  { href: "/app/profile", label: "Profile", icon: Users },
  { href: "/app/settings", label: "Settings", icon: Settings },
];

const parentDock = [
  { href: "/parent", label: "Home", icon: LayoutDashboard },
  { href: "/app/announcements", label: "Updates", icon: Megaphone },
  { href: "/app/messages", label: "Inbox", icon: MessageSquare },
  { href: "/app/profile", label: "Profile", icon: Users },
  { href: "/app/settings", label: "Settings", icon: Settings },
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

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<WorkspaceRole>("admin");
  const [schoolName, setSchoolName] = useState("Your School");
  const [yearTerm, setYearTerm] = useState("Academic Context");
  const [displayName, setDisplayName] = useState("Your Account");
  const [ready, setReady] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [headerPanel, setHeaderPanel] = useState<HeaderPanelKey>(null);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const [unreadSummary, setUnreadSummary] = useState({ messages: 0, notifications: 0 });

  const searchRef = useRef<HTMLDivElement | null>(null);
  const headerActionsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        router.replace("/login?redirectTo=/app/dashboard");
        return;
      }

      const { data: roleRow } = await supabase
        .from("profiles")
        .select("role, school_id, first_name, last_name, email")
        .eq("id", auth.user.id)
        .maybeSingle();

      const nextRole = String(roleRow?.role || "").toLowerCase();
      if (nextRole !== "admin" && nextRole !== "teacher" && nextRole !== "student" && nextRole !== "parent") {
        router.replace("/login?error=web_access_restricted");
        return;
      }
      setRole(nextRole as WorkspaceRole);

      const resolvedName =
        [roleRow?.first_name, roleRow?.last_name].filter(Boolean).join(" ").trim() ||
        roleRow?.email ||
        auth.user.email ||
        "Your Account";
      setDisplayName(resolvedName);

      if (!auth.user.email_confirmed_at) {
        router.replace("/verify-email");
        return;
      }

      if (nextRole === "teacher" && (pathname.startsWith("/app/admin") || pathname === "/app/dashboard")) {
        router.replace(resolveAppWorkspaceHome(nextRole));
        return;
      }
      if (nextRole === "admin" && pathname === "/app/teacher") {
        router.replace(resolveAppWorkspaceHome(nextRole));
        return;
      }
      if (nextRole === "student" && pathname === "/parent") {
        router.replace(resolveAppWorkspaceHome(nextRole));
        return;
      }
      if (nextRole === "parent" && pathname === "/student") {
        router.replace(resolveAppWorkspaceHome(nextRole));
        return;
      }

      if (!roleRow?.school_id) {
        if (nextRole === "admin" && pathname !== "/app/admin/school") {
          router.replace("/app/admin/school");
          return;
        }
        setReady(true);
        return;
      }

      const { data: school } = await supabase
        .from("schools")
        .select("name")
        .eq("id", roleRow.school_id)
        .maybeSingle();

      if (school?.name) setSchoolName(school.name);

      const { data: year } = await supabase
        .from("academic_years")
        .select("name")
        .eq("school_id", roleRow.school_id)
        .eq("is_active", true)
        .maybeSingle();

      const { data: term } = await supabase
        .from("terms")
        .select("name")
        .eq("school_id", roleRow.school_id)
        .eq("is_active", true)
        .maybeSingle();

      const parts = [year?.name, term?.name].filter(Boolean);
      if (parts.length) setYearTerm(parts.join(" • "));

      setReady(true);
    };

    void loadProfile();
  }, [pathname, router]);

  useEffect(() => {
    if (!ready) return;

    let cancelled = false;

    const refreshUnreadSummary = async () => {
      try {
        const payload = await adminApiJson<{ data?: { messages?: number; notifications?: number } }>(
          "/api/account/unread-summary"
        );
        if (cancelled) return;

        setUnreadSummary({
          messages: Number(payload?.data?.messages || 0),
          notifications: Number(payload?.data?.notifications || 0),
        });
      } catch {
        if (!cancelled) {
          setUnreadSummary((current) => current);
        }
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        void refreshUnreadSummary();
      }
    };

    void refreshUnreadSummary();
    window.addEventListener("focus", refreshUnreadSummary);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", refreshUnreadSummary);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [pathname, ready]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (searchRef.current && !searchRef.current.contains(target)) {
        setSearchOpen(false);
      }
      if (headerActionsRef.current && !headerActionsRef.current.contains(target)) {
        setHeaderPanel(null);
        setOverflowOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const activeSet = useMemo(() => new Set([pathname]), [pathname]);
  const navItems =
    role === "admin"
      ? adminItems
      : role === "teacher"
        ? teacherItems
        : role === "student"
          ? studentItems
          : parentItems;
  const mobileDock =
    role === "admin"
      ? adminDock
      : role === "teacher"
        ? teacherDock
        : role === "student"
          ? studentDock
          : parentDock;
  const workspaceLabel =
    role === "admin"
      ? "Admin Workspace"
      : role === "teacher"
        ? "Teacher Workspace"
        : role === "student"
          ? "Student Workspace"
          : "Parent Workspace";

  const searchItems = useMemo<SearchItem[]>(
    () => [
      ...navItems.map((item) => ({
        href: item.href,
        label: item.label,
        hint: item.href.replace("/app/", "").replace("/", " / ") || "Workspace page",
      })),
      { href: "/app/messages", label: "Unread Messages", hint: `${formatUnreadBadgeCount(unreadSummary.messages)} unread` },
      {
        href: "/app/notifications",
        label: "Unread Notifications",
        hint: `${formatUnreadBadgeCount(unreadSummary.notifications)} unread`,
      },
      { href: "/app/profile", label: "Profile", hint: "Your account settings" },
    ],
    [navItems, unreadSummary.messages, unreadSummary.notifications]
  );

  const filteredSearchItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const deduped = Array.from(new Map(searchItems.map((item) => [item.href, item])).values());
    if (!query) {
      return deduped.slice(0, 7);
    }

    return deduped.filter((item) =>
      `${item.label} ${item.hint} ${item.href}`.toLowerCase().includes(query)
    );
  }, [searchItems, searchQuery]);

  const handleSearchSelect = (href: string) => {
    setSearchOpen(false);
    setSearchQuery("");
    router.push(href);
  };

  const handleHeaderNavigate = (href: string) => {
    setHeaderPanel(null);
    setOverflowOpen(false);
    router.push(href);
  };

  const openMessages = () => {
    setHeaderPanel(null);
    setOverflowOpen(false);
    router.push("/app/messages");
  };

  const openNotifications = () => {
    setHeaderPanel(null);
    setOverflowOpen(false);
    router.push("/app/notifications");
  };

  const logout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (!ready) {
    return (
      <div className="h-screen w-full grid place-items-center bg-[#f5f6fa]">
        <div className="text-sm text-slate-500">Preparing workspace...</div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#f5f6fa] flex overflow-hidden">
      {open ? (
        <button className="fixed inset-0 bg-black/25 z-30 lg:hidden" onClick={() => setOpen(false)} aria-label="Close sidebar" />
      ) : null}

      <aside
        className={`fixed lg:relative z-40 inset-y-0 left-0 w-64 bg-[#f7f7f8] border-r border-slate-200/80 transition-transform duration-250 ${
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="h-full flex flex-col">
          <div className="px-4 py-5 border-b border-slate-200/80 flex items-center justify-between">
            <Link href="/app/dashboard" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden shadow-sm bg-white">
                <Image src="/icon.png" alt="ZamSchool OS" width={40} height={40} className="w-full h-full object-cover" priority />
              </div>
              <div>
                <p className="font-semibold text-slate-900 leading-tight">ZamSchool OS</p>
                <p className="text-xs text-slate-500 leading-tight">{workspaceLabel}</p>
              </div>
            </Link>
            <button className="lg:hidden p-2 text-slate-500" onClick={() => setOpen(false)}>
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="px-3 py-5 overflow-y-auto flex-1">
            <p className="px-3 pb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Menu</p>
            <div className="space-y-1">
              {navItems.map((item) => (
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

          <div ref={searchRef} className="hidden md:block relative min-w-[340px]">
            <div className="flex items-center gap-2 rounded-full border border-slate-300/80 bg-white px-4 py-2.5 shadow-sm">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                value={searchQuery}
                placeholder="Search pages, tools, and people"
                onFocus={() => setSearchOpen(true)}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                  setSearchOpen(true);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && filteredSearchItems[0]) {
                    handleSearchSelect(filteredSearchItems[0].href);
                  }
                  if (event.key === "Escape") {
                    setSearchOpen(false);
                  }
                }}
                className="bg-transparent text-sm text-slate-600 outline-none w-full"
              />
            </div>

            {searchOpen ? (
              <div className="absolute inset-x-0 top-full mt-2 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
                <div className="border-b border-slate-100 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Quick Search
                </div>
                <div className="max-h-[320px] overflow-y-auto p-2">
                  {filteredSearchItems.length === 0 ? (
                    <div className="rounded-2xl px-3 py-6 text-center text-sm text-slate-500">
                      No matching pages yet.
                    </div>
                  ) : (
                    filteredSearchItems.map((item) => (
                      <button
                        key={`${item.href}-${item.label}`}
                        type="button"
                        onClick={() => handleSearchSelect(item.href)}
                        className="flex w-full items-start justify-between rounded-2xl px-3 py-3 text-left transition hover:bg-slate-50"
                      >
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{item.label}</p>
                          <p className="mt-1 text-xs text-slate-400">{item.hint}</p>
                        </div>
                        <span className="text-[11px] uppercase tracking-[0.12em] text-slate-300">Open</span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            ) : null}
          </div>

          <div ref={headerActionsRef} className="flex items-center gap-3 relative">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setOverflowOpen(false);
                  setHeaderPanel((current) => (current === "messages" ? null : "messages"));
                }}
                className="relative w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50"
              >
                <MessageSquare className="w-4 h-4" />
                {unreadSummary.messages > 0 ? (
                  <span className="absolute -right-1 -top-1 inline-flex min-w-[1.4rem] items-center justify-center rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm animate-pulse">
                    {formatUnreadBadgeCount(unreadSummary.messages)}
                  </span>
                ) : null}
              </button>
              <button
                type="button"
                onClick={() => {
                  setOverflowOpen(false);
                  setHeaderPanel((current) => (current === "notifications" ? null : "notifications"));
                }}
                className="relative w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50"
              >
                <Bell className="w-4 h-4" />
                {unreadSummary.notifications > 0 ? (
                  <span className="absolute -right-1 -top-1 inline-flex min-w-[1.4rem] items-center justify-center rounded-full bg-sky-500 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm animate-pulse">
                    {formatUnreadBadgeCount(unreadSummary.notifications)}
                  </span>
                ) : null}
              </button>
            </div>

            <div className="hidden sm:flex items-center gap-3 pl-2">
              <div className="text-right leading-tight">
                <p className="text-sm font-semibold text-slate-800">{displayName}</p>
                <p className="text-[11px] text-slate-400">{role}</p>
              </div>
              <Link href="/app/profile" className="w-10 h-10 rounded-full overflow-hidden border border-sky-200 bg-sky-500 text-white grid place-items-center text-sm font-semibold">
                {displayName.slice(0, 1).toUpperCase()}
              </Link>
            </div>

            <button
              type="button"
              onClick={() => {
                setHeaderPanel(null);
                setOverflowOpen((current) => !current);
              }}
              className="hidden sm:grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-white text-slate-400 hover:bg-slate-50"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>

            {headerPanel ? (
              <div className="absolute right-12 top-12 z-20 w-72 rounded-3xl border border-slate-200 bg-white p-4 shadow-xl">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  {headerPanel === "messages" ? "Inbox" : "Alerts"}
                </p>
                <h3 className="mt-2 text-base font-semibold text-slate-900">
                  {headerPanel === "messages" ? "Unread Messages" : "Unread Notifications"}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  {headerPanel === "messages"
                    ? `${unreadSummary.messages} unread messages waiting in your inbox.`
                    : `${unreadSummary.notifications} unread notifications waiting for review.`}
                </p>
                <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="text-2xl font-bold text-slate-900">
                    {headerPanel === "messages"
                      ? formatUnreadBadgeCount(unreadSummary.messages)
                      : formatUnreadBadgeCount(unreadSummary.notifications)}
                  </p>
                  <p className="mt-1 text-xs uppercase tracking-[0.14em] text-slate-400">
                    {headerPanel === "messages" ? "Unread messages" : "Unread notifications"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (headerPanel === "messages") {
                      openMessages();
                      return;
                    }

                    openNotifications();
                  }}
                  className="mt-4 inline-flex w-full items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  {headerPanel === "messages" ? "Open messages" : "Open notifications"}
                </button>
              </div>
            ) : null}

            {overflowOpen ? (
              <div className="absolute right-0 top-12 z-20 w-56 rounded-3xl border border-slate-200 bg-white p-2 shadow-xl">
                <button type="button" onClick={() => handleHeaderNavigate("/app/profile")} className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm text-slate-700 hover:bg-slate-50">
                  <Users className="h-4 w-4 text-slate-400" />
                  Profile
                </button>
                <button type="button" onClick={() => handleHeaderNavigate("/app/settings")} className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm text-slate-700 hover:bg-slate-50">
                  <Settings className="h-4 w-4 text-slate-400" />
                  Settings
                </button>
                <button type="button" onClick={logout} className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm text-rose-600 hover:bg-rose-50">
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </div>
            ) : null}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 pb-24 md:px-6 lg:pb-6">{children}</main>

        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-2 py-2 z-30">
          <div className="grid grid-cols-5 gap-1">
            {mobileDock.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`flex flex-col items-center justify-center py-2 rounded-lg ${
                    active ? "text-sky-600 bg-sky-50" : "text-slate-500"
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

function formatUnreadBadgeCount(count: number) {
  if (!count || count < 1) {
    return "0";
  }

  return count > 99 ? "99+" : String(count);
}

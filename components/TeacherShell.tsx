"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Bell,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Search,
  Settings,
  Users,
  X,
} from "lucide-react";

import { TeacherWorkspaceProvider, useTeacherWorkspace } from "@/components/TeacherWorkspaceProvider";
import { preloadTeacherBootstrap } from "@/lib/teacher-bootstrap-client";
import { useTeacherWorkspacePreferences } from "@/lib/teacher-workspace-preferences";
import { supabase } from "@/lib/supabase";

type ShellStatKey = "lessons" | "students" | "completed" | "pending";

const teacherItems = [
  { href: "/teacher", label: "Dashboard", icon: LayoutDashboard },
  { href: "/teacher/teaching", label: "Teaching", icon: GraduationCap },
  { href: "/teacher/students", label: "Students", icon: Users },
  { href: "/teacher/inbox", label: "Inbox", icon: MessageSquare },
  { href: "/teacher/profile", label: "Profile", icon: Users },
  { href: "/teacher/settings", label: "Settings", icon: Settings },
];

const teacherDock = [
  { href: "/teacher", label: "Dashboard", icon: LayoutDashboard },
  { href: "/teacher/teaching", label: "Teaching", icon: GraduationCap },
  { href: "/teacher/students", label: "Students", icon: Users },
  { href: "/teacher/inbox", label: "Inbox", icon: MessageSquare },
  { href: "/teacher/settings", label: "Settings", icon: Settings },
];

const statLabels: Record<ShellStatKey, string> = {
  lessons: "Lessons",
  students: "Students",
  completed: "Complete",
  pending: "Pending",
};

const statLinks: Record<ShellStatKey, string> = {
  lessons: "/teacher/classes?view=queue",
  students: "/teacher/students",
  completed: "/teacher/attendance?filter=completed",
  pending: "/teacher/classes?filter=pending",
};

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

export default function TeacherShell({ children }: { children: React.ReactNode }) {
  return (
    <TeacherWorkspaceProvider>
      <TeacherShellContent>{children}</TeacherShellContent>
    </TeacherWorkspaceProvider>
  );
}

function TeacherShellContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const {
    account,
    stats,
    displayName,
    schoolName,
    yearTerm,
    loading: workspaceLoading,
    error: workspaceError,
  } = useTeacherWorkspace();
  const { preferences } = useTeacherWorkspacePreferences();
  const [open, setOpen] = useState(false);
  const teacher = account?.teacher;
  const compactCards = preferences.compactCards;
  const displayStats = {
    ...stats,
    pending: teacher?.pendingRollCalls ?? stats.pending,
  };

  useEffect(() => {
    preloadTeacherBootstrap();
  }, [workspaceLoading]);

  const logout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#f5f6fa]">
      {open ? (
        <button
          className="fixed inset-0 z-30 bg-black/25 lg:hidden"
          onClick={() => setOpen(false)}
          aria-label="Close sidebar"
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-40 ${compactCards ? "w-60" : "w-64"} border-r border-slate-200/80 bg-[#f7f7f8] transition-transform duration-250 lg:relative ${
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex h-full flex-col">
          <div className={`flex items-center justify-between border-b border-slate-200/80 px-4 ${compactCards ? "py-4" : "py-5"}`}>
            <Link href="/teacher" className="flex items-center gap-3">
              <div className="h-10 w-10 overflow-hidden rounded-full bg-white shadow-sm">
                <Image
                  src="/icon.png"
                  alt="ZamSchool OS"
                  width={40}
                  height={40}
                  className="h-full w-full object-cover"
                  priority
                />
              </div>
              <div>
                <p className="font-semibold text-slate-900 leading-tight">ZamSchool OS</p>
                <p className="text-xs text-slate-500 leading-tight">Teacher Workspace</p>
              </div>
            </Link>
            <button className="p-2 text-slate-500 lg:hidden" onClick={() => setOpen(false)}>
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className={`border-b border-slate-200/80 px-3 ${compactCards ? "py-3" : "py-4"}`}>
              <div className={`grid grid-cols-2 ${compactCards ? "gap-1.5" : "gap-2"}`}>
                {(Object.keys(stats) as ShellStatKey[]).map((key) => (
                  <Link
                    key={key}
                    href={statLinks[key]}
                    className={`rounded-lg bg-white text-center transition hover:-translate-y-0.5 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200 ${
                      compactCards ? "p-2.5" : "p-3"
                    }`}
                  >
                    <p className={`${compactCards ? "text-base" : "text-lg"} font-semibold text-slate-800`}>
                      {workspaceLoading ? "..." : displayStats[key]}
                    </p>
                    <p className={`${compactCards ? "text-[11px]" : "text-xs"} text-slate-500`}>
                      {statLabels[key]}
                    </p>
                  </Link>
                ))}
              </div>
          </div>

          <div className={`flex-1 overflow-y-auto px-3 ${compactCards ? "py-4" : "py-5"}`}>
            <p className="px-3 pb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Menu
            </p>
            <div className="space-y-1">
              {teacherItems.map((item) => (
                <NavItem
                  key={item.href}
                  {...item}
                  active={isActivePath(pathname, item.href)}
                  onNavigate={() => setOpen(false)}
                />
              ))}
            </div>
          </div>

          <div className="border-t border-slate-200/80 p-3">
            <button
              onClick={logout}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-500 transition-colors hover:bg-white hover:text-red-600"
            >
              <LogOut className="h-4.5 w-4.5" />
              <span className="font-medium">Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className={`flex items-center justify-between gap-4 bg-[#f5f6fa] px-4 ${compactCards ? "py-3" : "py-4"} md:px-6`}>
          <div className="flex min-w-0 items-center gap-3">
            <button className="-ml-2 p-2 text-slate-600 lg:hidden" onClick={() => setOpen(true)}>
              <Menu className="h-5 w-5" />
            </button>
            <div className="hidden min-w-0 lg:block">
              <p className="truncate font-semibold text-slate-900">{schoolName}</p>
              <p className="truncate text-xs text-slate-500">{yearTerm}</p>
            </div>
          </div>

          <div className={`hidden items-center gap-2 rounded-full border border-slate-300/80 bg-white/70 text-slate-500 md:flex ${compactCards ? "min-w-[260px] px-3 py-2" : "min-w-[340px] px-4 py-2.5"}`}>
            <Search className="h-4 w-4 text-slate-400" />
            <div className="flex w-full items-center justify-between gap-3 text-sm">
              <span className="truncate text-slate-500">Quick jump</span>
              <div className="flex items-center gap-2 text-xs font-semibold text-sky-700">
                <Link href="/teacher/students">Students</Link>
                <span className="text-slate-300">|</span>
                <Link href="/teacher/classes">Classes</Link>
                <span className="text-slate-300">|</span>
                <Link href="/teacher/messages">Messages</Link>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/teacher/messages"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white/80 text-slate-500 hover:bg-white"
            >
              <MessageSquare className="h-4 w-4" />
            </Link>
            <Link
              href="/teacher/notifications"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white/80 text-slate-500 hover:bg-white"
            >
              <Bell className="h-4 w-4" />
            </Link>
            <div className="hidden items-center gap-3 pl-2 sm:flex">
              <div className="text-right leading-tight">
                <p className="text-sm font-semibold text-slate-800">{displayName}</p>
                <p className="text-[11px] text-slate-400">Teacher</p>
              </div>
              <Link
                href="/teacher/profile"
                className="grid h-10 w-10 place-items-center overflow-hidden rounded-full border border-sky-200 bg-sky-500 text-sm font-semibold text-white"
              >
                {displayName.slice(0, 1).toUpperCase()}
              </Link>
            </div>
          </div>
        </header>

        {workspaceError ? (
          <div className="mx-4 mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 md:mx-6">
            {workspaceError}
          </div>
        ) : null}

        <main className={`flex-1 overflow-y-auto ${compactCards ? "px-3" : "px-4"} pb-24 md:px-6 lg:pb-6`}>
          {children}
        </main>

        <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white px-2 py-2 lg:hidden">
          <div className="grid grid-cols-5 gap-1">
            {teacherDock.map((item) => {
              const active = isActivePath(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`flex flex-col items-center justify-center rounded-lg py-2 ${
                    active ? "bg-sky-50 text-sky-600" : "text-slate-500"
                  }`}
                >
                  <item.icon className="h-4.5 w-4.5" />
                  <span className="mt-1 text-[10px] font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

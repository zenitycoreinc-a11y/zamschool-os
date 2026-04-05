"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { normalizeRole, roleToPath } from "@/lib/profile-utils";
import {
  Home,
  Users,
  GraduationCap,
  UsersRound,
  BookOpen,
  School,
  BookText,
  ClipboardList,
  FileText,
  Award,
  CalendarCheck,
  CalendarDays,
  MessageSquare,
  Megaphone,
  User,
  Settings,
  LogOut,
} from "lucide-react";

const menuItems = [
  {
    title: "MENU",
    items: [
      {
        icon: Home,
        label: "Home",
        href: "/app/dashboard",
        visible: ["admin", "teacher", "student", "parent"],
      },
      {
        icon: Users,
        label: "Teachers",
        href: "/list/teachers",
        visible: ["admin", "teacher"],
      },
      {
        icon: GraduationCap,
        label: "Students",
        href: "/list/students",
        visible: ["admin", "teacher"],
      },
      {
        icon: UsersRound,
        label: "Parents",
        href: "/list/parents",
        visible: ["admin", "teacher"],
      },
      {
        icon: BookOpen,
        label: "Subjects",
        href: "/list/subjects",
        visible: ["admin"],
      },
      {
        icon: School,
        label: "Classes",
        href: "/list/classes",
        visible: ["admin", "teacher"],
      },
      {
        icon: BookText,
        label: "Lessons",
        href: "/list/lessons",
        visible: ["admin", "teacher"],
      },
      {
        icon: ClipboardList,
        label: "Exams",
        href: "/list/exams",
        visible: ["admin", "teacher", "student", "parent"],
      },
      {
        icon: FileText,
        label: "Assignments",
        href: "/list/assignments",
        visible: ["admin", "teacher", "student", "parent"],
      },
      {
        icon: Award,
        label: "Results",
        href: "/list/results",
        visible: ["admin", "teacher", "student", "parent"],
      },
      {
        icon: CalendarCheck,
        label: "Attendance",
        href: "/list/attendance",
        visible: ["admin", "teacher", "student", "parent"],
      },
      {
        icon: CalendarDays,
        label: "Events",
        href: "/list/events",
        visible: ["admin", "teacher", "student", "parent"],
      },
      {
        icon: MessageSquare,
        label: "Messages",
        href: "/list/messages",
        visible: ["admin", "teacher", "student", "parent"],
      },
      {
        icon: Megaphone,
        label: "Announcements",
        href: "/list/announcements",
        visible: ["admin", "teacher", "student", "parent"],
      },
    ],
  },
  {
    title: "OTHER",
    items: [
      {
        icon: User,
        label: "Profile",
        href: "/profile",
        visible: ["admin", "teacher", "student", "parent"],
      },
      {
        icon: Settings,
        label: "Settings",
        href: "/settings",
        visible: ["admin", "teacher", "student", "parent"],
      },
    ],
  },
];

export default function Menu() {
  const [role, setRole] = useState<string | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    const fetchRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();
        setRole(normalizeRole(data?.role));
      }
    };
    fetchRole();
  }, []);

  if (!role) return null;

  const visibleSections = menuItems
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        if (!item.visible.includes(role)) {
          return false;
        }

        if (role !== "teacher") {
          return true;
        }

        return ["Home", "Students", "Classes", "Lessons", "Messages", "Profile", "Settings"].includes(
          item.label
        );
      }),
    }))
    .filter((section) => section.items.length > 0);

  return (
    <div className="mt-4 text-sm">
      {visibleSections.map((i) => (
        <div className="flex flex-col gap-2" key={i.title}>
          <span className="hidden lg:block text-slate-400 font-bold text-[10px] uppercase tracking-widest my-4">
            {i.title}
          </span>
          {i.items.map((item) => {
            if (item.visible.includes(role)) {
              const resolvedHref = item.href === "/app/dashboard" ? roleToPath(role) : item.href;
              const isActive = pathname === resolvedHref;
              return (
                <Link
                  href={resolvedHref}
                  key={item.label}
                  className={`flex items-center justify-center lg:justify-start gap-4 py-2.5 md:px-4 rounded-xl transition-all duration-200 ${
                    isActive
                      ? "bg-lamaSky text-white font-bold shadow-md shadow-lamaSky/20"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <item.icon className={`w-5 h-5 ${isActive ? "text-white" : "text-slate-400"}`} />
                  <span className="hidden lg:block">{item.label}</span>
                </Link>
              );
            }
          })}
        </div>
      ))}
    </div>
  );
}

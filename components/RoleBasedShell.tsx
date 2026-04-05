"use client";

import { useEffect, useState } from "react";

import AdminShell from "@/components/AdminShell";
import PaymentsShell from "@/components/PaymentsShell";
import TeacherShell from "@/components/TeacherShell";
import { supabase } from "@/lib/supabase";

type WorkspaceRole = "admin" | "teacher" | "payments" | "student" | "parent" | null;

export default function RoleBasedShell({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<WorkspaceRole>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUserRole = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setRole(null);
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();

        setRole(normalizeWorkspaceRole(profile?.role));
      } catch (error) {
        console.error("Error loading workspace role:", error);
        setRole(null);
      } finally {
        setLoading(false);
      }
    };

    void loadUserRole();
  }, []);

  if (loading) {
    return (
      <div className="grid h-screen w-full place-items-center bg-[#f5f6fa]">
        <div className="text-sm text-slate-500">Loading workspace...</div>
      </div>
    );
  }

  if (role === "teacher") {
    return <TeacherShell>{children}</TeacherShell>;
  }

  if (role === "payments") {
    return <PaymentsShell>{children}</PaymentsShell>;
  }

  return <AdminShell>{children}</AdminShell>;
}

function normalizeWorkspaceRole(role: unknown): WorkspaceRole {
  const value = String(role || "").trim().toLowerCase();

  if (
    value === "admin" ||
    value === "teacher" ||
    value === "payments" ||
    value === "student" ||
    value === "parent"
  ) {
    return value;
  }

  return null;
}

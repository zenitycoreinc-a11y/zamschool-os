"use client";

export const dynamic = "force-dynamic";

import AuthProvider from "@/components/AuthProvider";
import RoleBasedShell from "@/components/RoleBasedShell";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <RoleBasedShell>{children}</RoleBasedShell>
    </AuthProvider>
  );
}

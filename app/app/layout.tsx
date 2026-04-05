"use client";

import AuthProvider from "@/components/AuthProvider";
import OfflineStatusProvider from "@/components/OfflineStatusProvider";
import RoleBasedShell from "@/components/RoleBasedShell";

export default function AppWorkspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <OfflineStatusProvider>
        <RoleBasedShell>{children}</RoleBasedShell>
      </OfflineStatusProvider>
    </AuthProvider>
  );
}

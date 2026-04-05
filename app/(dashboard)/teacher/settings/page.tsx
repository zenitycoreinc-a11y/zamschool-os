"use client";

import { AccountSettingsPage } from "@/components/account/AccountSettingsPage";

export default function TeacherSettingsPage() {
  return (
    <AccountSettingsPage
      pageTitle="Teacher Settings"
      intro="Security, workspace preferences, and session management."
      preferencesStorageKey="teacher-workspace-settings"
      sessionTitle="Session controls"
      sessionBody="Sign out from this device."
    />
  );
}

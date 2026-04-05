"use client";

import { AccountSettingsPage } from "@/components/account/AccountSettingsPage";

export default function AppSettingsPage() {
  return (
    <AccountSettingsPage
      pageTitle="Settings"
      intro="Security, workspace preferences, and session management."
      preferencesStorageKey="workspace-account-settings"
      sessionTitle="Session"
      sessionBody="Sign out from this device."
    />
  );
}

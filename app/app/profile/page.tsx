"use client";

import { AccountProfilePage } from "@/components/account/AccountProfilePage";

export default function AppProfilePage() {
  return (
    <AccountProfilePage
      pageTitle="Profile"
      intro="Update your personal information, manage your avatar, and review the account details available for this workspace."
      securityTitle="Access guidance"
      securityNote="Profile fields here are editable by you. Role access and any school-managed assignments remain controlled by your school admin."
      settingsCardTitle="Workspace settings"
      settingsCardBody="Use the settings page to review session details, workspace preferences, and password controls."
      settingsHref="/app/settings"
      settingsLinkLabel="Open settings"
    />
  );
}

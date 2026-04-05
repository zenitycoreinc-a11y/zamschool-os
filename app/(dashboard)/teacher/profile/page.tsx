"use client";

import { AccountProfilePage } from "@/components/account/AccountProfilePage";
import { useTeacherWorkspace } from "@/components/TeacherWorkspaceProvider";

export default function TeacherProfilePage() {
  const { account, refresh } = useTeacherWorkspace();

  return (
    <AccountProfilePage
      pageTitle="Teacher Profile"
      intro="Update your personal information, manage your avatar, and review the teacher assignment details set by your admin."
      detailsTitle="School details"
      assignmentTitle="Teaching assignment"
      securityTitle="Admin-managed guidance"
      securityNote="Profile fields here are editable by you. Teaching assignments, employee identity, and role access remain admin-managed."
      settingsCardTitle="Teacher workspace"
      settingsCardBody="Use the settings page to review session details and password controls."
      settingsHref="/teacher/settings"
      settingsLinkLabel="Open settings"
      showTeacherDetails
      initialProfileData={account}
      onProfileRefresh={refresh}
    />
  );
}

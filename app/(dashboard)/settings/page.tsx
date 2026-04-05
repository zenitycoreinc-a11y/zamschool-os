import { redirect } from "next/navigation";

export default function LegacySettingsRedirectPage() {
  redirect("/app/settings");
}

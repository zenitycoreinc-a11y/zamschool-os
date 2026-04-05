import { redirect } from "next/navigation";

export default function LegacyProfileRedirectPage() {
  redirect("/app/profile");
}

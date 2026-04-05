import type { Metadata } from "next";

import LegalPageLayout from "@/components/landing/LegalPageLayout";

export const metadata: Metadata = {
  title: "Cookie Policy | ZamSchool OS",
  description: "How ZamSchool OS uses cookies and similar browser storage.",
};

export default function CookiesPage() {
  return (
    <LegalPageLayout
      title="Cookie Policy"
      summary="This page explains how ZamSchool OS may use cookies and similar browser storage to keep accounts signed in, protect sessions, and improve the reliability of the site."
      lastUpdated="April 3, 2026"
      sections={[
        {
          title: "Essential cookies",
          body: (
            <>
              <p>
                Essential cookies or local storage may be used to maintain secure sessions, remember
                basic preferences, and support core login and navigation behavior.
              </p>
            </>
          ),
        },
        {
          title: "Performance and diagnostics",
          body: (
            <>
              <p>
                We may use limited technical diagnostics to understand uptime, errors, and service
                performance so the platform remains stable for schools and families.
              </p>
            </>
          ),
        },
        {
          title: "Managing cookies",
          body: (
            <>
              <p>
                Most browsers allow users to review, block, or delete cookies through browser
                settings. Disabling essential cookies may affect login and core platform features.
              </p>
            </>
          ),
        },
        {
          title: "Contact",
          body: (
            <>
              <p>
                Questions about cookies or browser storage can be sent to{" "}
                <a className="font-medium text-slate-900 hover:underline" href="mailto:hello@zamschool.zm">
                  hello@zamschool.zm
                </a>
                .
              </p>
            </>
          ),
        },
      ]}
    />
  );
}

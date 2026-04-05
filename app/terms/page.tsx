import type { Metadata } from "next";

import LegalPageLayout from "@/components/landing/LegalPageLayout";

export const metadata: Metadata = {
  title: "Terms of Service | ZamSchool OS",
  description: "Basic terms for using ZamSchool OS.",
};

export default function TermsPage() {
  return (
    <LegalPageLayout
      title="Terms of Service"
      summary="These terms describe the basic rules for accessing and using ZamSchool OS. By using the platform, schools and users agree to use it responsibly and within their authorized roles."
      lastUpdated="April 3, 2026"
      sections={[
        {
          title: "Use of the service",
          body: (
            <>
              <p>
                ZamSchool OS is provided for school operations including administration, teaching,
                communication, attendance, results, and payments where enabled.
              </p>
              <p>
                Users must only access features and records they are authorized to use and must not
                attempt to interfere with the platform or other accounts.
              </p>
            </>
          ),
        },
        {
          title: "Accounts and security",
          body: (
            <>
              <p>
                Schools and end users are responsible for keeping login credentials secure and for
                notifying us promptly if unauthorized access is suspected.
              </p>
              <p>
                We may suspend or restrict accounts that misuse the platform, violate school policy,
                or create security risks for other users.
              </p>
            </>
          ),
        },
        {
          title: "Availability and changes",
          body: (
            <>
              <p>
                We may update, improve, or maintain the service over time. While we aim for
                reliability, uninterrupted availability cannot be guaranteed at all times.
              </p>
              <p>
                Continued use of the platform after updates means the revised terms apply from the
                stated update date.
              </p>
            </>
          ),
        },
        {
          title: "Contact",
          body: (
            <>
              <p>
                Questions about these terms can be sent to{" "}
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

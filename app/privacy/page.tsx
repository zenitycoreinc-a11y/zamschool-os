import type { Metadata } from "next";

import LegalPageLayout from "@/components/landing/LegalPageLayout";

export const metadata: Metadata = {
  title: "Privacy Policy | ZamSchool OS",
  description: "How ZamSchool OS handles personal information and school data.",
};

export default function PrivacyPage() {
  return (
    <LegalPageLayout
      title="Privacy Policy"
      summary="This page explains what information ZamSchool OS may collect, how it is used to operate the platform, and how schools can contact us about privacy requests."
      lastUpdated="April 3, 2026"
      sections={[
        {
          title: "Information we collect",
          body: (
            <>
              <p>
                ZamSchool OS may collect account details, school records, contact information,
                attendance data, academic records, and operational data needed to run the platform.
              </p>
              <p>
                We may also collect technical information such as browser type, device information,
                and basic usage logs to keep the service secure and reliable.
              </p>
            </>
          ),
        },
        {
          title: "How information is used",
          body: (
            <>
              <p>
                Information is used to provide school management features, secure accounts, support
                communication between authorized users, and maintain the performance of the service.
              </p>
              <p>
                We do not use school data for unrelated advertising. Access to school records should
                be limited to authorized staff, guardians, and students based on account roles.
              </p>
            </>
          ),
        },
        {
          title: "Data storage and retention",
          body: (
            <>
              <p>
                School data is retained for as long as needed to operate the service, comply with
                legal obligations, resolve disputes, and support legitimate school recordkeeping.
              </p>
              <p>
                Schools that need account or data deletion support can contact us so requests can
                be reviewed and handled appropriately.
              </p>
            </>
          ),
        },
        {
          title: "Contact",
          body: (
            <>
              <p>
                Privacy questions or requests can be sent to{" "}
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

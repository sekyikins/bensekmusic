import { Metadata } from "next";
import LegalPage from "@/components/legal/LegalPage";
import { SUPPORT_EMAIL } from "@/components/contact/EmailCard";

export const metadata: Metadata = {
  title: "Privacy Policy | SekMusic",
  description: "Privacy Policy for SekMusic.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      sections={[
        {
          heading: "1. Introduction",
          body: (
            <p>
              Welcome to SekMusic. We respect your privacy and are committed to protecting your personal data. This privacy policy will inform you as to how we look after your personal data when you visit our website and tell you about your privacy rights.
            </p>
          ),
        },
        {
          heading: "2. The Data We Collect",
          body: (
            <p>
              We do not collect personal data such as names or emails unless you voluntarily provide them (e.g., by contacting support). However, we may collect technical data, including your IP address, browser type and version, time zone setting, and operating system for analytics and security purposes.
            </p>
          ),
        },
        {
          heading: "3. Third-Party Advertising (Google AdSense)",
          body: (
            <>
              <p>
                We use third-party advertising companies, such as Google AdSense, to serve ads when you visit our Website. These companies may use information (not including your name, address, email address, or telephone number) about your visits to this and other Web sites in order to provide advertisements about goods and services of interest to you.
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>Google, as a third-party vendor, uses cookies to serve ads on our site.</li>
                <li>Google&apos;s use of the DART cookie enables it to serve ads to our users based on previous visits to our site and other sites on the Internet.</li>
                <li>Users may opt-out of the use of the DART cookie by visiting the Google Ad and Content Network privacy policy.</li>
              </ul>
            </>
          ),
        },
        {
          heading: "4. Processed Content",
          body: (
            <p>
              SekMusic provides a service to process and extract media. We do not permanently store the media files or URLs you submit. Files are processed transiently and deleted from our servers shortly after processing is complete.
            </p>
          ),
        },
        {
          heading: "5. Contact Us",
          body: (
            <p>
              If you have any questions about this Privacy Policy, please contact us at <a href={`mailto:${SUPPORT_EMAIL}`} className="text-brand-soft hover:underline">{SUPPORT_EMAIL}</a>.
            </p>
          ),
        },
      ]}
    />
  );
}

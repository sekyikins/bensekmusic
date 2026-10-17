import { Metadata } from "next";
import LegalPage from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Terms of Service | SekMusic",
  description: "Terms of Service for SekMusic.",
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      sections={[
        {
          heading: "1. Acceptance of Terms",
          body: (
            <p>
              By accessing and using SekMusic, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by these terms, please do not use this service.
            </p>
          ),
        },
        {
          heading: "2. Description of Service",
          body: (
            <p>
              SekMusic provides tools to extract, process, and download media files from publicly accessible URLs. The service is provided &quot;as is&quot; and &quot;as available&quot;.
            </p>
          ),
        },
        {
          heading: "3. User Responsibilities & Copyright",
          body: (
            <p>
              You are solely responsible for the content you extract or process using SekMusic. You agree not to use the service to download copyrighted material without the explicit permission of the copyright owner. SekMusic respects intellectual property rights and expects users to do the same. This tool is intended for personal, fair-use purposes.
            </p>
          ),
        },
        {
          heading: "4. Prohibited Uses",
          body: (
            <p>
              You may not use our service for any illegal or unauthorized purpose nor may you, in the use of the Service, violate any laws in your jurisdiction.
            </p>
          ),
        },
        {
          heading: "5. Disclaimer of Warranties",
          body: (
            <p>
              The use of the service is at your sole risk. SekMusic makes no warranty that the service will meet your requirements or be uninterrupted, timely, secure, or error-free.
            </p>
          ),
        },
        {
          heading: "6. Changes to Terms",
          body: (
            <p>
              SekMusic reserves the right to modify these terms at any time. Your continued use of the service following any changes means that you accept the new terms.
            </p>
          ),
        },
      ]}
    />
  );
}

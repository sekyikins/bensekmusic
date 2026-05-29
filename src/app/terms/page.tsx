import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | SekMusic",
  description: "Terms of Service for SekMusic.",
};

export default function TermsPage() {
  return (
    <div className="min-h-[calc(100vh-100px)] py-20 px-4">
      <div className="max-w-4xl mx-auto bg-white/5 border border-white/10 backdrop-blur-md rounded-3xl p-8 sm:p-12 text-gray-300 shadow-xl">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-8">Terms of Service</h1>

        <div className="space-y-6 text-sm sm:text-base leading-relaxed">
          <p>Last updated: {new Date().toLocaleDateString()}</p>

          <h2 className="text-xl font-bold text-white mt-8 mb-4">1. Acceptance of Terms</h2>
          <p>
            By accessing and using SekMusic, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by these terms, please do not use this service.
          </p>

          <h2 className="text-xl font-bold text-white mt-8 mb-4">2. Description of Service</h2>
          <p>
            SekMusic provides tools to extract, process, and download media files from publicly accessible URLs. The service is provided &quot;as is&quot; and &quot;as available&quot;.
          </p>

          <h2 className="text-xl font-bold text-white mt-8 mb-4">3. User Responsibilities & Copyright</h2>
          <p>
            You are solely responsible for the content you extract or process using SekMusic. You agree not to use the service to download copyrighted material without the explicit permission of the copyright owner. SekMusic respects intellectual property rights and expects users to do the same. This tool is intended for personal, fair-use purposes.
          </p>

          <h2 className="text-xl font-bold text-white mt-8 mb-4">4. Prohibited Uses</h2>
          <p>
            You may not use our service for any illegal or unauthorized purpose nor may you, in the use of the Service, violate any laws in your jurisdiction.
          </p>

          <h2 className="text-xl font-bold text-white mt-8 mb-4">5. Disclaimer of Warranties</h2>
          <p>
            The use of the service is at your sole risk. SekMusic makes no warranty that the service will meet your requirements or be uninterrupted, timely, secure, or error-free.
          </p>

          <h2 className="text-xl font-bold text-white mt-8 mb-4">6. Changes to Terms</h2>
          <p>
            SekMusic reserves the right to modify these terms at any time. Your continued use of the service following any changes means that you accept the new terms.
          </p>
        </div>
      </div>
    </div>
  );
}

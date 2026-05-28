import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | SekMusic",
  description: "Privacy Policy for SekMusic.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-[calc(100vh-100px)] py-20 px-4">
      <div className="max-w-4xl mx-auto bg-white/5 border border-white/10 backdrop-blur-md rounded-3xl p-8 sm:p-12 text-gray-300 shadow-xl">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-8">Privacy Policy</h1>

        <div className="space-y-6 text-sm sm:text-base leading-relaxed">
          <p>Last updated: {new Date().toLocaleDateString()}</p>

          <h2 className="text-xl font-bold text-white mt-8 mb-4">1. Introduction</h2>
          <p>
            Welcome to SekMusic. We respect your privacy and are committed to protecting your personal data. This privacy policy will inform you as to how we look after your personal data when you visit our website and tell you about your privacy rights.
          </p>

          <h2 className="text-xl font-bold text-white mt-8 mb-4">2. The Data We Collect</h2>
          <p>
            We do not collect personal data such as names or emails unless you voluntarily provide them (e.g., by contacting support). However, we may collect technical data, including your IP address, browser type and version, time zone setting, and operating system for analytics and security purposes.
          </p>

          <h2 className="text-xl font-bold text-white mt-8 mb-4">3. Third-Party Advertising (Google AdSense)</h2>
          <p>
            We use third-party advertising companies, such as Google AdSense, to serve ads when you visit our Website. These companies may use information (not including your name, address, email address, or telephone number) about your visits to this and other Web sites in order to provide advertisements about goods and services of interest to you.
          </p>
          <ul className="list-disc pl-6 space-y-2 mt-2">
            <li>Google, as a third-party vendor, uses cookies to serve ads on our site.</li>
            <li>Google's use of the DART cookie enables it to serve ads to our users based on previous visits to our site and other sites on the Internet.</li>
            <li>Users may opt-out of the use of the DART cookie by visiting the Google Ad and Content Network privacy policy.</li>
          </ul>

          <h2 className="text-xl font-bold text-white mt-8 mb-4">4. Processed Content</h2>
          <p>
            SekMusic provides a service to process and extract media. We do not permanently store the media files or URLs you submit. Files are processed transiently and deleted from our servers shortly after processing is complete.
          </p>

          <h2 className="text-xl font-bold text-white mt-8 mb-4">5. Contact Us</h2>
          <p>
            If you have any questions about this Privacy Policy, please contact us at <a href="mailto:contact@sekmusic.com" className="text-pink-400 hover:underline">contact@sekmusic.com</a>.
          </p>
        </div>
      </div>
    </div>
  );
}

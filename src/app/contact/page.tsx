import { Metadata } from "next";
import { Mail } from "lucide-react";

export const metadata: Metadata = {
  title: "Contact | SekMusic",
  description: "Get in touch with the SekMusic team.",
};

export default function ContactPage() {
  return (
    <div className="min-h-[calc(100vh-100px)] py-20 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl sm:text-5xl font-extrabold mb-8">
          Contact Us
        </h1>

        <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-3xl p-8 sm:p-10 text-gray-300 space-y-6 shadow-xl relative overflow-hidden">
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 blur-3xl rounded-full -ml-20 -mb-20 pointer-events-none" />

          <p className="text-lg leading-relaxed relative z-10">
            Have questions, feedback, or need support? We're here to help. Reach out to the SekMusic team via email, and we'll get back to you as soon as possible.
          </p>

          <div className="mt-10 p-6 bg-black/40 rounded-2xl border border-white/5 flex items-center gap-4 relative z-10">
            <div className="w-12 h-12 bg-pink-500/20 text-pink-400 rounded-full flex items-center justify-center shrink-0">
              <Mail className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-white font-bold mb-1">Email Support</h3>
              <a href="mailto:contact@sekmusic.com" className="text-pink-400 hover:text-purple-400 transition-colors font-medium">
                contact@sekmusic.com
              </a>
            </div>
          </div>

          <p className="text-sm text-gray-500 mt-8 relative z-10">
            Please allow up to 24-48 hours for a response to support inquiries.
          </p>
        </div>
      </div>
    </div>
  );
}

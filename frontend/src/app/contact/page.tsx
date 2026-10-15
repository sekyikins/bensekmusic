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

        <div className="glass-card rounded-3xl p-8 sm:p-10 text-fg-soft space-y-6 shadow-xl relative overflow-hidden">
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-brand-purple/10 blur-3xl rounded-full -ml-20 -mb-20 pointer-events-none" />

          <p className="text-lg leading-relaxed relative z-10">
            Have questions, feedback, or need support? We&apos;re here to help. Reach out to the SekMusic team via email, and we&apos;ll get back to you as soon as possible.
          </p>

          <div className="mt-10 p-6 bg-panel rounded-2xl border border-line-soft flex items-center gap-4 relative z-10">
            <div className="w-12 h-12 bg-brand/20 text-brand-soft rounded-full flex items-center justify-center shrink-0">
              <Mail className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-white font-bold mb-1">Email Support</h3>
              <a href="mailto:contact@sekmusic.com" className="text-brand-soft hover:text-brand-purple-soft transition-colors font-medium">
                contact@sekmusic.com
              </a>
            </div>
          </div>

          <p className="text-sm text-fg-subtle mt-8 relative z-10">
            Please allow up to 24-48 hours for a response to support inquiries.
          </p>
        </div>
      </div>
    </div>
  );
}

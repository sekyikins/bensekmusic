import { Metadata } from "next";
import PageShell from "@/components/ui/PageShell";
import GlassCard from "@/components/ui/GlassCard";
import EmailCard from "@/components/contact/EmailCard";

export const metadata: Metadata = {
  title: "Contact | SekMusic",
  description: "Get in touch with the SekMusic team.",
};

export default function ContactPage() {
  return (
    <PageShell>
      <h1 className="text-4xl sm:text-5xl font-extrabold mb-8">
        Contact Us
      </h1>

      <GlassCard glow="purple" glowPosition="bottom-left">
        <p className="text-lg leading-relaxed">
          Have questions, feedback, or need support? We&apos;re here to help. Reach out to the SekMusic team via email, and we&apos;ll get back to you as soon as possible.
        </p>

        <EmailCard />

        <p className="text-sm text-fg-subtle mt-8">
          Please allow up to 24-48 hours for a response to support inquiries.
        </p>
      </GlassCard>
    </PageShell>
  );
}

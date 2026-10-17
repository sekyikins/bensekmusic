import { Metadata } from "next";
import BrandWordmark from "@/components/ui/BrandWordmark";
import PageShell from "@/components/ui/PageShell";
import GlassCard from "@/components/ui/GlassCard";
import ContentSection from "@/components/ui/ContentSection";

export const metadata: Metadata = {
  title: "About | SekMusic",
  description: "Learn more about SekMusic, the ultimate media processing and extraction system.",
};

export default function AboutPage() {
  return (
    <PageShell>
      <div className="flex gap-2 mb-8">
        <h1 className="text-[30px] md:text-[50px] font-bold">About</h1>
        <BrandWordmark className="text-[30px] md:text-[50px] font-bold" glow />
      </div>

      <GlassCard glow="brand">
        <p className="text-lg leading-relaxed">
          SekMusic is an advanced, high-performance media processing and extraction system designed to provide the highest quality audio and video from your favorite sources.
        </p>

        <ContentSection heading="Our Mission">
          <p className="leading-relaxed">
            Our mission is to simplify media access. Whether you&apos;re an audio engineer looking for the highest quality lossless formats, a content creator needing quick access to specific video segments, or just a music enthusiast, SekMusic provides the tools to extract and process media with zero friction.
          </p>
        </ContentSection>

        <ContentSection heading="Technology">
          <p className="leading-relaxed">
            Built on a cutting-edge tech stack, SekMusic utilizes modern web standards, server-side processing, and custom extraction algorithms to deliver your media faster and more reliably than traditional services.
          </p>
        </ContentSection>
      </GlassCard>
    </PageShell>
  );
}

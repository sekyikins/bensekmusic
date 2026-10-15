import { Metadata } from "next";
import BrandWordmark from "@/components/ui/BrandWordmark";

export const metadata: Metadata = {
  title: "About | SekMusic",
  description: "Learn more about SekMusic, the ultimate media processing and extraction system.",
};

export default function AboutPage() {
  return (
    <div className="min-h-[calc(100vh-100px)] py-20 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex gap-2 mb-8">
          <h1 className="text-[30px] md:text-[50px] font-bold">About</h1>
          <BrandWordmark className="text-[30px] md:text-[50px] font-bold" glow />
        </div>

        <div className="glass-card rounded-3xl p-8 sm:p-10 text-fg-soft space-y-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-brand/10 blur-3xl rounded-full -mr-20 -mt-20 pointer-events-none" />

          <p className="text-lg leading-relaxed relative z-10">
            SekMusic is an advanced, high-performance media processing and extraction system designed to provide the highest quality audio and video from your favorite sources.
          </p>

          <h2 className="text-2xl font-bold text-white mt-8 mb-4 relative z-10">Our Mission</h2>
          <p className="leading-relaxed relative z-10">
            Our mission is to simplify media access. Whether you&apos;re an audio engineer looking for the highest quality lossless formats, a content creator needing quick access to specific video segments, or just a music enthusiast, SekMusic provides the tools to extract and process media with zero friction.
          </p>

          <h2 className="text-2xl font-bold text-white mt-8 mb-4 relative z-10">Technology</h2>
          <p className="leading-relaxed relative z-10">
            Built on a cutting-edge tech stack, SekMusic utilizes modern web standards, server-side processing, and custom extraction algorithms to deliver your media faster and more reliably than traditional services.
          </p>
        </div>
      </div>
    </div>
  );
}

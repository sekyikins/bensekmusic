import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import Script from "next/script";
import SiteHeader from "@/components/layout/SiteHeader";
import SiteFooter from "@/components/layout/SiteFooter";

const outfit = Outfit({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SekMusic | Ultimate Media Processing System",
  description: "Extract, process, and stream music from anywhere. High quality audio, video, and lyrics.",
  icons: {
    icon: "/favicon.jpg",
  },
  other: {
    "google-adsense-account": "ca-pub-8487986926421633"
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <Script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8487986926421633" crossOrigin="anonymous" strategy="afterInteractive" />
      <body suppressHydrationWarning className={`${outfit.className} min-h-screen cursor-default bg-background antialiased relative overflow-x-hidden`}>
        {/* Background ambient light */}
        <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-brand-purple-deep/20 blur-[120px] pointer-events-none -z-10 animate-pulse-glow" />
        <div className="fixed bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-brand-deep/20 blur-[120px] pointer-events-none -z-10 animate-pulse-glow" style={{ animationDelay: '2s' }} />

        <div className="flex flex-col min-h-screen relative z-10">
          <SiteHeader />

          <main className="grow">
            {children}
          </main>

          <SiteFooter />
        </div>
      </body>
    </html>
  );
}

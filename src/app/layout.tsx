import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

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
      <body suppressHydrationWarning className={`${outfit.className} min-h-screen bg-background antialiased relative overflow-x-hidden`}>
        {/* Background ambient light */}
        <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-purple-600/20 blur-[120px] pointer-events-none -z-10 animate-pulse-glow" />
        <div className="fixed bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-pink-600/20 blur-[120px] pointer-events-none -z-10 animate-pulse-glow" style={{ animationDelay: '2s' }} />
        
        <main className="relative z-10">
          {children}
        </main>
      </body>
    </html>
  );
}

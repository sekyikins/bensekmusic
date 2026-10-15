import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import Script from "next/script";
import Link from "next/link";
import BrandWordmark from "@/components/ui/BrandWordmark";

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
          <header className="sticky top-0 w-full border-b border-line app-bar py-4 z-50">
            <div className="max-w-4xl mx-auto px-4 flex items-center justify-between">
              <Link href="/" className="flex items-center hover:opacity-90 transition-opacity">
                <BrandWordmark className="font-bold text-lg sm:text-xl" />
              </Link>
              <nav className="flex items-center gap-6 text-sm font-medium text-fg-muted">
                <Link href="/about" className="hover:text-brand-purple transition-colors">About</Link>
                <Link href="/contact" className="hover:text-brand-purple transition-colors">Contact</Link>
              </nav>
            </div>
          </header>

          <main className="grow">
            {children}
          </main>
          
          <footer className="w-full border-t border-line app-bar py-8 mt-auto z-50">
            <div className="max-w-4xl mx-auto px-4 flex flex-col-reverse sm:flex-row items-center justify-between gap-4 text-sm text-fg-muted">
              <div className="flex items-center gap-2">
                <BrandWordmark className="font-bold" />
                <span>&copy; {new Date().getFullYear()}</span>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
                <Link href="/" className="hover:text-brand-purple transition-colors">Home</Link>
                <Link href="/about" className="hover:text-brand-purple transition-colors">About</Link>
                <Link href="/contact" className="hover:text-brand-purple transition-colors">Contact</Link>
                <Link href="/privacy" className="hover:text-brand-purple transition-colors">Privacy</Link>
                <Link href="/terms" className="hover:text-brand-purple transition-colors">Terms</Link>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}

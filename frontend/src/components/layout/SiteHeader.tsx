import Link from "next/link";
import BrandWordmark from "@/components/ui/BrandWordmark";

export default function SiteHeader() {
  return (
    <header className="sticky top-0 w-full border-b border-line app-bar py-4 z-50">
      <div className="max-w-4xl mx-auto px-4 flex items-center justify-between">
        <Link href="/" className="flex items-center hover:opacity-90 transition-opacity">
          <BrandWordmark className="font-bold text-lg sm:text-xl" />
        </Link>
        <nav className="flex items-center gap-6 text-sm font-medium text-fg-muted">
          <Link href="/about" className="hover:text-brand-purple transition-colors">
            About
          </Link>
          <Link href="/contact" className="hover:text-brand-purple transition-colors">
            Contact
          </Link>
        </nav>
      </div>
    </header>
  );
}

import Link from "next/link";
import BrandWordmark from "@/components/ui/BrandWordmark";

const FOOTER_LINKS = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
] as const;

export default function SiteFooter() {
  return (
    <footer className="w-full border-t border-line app-bar py-8 mt-auto z-50">
      <div className="max-w-4xl mx-auto px-4 flex flex-col-reverse sm:flex-row items-center justify-between gap-4 text-sm text-fg-muted">
        <div className="flex items-center gap-2">
          <BrandWordmark className="font-bold" />
          <span>&copy; {new Date().getFullYear()}</span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          {FOOTER_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-brand-purple transition-colors">
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}

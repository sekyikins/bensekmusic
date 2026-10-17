import { Mail } from "lucide-react";

export const SUPPORT_EMAIL = "contact@sekmusic.com";

export default function EmailCard() {
  return (
    <div className="mt-10 p-6 bg-panel rounded-2xl border border-line-soft flex items-center gap-4 relative z-10">
      <div className="w-12 h-12 bg-brand/20 text-brand-soft rounded-full flex items-center justify-center shrink-0">
        <Mail className="w-6 h-6" />
      </div>
      <div>
        <h3 className="text-white font-bold mb-1">Email Support</h3>
        <a
          href={`mailto:${SUPPORT_EMAIL}`}
          className="text-brand-soft hover:text-brand-purple-soft transition-colors font-medium"
        >
          {SUPPORT_EMAIL}
        </a>
      </div>
    </div>
  );
}

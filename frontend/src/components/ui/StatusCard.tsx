import type { LucideIcon } from "lucide-react";

const TONES = {
  brand: {
    glow: "bg-brand/10",
    badge: "bg-surface border-line shadow-[0_0_30px_var(--color-glow-2)]",
    icon: "text-brand-soft",
  },
  danger: {
    glow: "bg-danger/10",
    badge: "bg-danger/10 border border-danger/20 shadow-[0_0_30px_var(--color-danger-glow)]",
    icon: "text-danger-soft",
  },
} as const;

const ACTION_CLASSES =
  "btn-primary px-8 py-4 rounded-2xl cursor-pointer transition-all hover:shadow-[0_0_25px_var(--color-white-glow)]";

interface StatusCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  tone?: keyof typeof TONES;
  action?: React.ReactNode;
}
export default function StatusCard({
  icon: Icon,
  title,
  description,
  tone = "brand",
  action,
}: StatusCardProps) {
  const styles = TONES[tone];

  return (
    <div className="min-h-[calc(100vh-100px)] flex flex-col items-center justify-center p-4 selection:bg-brand/30 relative">
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-20">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[50vh] ambient-bg blur-3xl opacity-50" />
      </div>

      <div className="w-full max-w-md text-center glass-card rounded-3xl p-8 sm:p-12 shadow-2xl relative overflow-hidden">
        <div
          className={`absolute top-0 right-0 w-32 h-32 blur-2xl rounded-full -mr-10 -mt-10 pointer-events-none ${styles.glow}`}
        />

        <div
          className={`inline-flex items-center justify-center p-4 rounded-3xl border mb-6 ${styles.badge}`}
        >
          <Icon className={`w-12 h-12 ${styles.icon}`} />
        </div>

        <h1 className="text-4xl font-extrabold tracking-tight text-white mb-4">{title}</h1>

        <p className="text-fg-muted font-medium mb-8 leading-relaxed">{description}</p>

        {action}
      </div>
    </div>
  );
}

export const STATUS_ACTION_CLASSES = ACTION_CLASSES;

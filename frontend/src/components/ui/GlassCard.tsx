const GLOW_TONES = {
  brand: "bg-brand/10",
  purple: "bg-brand-purple/10",
  danger: "bg-danger/10",
} as const;

const GLOW_POSITIONS = {
  "top-right": "-mr-20 -mt-20",
  "bottom-left": "-ml-20 -mb-20",
} as const;

interface GlassCardProps {
  children: React.ReactNode;
  glow?: keyof typeof GLOW_TONES;
  glowPosition?: keyof typeof GLOW_POSITIONS;
  className?: string;
}

export default function GlassCard({
  children,
  glow,
  glowPosition = "top-right",
  className = "",
}: GlassCardProps) {
  return (
    <div
      className={`glass-card rounded-3xl p-8 sm:p-12 text-fg-soft shadow-xl relative overflow-hidden ${className}`}
    >
      {glow && (
        <div
          className={`absolute w-64 h-64 blur-3xl rounded-full pointer-events-none ${GLOW_TONES[glow]} ${GLOW_POSITIONS[glowPosition]}`}
        />
      )}
      <div className="relative z-10 space-y-6">{children}</div>
    </div>
  );
}

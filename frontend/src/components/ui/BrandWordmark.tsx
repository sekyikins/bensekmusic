interface BrandWordmarkProps {
  className?: string;
  glow?: boolean;
}

export default function BrandWordmark({ className = "", glow = false }: BrandWordmarkProps) {
  return (
    <span className={`inline-flex ${className}`}>
      <span className="text-gradient-white drop-shadow-sm">Sek</span>
      <span className={`text-gradient-brand${glow ? " text-glow-brand" : ""}`}>Music</span>
    </span>
  );
}

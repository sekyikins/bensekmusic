interface BrandWordmarkProps {
  /** Sizing / weight classes applied to the whole lockup (e.g. "text-5xl font-extrabold"). */
  className?: string;
  /** Add the pink glow behind the "Music" gradient (used on hero-style headings). */
  glow?: boolean;
}

/**
 * The "SekMusic" wordmark. Both colour gradients live in `globals.css`
 * (`.text-gradient-white` / `.text-gradient-brand`) so the brand is defined once.
 */
export default function BrandWordmark({ className = "", glow = false }: BrandWordmarkProps) {
  return (
    <span className={`inline-flex ${className}`}>
      <span className="text-gradient-white drop-shadow-sm">Sek</span>
      <span className={`text-gradient-brand${glow ? " text-glow-brand" : ""}`}>Music</span>
    </span>
  );
}

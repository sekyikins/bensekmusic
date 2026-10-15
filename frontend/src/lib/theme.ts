export function cssVar(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

export const CANVAS_GRADIENT = {
  from: { token: "--color-brand-purple", fallback: "#a855f7" },
  to: { token: "--color-brand", fallback: "#ec4899" },
} as const;

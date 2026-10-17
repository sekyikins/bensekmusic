interface PageShellProps {
  children: React.ReactNode;
  width?: "md" | "lg";
  className?: string;
}

const WIDTHS = {
  md: "max-w-3xl",
  lg: "max-w-4xl",
} as const;

export default function PageShell({ children, width = "md", className = "" }: PageShellProps) {
  return (
    <div className="min-h-[calc(100vh-100px)] py-20 px-4 selection:bg-brand/30 relative">
      <div className={`w-full ${WIDTHS[width]} mx-auto relative z-10 ${className}`}>
        {children}
      </div>
    </div>
  );
}

"use client";

import { useEffect } from "react";
import { AlertCircle } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="min-h-[calc(100vh-100px)] flex flex-col items-center justify-center p-4 selection:bg-brand/30 relative">
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-20">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[50vh] ambient-bg blur-3xl opacity-50" />
      </div>

      <div className="w-full max-w-md text-center glass-card rounded-3xl p-8 sm:p-12 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-danger/10 blur-2xl rounded-full -mr-10 -mt-10 pointer-events-none" />

        <div className="inline-flex items-center justify-center p-4 rounded-3xl bg-danger/10 border border-danger/20 shadow-[0_0_30px_var(--color-danger-glow)] mb-6">
          <AlertCircle className="w-12 h-12 text-danger-soft" />
        </div>

        <h1 className="text-3xl font-extrabold tracking-tight text-white mb-4">
          Something went wrong
        </h1>

        <p className="text-fg-muted font-medium mb-8 leading-relaxed">
          An error occurred while loading this page. Try reloading the player to see if it fixes the issue.
        </p>

        <button
          onClick={() => reset()}
          className="btn-primary px-8 py-4 rounded-2xl cursor-pointer transition-all hover:shadow-[0_0_25px_var(--color-white-glow)]"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}

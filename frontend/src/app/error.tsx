"use client";

import { useEffect } from "react";
import { AlertCircle } from "lucide-react";
import StatusCard, { STATUS_ACTION_CLASSES } from "@/components/ui/StatusCard";

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
    <StatusCard
      icon={AlertCircle}
      tone="danger"
      title="Something went wrong"
      description="An error occurred while loading this page. Try reloading the player to see if it fixes the issue."
      action={
        <button onClick={() => reset()} className={STATUS_ACTION_CLASSES}>
          Try Again
        </button>
      }
    />
  );
}

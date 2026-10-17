import Link from "next/link";
import { Music } from "lucide-react";
import StatusCard, { STATUS_ACTION_CLASSES } from "@/components/ui/StatusCard";

export default function NotFound() {
  return (
    <StatusCard
      icon={Music}
      title="404 - Lost in the Mix"
      description="The track or page you are looking for has faded out or does not exist. Let's get you back to the home playlist."
      action={
        <Link href="/" className={`inline-block ${STATUS_ACTION_CLASSES}`}>
          Back to Home
        </Link>
      }
    />
  );
}

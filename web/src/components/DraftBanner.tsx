import { AlertTriangle } from "lucide-react";
import { Alert } from "@/ds/molecules/Alert";
import { cn } from "@/lib/utils";
import { waitlistReady } from "@workspace/commerce";

/**
 * The legal pages stay drafts until the privacy page can name whoever holds the waitlist and how to reach them
 * (reading 10, ADR-145). Production's form stays closed until then, which is what lets the banner promise it.
 */
export function DraftBanner({ className = "" }: { className?: string }) {
  if (waitlistReady()) return null;
  return (
    <Alert tone="notice" className={cn("flex items-start gap-3", className)}>
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-brass" aria-hidden="true" />
      <p>
        This page is a draft and may still change. Until it's final, we don't collect email addresses or sell anything.
      </p>
    </Alert>
  );
}

import { AlertTriangle } from "lucide-react";
import { waitlistReady } from "@workspace/commerce";

/**
 * The legal pages stay drafts until the privacy page can name whoever holds the waitlist and how to reach them
 * (reading 10, ADR-145). Production's form stays closed until then, which is what lets the banner promise it.
 */
export function DraftBanner({ className = "" }: { className?: string }) {
  if (waitlistReady()) return null;
  return (
    <div
      role="status"
      className={`flex items-start gap-3 rounded-lg border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-amber-200 ${className}`}
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <p className="text-sm leading-relaxed">
        This page is a draft and may still change. Until it's final, we don't collect email addresses or sell anything.
      </p>
    </div>
  );
}

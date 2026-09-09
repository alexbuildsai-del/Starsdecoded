import { AlertTriangle } from "lucide-react";

export function DraftBanner() {
  return (
    <div
      role="status"
      className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-4 py-3 flex items-start gap-3 text-amber-200"
    >
      <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
      <p className="text-sm leading-relaxed">
        Draft. Not yet reviewed by the Owner. Nothing is sold until it is.
      </p>
    </div>
  );
}

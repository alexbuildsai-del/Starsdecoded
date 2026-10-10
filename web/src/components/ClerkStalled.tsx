import { useClerkStalled } from "@/hooks/useClerkStalled";
import { TextButton } from "@/ds/atoms/TextButton";
import { cn } from "@/lib/utils";

// Try again is a reload: a script the browser stopped is only asked for again by loading the page again.
function StalledLine({ className }: { className?: string }) {
  return (
    <p role="alert" className={cn("text-ui text-paper-dim text-balance", className)}>
      Sign-in couldn't load. A content blocker may be stopping it.{" "}
      <TextButton onClick={() => window.location.reload()} className="underline underline-offset-2">
        Try again
      </TextButton>
    </p>
  );
}

/** Reading 12's line under what a page already shows, once Clerk has stalled (MB-183); nothing before, or once it loads. */
export function ClerkStalled({ className }: { className?: string }) {
  return useClerkStalled() ? <StalledLine className={className} /> : null;
}

/** The line on a page of its own, for a page that has nothing to show until Clerk loads. */
export function ClerkStalledPage() {
  return (
    <main className="min-h-[100dvh] bg-ground bg-stars text-paper flex items-center justify-center px-6">
      <StalledLine className="max-w-sm text-center" />
    </main>
  );
}

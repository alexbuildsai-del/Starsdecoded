import { useEffect, useState } from "react";
import { useAuth } from "@clerk/react";

/** How long a page waits for Clerk before it says sign-in couldn't load (reading 12). */
export const CLERK_STALL_MS = 8_000;

// Clerk starts loading as the app boots, which is when this module is first read, so a page opened later in the visit
// counts the wait from there rather than from its own mount.
const bootedAt = performance.now();

/** What is left of the wait once `waitedMs` of it has passed. */
export function stallDelay(waitedMs: number, limitMs: number = CLERK_STALL_MS): number {
  return Math.max(0, limitMs - Math.max(0, waitedMs));
}

/** Calls `onStall` when the wait runs out, `waitedMs` of it already spent; the function returned calls it off. */
export function whenClerkStalls(waitedMs: number, onStall: () => void): () => void {
  const timer = setTimeout(onStall, stallDelay(waitedMs));
  return () => clearTimeout(timer);
}

/**
 * True once Clerk has gone CLERK_STALL_MS without loading (MB-183): a content blocker or a strict network that stops
 * its script would otherwise leave a page waiting for ever. False again should Clerk load late.
 */
export function useClerkStalled(): boolean {
  const { isLoaded } = useAuth();
  const [stalled, setStalled] = useState(() => !isLoaded && stallDelay(performance.now() - bootedAt) === 0);
  useEffect(() => {
    if (isLoaded) return;
    return whenClerkStalls(performance.now() - bootedAt, () => setStalled(true));
  }, [isLoaded]);
  return stalled && !isLoaded;
}

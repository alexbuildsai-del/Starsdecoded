import { useEffect, useRef, useState } from "react";
import { confirmWaitlist } from "@workspace/api-client-react";
import { Button } from "@/ds/atoms/Button";
import { WaitlistForm } from "@/components/waitlist/WaitlistForm";
import { PRODUCT } from "@/lib/product";
import { confirmFailure, type ConfirmFailure } from "@/lib/waitlist";

type Phase = "working" | "confirmed" | ConfirmFailure;

/**
 * What the emailed link opens (ADR-145). The page posts the token itself, so a mail
 * scanner that only fetches the link confirms nothing; the API answers a repeat the
 * same way, so a reload or a second click still ends on "You're on the list".
 */
export function ConfirmWaitlist({ token }: { token: string }) {
  const [phase, setPhase] = useState<Phase>(token.trim() ? "working" : "unknown_link");
  const [attempt, setAttempt] = useState(0);
  const [joined, setJoined] = useState<string | null>(null);
  const posted = useRef("");

  useEffect(() => {
    const key = `${attempt}:${token}`;
    // A ref rather than a cleanup flag, so a development remount neither posts twice nor drops the answer.
    if (posted.current === key) return;
    posted.current = key;
    const secret = token.trim();
    if (!secret) {
      setPhase("unknown_link");
      return;
    }
    setPhase("working");
    confirmWaitlist({ token: secret }).then(
      () => setPhase("confirmed"),
      (err: unknown) => setPhase(confirmFailure(err)),
    );
  }, [token, attempt]);

  return (
    <div className="grid gap-4">
      {!joined && (
        <div className="wl-done" role="status">
          {phase === "working" && <p>Confirming your email…</p>}
          {phase === "confirmed" && (
            <>
              <h3>You're on the list</h3>
              <p>We'll email you when {PRODUCT} launches.</p>
            </>
          )}
          {phase === "unknown_link" && (
            <>
              <h3>That link doesn't work</h3>
              <p>It may have expired, or a newer email replaced it. Enter your email and we'll send a new one.</p>
            </>
          )}
          {phase === "retry" && (
            <>
              <p>We couldn't confirm your email just now.</p>
              <Button className="mt-1 justify-self-start" onClick={() => setAttempt((n) => n + 1)}>
                Try again
              </Button>
            </>
          )}
        </div>
      )}
      {(phase === "unknown_link" || joined) && <WaitlistForm source="confirm" joined={joined} onJoined={setJoined} />}
    </div>
  );
}

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "wouter";
import { joinWaitlist } from "@workspace/api-client-react";
import { WAITLIST_CONSENT, WAITLIST_CONSENT_TEXT, looksLikeEmail, readUtm } from "@/lib/waitlist";

const BAD_EMAIL = "Enter an email address, like name@example.com.";

function failureLine(err: unknown): string {
  const status = (err as { status?: number } | null)?.status;
  if (status === 400) return BAD_EMAIL;
  if (status === 429) return "Too many sign-ups from here. Try again in a few minutes.";
  return "We couldn't add you just now. Try again in a minute.";
}

/**
 * The page's one form. Both copies share `joined`, so an address given in the
 * hero shows as on the list at the dawn too. Nothing is kept in the browser.
 */
export function WaitlistForm({ source, joined, onJoined }: { source: "hero" | "dawn"; joined: string | null; onJoined: (email: string) => void }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [trap, setTrap] = useState("");
  const done = useRef<HTMLDivElement>(null);
  const [justJoined, setJustJoined] = useState(false);
  const id = `wl-email-${source}`;

  useEffect(() => {
    if (justJoined) done.current?.focus();
  }, [justJoined]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const address = email.trim();
    if (!looksLikeEmail(address)) {
      setError(BAD_EMAIL);
      return;
    }
    setSending(true);
    setError(null);
    try {
      await joinWaitlist({ email: address, consent: WAITLIST_CONSENT, source, website: trap || undefined, ...readUtm(window.location.search) });
      setJustJoined(true);
      onJoined(address);
    } catch (err) {
      setError(failureLine(err));
    } finally {
      setSending(false);
    }
  }

  if (joined) {
    return (
      <div className="wl-done" role="status" tabIndex={-1} ref={done}>
        <h3>You're on the list</h3>
        <p>We'll email {joined} when Stars Decoded opens.</p>
      </div>
    );
  }

  return (
    <form className="wl-form" onSubmit={submit} noValidate>
      <div className="wl-fields">
        <div className="wl-fld">
          <label htmlFor={id}>Email</label>
          <input
            id={id}
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => { setEmail(e.target.value); if (error) setError(null); }}
            aria-invalid={error === BAD_EMAIL}
            aria-describedby={`${id}-hint${error ? ` ${id}-err` : ""}`}
          />
        </div>
        <button type="submit" className="wl-btn" disabled={sending}>
          {sending ? "Joining…" : "Join the waitlist"}
        </button>
      </div>
      <div className="wl-trap" aria-hidden="true">
        <label htmlFor={`${id}-website`}>Website</label>
        <input id={`${id}-website`} tabIndex={-1} autoComplete="off" value={trap} onChange={(e) => setTrap(e.target.value)} />
      </div>
      {error && <p className="wl-err" id={`${id}-err`} role="alert">{error}</p>}
      <p className="wl-hint" id={`${id}-hint`}>
        {WAITLIST_CONSENT_TEXT} <Link href="/privacy#waitlist">How we handle your email</Link>
      </p>
    </form>
  );
}

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "wouter";
import { joinWaitlist } from "@workspace/api-client-react";
import { waitlistReady } from "@workspace/commerce";
import { APP_ENV } from "@/lib/appEnv";
import {
  CONFIRM_LINK_DAYS, WAITLIST_CLOSED_LINE, WAITLIST_CONSENT, WAITLIST_CONSENT_TEXT,
  joinFailure, looksLikeEmail, readUtm, sourceTag, waitlistOpen, type JoinFailure,
} from "@/lib/waitlist";

const BAD_EMAIL = "Enter an email address, like name@example.com.";

const FAILURE_LINES: Record<Exclude<JoinFailure, "closed" | "bad_email">, string> = {
  rate_limited: "Too many sign-ups from here. Try again in a few minutes.",
  retry: "We couldn't add you just now. Try again in a minute.",
};

// Fixed for the build, so the prerender and the browser agree on which one they show.
const TAKES_SIGNUPS = waitlistOpen(APP_ENV, waitlistReady());

// Utilities rather than a site.css rule, so the button looks the same wherever the form sits, the dialog included.
const CHANGE_BUTTON =
  "justify-self-start mt-1 cursor-pointer text-[13px] text-[color:var(--indigo-lt)] underline underline-offset-[3px] hover:text-[color:var(--paper)]";

/**
 * The waitlist's one form: the dialog, /waitlist and the home page's sections all
 * use it. The parent holds `joined`, so a second copy shows where the first left
 * off. A join sends a link to confirm the address (ADR-145), so the form never
 * says the visitor is on the list. Nothing is kept in the browser.
 */
export function WaitlistForm({ source, joined, onJoined }: { source: string; joined: string | null; onJoined: (email: string) => void }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [trap, setTrap] = useState("");
  const [refused, setRefused] = useState(false);
  const [changing, setChanging] = useState(false);
  const [joins, setJoins] = useState(0);
  const done = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLInputElement>(null);
  const id = `wl-email-${source.trim().replace(/\s+/g, "-")}`;

  useEffect(() => {
    if (joins > 0) done.current?.focus();
  }, [joins]);

  useEffect(() => {
    if (changing) field.current?.focus();
  }, [changing]);

  // The address is what needs fixing, so the reader lands where they can retype it (MB-184).
  function refuseAddress() {
    setError(BAD_EMAIL);
    field.current?.focus();
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const address = email.trim();
    if (!looksLikeEmail(address)) {
      refuseAddress();
      return;
    }
    setSending(true);
    setError(null);
    try {
      await joinWaitlist({ email: address, consent: WAITLIST_CONSENT, source: sourceTag(source), website: trap || undefined, ...readUtm(window.location.search) });
      setChanging(false);
      setJoins((n) => n + 1);
      onJoined(address);
    } catch (err) {
      const failure = joinFailure(err);
      if (failure === "closed") setRefused(true);
      else if (failure === "bad_email") refuseAddress();
      else setError(FAILURE_LINES[failure]);
    } finally {
      setSending(false);
    }
  }

  if (!TAKES_SIGNUPS || refused) {
    return (
      <div className="wl-done" role="status">
        <p>{WAITLIST_CLOSED_LINE}</p>
      </div>
    );
  }

  if (joined && !changing) {
    return (
      <div className="wl-done" role="status" tabIndex={-1} ref={done}>
        <h3>Check your inbox</h3>
        <p className="break-words">We sent a link to {joined}. Open it to confirm your email.</p>
        <p>The link works for {CONFIRM_LINK_DAYS} days. If you can't find it, check your spam folder.</p>
        <button type="button" className={CHANGE_BUTTON} onClick={() => { setEmail(joined); setChanging(true); }}>
          Use a different email
        </button>
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
            ref={field}
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

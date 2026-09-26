/**
 * The waitlist's consent (ADR-141). The key travels with every sign-up and is
 * stored beside the address, so the list shows what each person agreed to; a
 * new wording gets a new key in openapi.yaml.
 */
// MB-106 provisional: single opt-in; a confirm link waits for Resend's domain.
export const WAITLIST_CONSENT = "launch-email-v1" as const;
export const WAITLIST_CONSENT_TEXT =
  "We'll only use your email to tell you when Stars Decoded opens. You can ask us to delete it at any time.";

/** Enough to catch a slip before the API's own check: something, an @, something with a dot. */
export function looksLikeEmail(raw: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw.trim());
}

/** The campaign tags in the address the visitor arrived at, if any. */
export function readUtm(search: string): { utmSource?: string; utmMedium?: string; utmCampaign?: string } {
  const q = new URLSearchParams(search);
  const pick = (key: string) => q.get(key)?.trim().slice(0, 100) || undefined;
  return { utmSource: pick("utm_source"), utmMedium: pick("utm_medium"), utmCampaign: pick("utm_campaign") };
}

export interface WaitlistSignup {
  id: string;
  email: string;
  consent: string;
  source: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  createdAt: string;
}

/** A cell a spreadsheet would run as a formula stays text. */
export function csvCell(value: string | null): string {
  const text = value ?? "";
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function waitlistCsv(rows: readonly WaitlistSignup[]): string {
  const head = ["email", "joined_at", "form", "utm_source", "utm_medium", "utm_campaign", "consent"];
  const lines = rows.map((r) =>
    [r.email, r.createdAt, r.source, r.utmSource, r.utmMedium, r.utmCampaign, r.consent].map(csvCell).join(","),
  );
  return [head.join(","), ...lines].join("\r\n") + "\r\n";
}

/** How many joined within the last `days` days of `now`. */
export function joinedWithin(rows: readonly WaitlistSignup[], days: number, now: Date): number {
  const since = now.getTime() - days * 86_400_000;
  return rows.filter((r) => Date.parse(r.createdAt) >= since).length;
}

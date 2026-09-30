import type { AppEnv } from "@/lib/appEnv";
import { PRODUCT } from "@/lib/product";

/**
 * The waitlist's consent (ADR-141, 145). The key travels with every sign-up and is
 * stored beside the address, so the list shows what each person agreed to; a
 * new wording gets a new key in openapi.yaml. "Opens" became "launches" (MB-122)
 * under the same key, because production had taken no address under the old words.
 */
export const WAITLIST_CONSENT = "launch-email-v2" as const;
export const WAITLIST_CONSENT_TEXT = `We'll send you a link to confirm your email. After that, we'll only use it to tell you when ${PRODUCT} launches. You can ask us to delete your email at any time.`;

/** The API decides how long the emailed link lives and the web cannot import api/ (MB-108), so this only words it: keep the two equal (ADR-145). */
export const CONFIRM_LINK_DAYS = 7;

/** Kept equal to the message the API sends with its 503, so a closed form and a refused join read alike. */
export const WAITLIST_CLOSED_LINE = "The waitlist isn't taking sign-ups yet. Check back soon.";

/** Production takes no address until the privacy page names its contact (ADR-145, reading 12); staging and local always do. */
export function waitlistOpen(env: AppEnv, ready: boolean): boolean {
  return env !== "production" || ready;
}

/** The contract keeps a source to 32 characters, and a longer one would fail the whole join. */
export function sourceTag(source: string): string {
  return source.trim().slice(0, 32);
}

/** Enough to catch a slip before the API's own check: something, an @, something with a dot. */
export function looksLikeEmail(raw: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw.trim());
}

/** The campaign tags in the address the visitor arrived at, if any. */
export function readUtm(search: string): { utmSource?: string; utmMedium?: string; utmCampaign?: string; utmContent?: string } {
  const q = new URLSearchParams(search);
  const pick = (key: string) => q.get(key)?.trim().slice(0, 100) || undefined;
  return { utmSource: pick("utm_source"), utmMedium: pick("utm_medium"), utmCampaign: pick("utm_campaign"), utmContent: pick("utm_content") };
}

export type JoinFailure = "bad_email" | "rate_limited" | "closed" | "retry";

/** Only the API's own `waitlist_closed` is the closed line: a bare 503 is an outage, and the reader is told to try again. */
export function joinFailure(err: unknown): JoinFailure {
  const e = err as { status?: number; data?: { error?: string } | null } | null;
  if (e?.status === 400) return "bad_email";
  if (e?.status === 429) return "rate_limited";
  if (e?.status === 503 && e.data?.error === "waitlist_closed") return "closed";
  return "retry";
}

export type ConfirmFailure = "unknown_link" | "retry";

/** A link the API does not know, or one too long to be ours, cannot be retried; anything else might work in a minute. */
export function confirmFailure(err: unknown): ConfirmFailure {
  const status = (err as { status?: number } | null)?.status;
  return status === 404 || status === 400 ? "unknown_link" : "retry";
}

export interface WaitlistSignup {
  id: string;
  email: string;
  consent: string;
  source: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  createdAt: string;
  /** Null while the owner has not followed the emailed link; the API marks rows from before the link confirmed (ADR-145). */
  confirmedAt: string | null;
}

export const isConfirmed = (row: Pick<WaitlistSignup, "confirmedAt">): boolean => row.confirmedAt != null;

/** A cell a spreadsheet would run as a formula stays text. */
export function csvCell(value: string | null): string {
  const text = value ?? "";
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function waitlistCsv(rows: readonly WaitlistSignup[]): string {
  const head = ["email", "joined_at", "confirmed_at", "form", "utm_source", "utm_medium", "utm_campaign", "utm_content", "consent"];
  const lines = rows.map((r) =>
    [r.email, r.createdAt, r.confirmedAt, r.source, r.utmSource, r.utmMedium, r.utmCampaign, r.utmContent, r.consent].map(csvCell).join(","),
  );
  return [head.join(","), ...lines].join("\r\n") + "\r\n";
}

/** How many addresses were confirmed within the last `days` days of `now`: under double opt-in, that is when one joins. */
export function confirmedWithin(rows: readonly WaitlistSignup[], days: number, now: Date): number {
  const since = now.getTime() - days * 86_400_000;
  return rows.filter((r) => r.confirmedAt != null && Date.parse(r.confirmedAt) >= since).length;
}

/** The list's four numbers, worked out from the rows so they hold whatever else the API adds to its answer. */
export function waitlistCounts(rows: readonly WaitlistSignup[], now: Date) {
  const confirmed = rows.filter(isConfirmed).length;
  return {
    confirmed,
    pending: rows.length - confirmed,
    day: confirmedWithin(rows, 1, now),
    week: confirmedWithin(rows, 7, now),
  };
}

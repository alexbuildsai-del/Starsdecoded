/**
 * The admin Sales page's one door to /api/admin/campaigns and /api/admin/testers (ADR-315).
 * Like /admin/lab these routes sit outside openapi.yaml, so their shapes are typed here and
 * nowhere else in the web app. A refusal's `message` is the line the page shows in place.
 */
import { BASE_URL } from "@/lib/api";

export class SalesApiError extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string) {
    super(message);
    this.name = "SalesApiError";
  }
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}admin/${path}`, {
    credentials: "include",
    ...init,
    headers: init?.body ? { "content-type": "application/json" } : undefined,
  });
  const body = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
  if (!res.ok) throw new SalesApiError(res.status, body.error ?? "error", body.message ?? "That didn't work. Try again in a minute.");
  return body as T;
}

export type CampaignItem = "couple" | "family";

export interface Campaign {
  id: string;
  name: string;
  audience: "everyone" | "link";
  slug: string | null;
  /** Whole Brussels days, YYYY-MM-DD; the last day is the day it ends (reading 5). */
  startsOn: string;
  endsOn: string;
  /** Euro cents per product. */
  prices: Partial<Record<CampaignItem, number>>;
  endedAt: string | null;
}

export interface CampaignInput {
  name: string;
  audience: "everyone" | "link";
  slug: string | null;
  startsOn: string;
  endsOn: string;
  prices: Partial<Record<CampaignItem, number>>;
}

export interface Tester {
  userId: string;
  email: string;
  /** Set on the two QA accounts, which staging makes and resets itself. */
  qa: "mira" | "idris" | null;
  /** Credits the admin has granted and how many of them are spent. */
  granted?: number;
  used?: number;
}

export type GrantCount = 1 | 3 | 5;
export const GRANT_COUNTS: readonly GrantCount[] = [1, 3, 5];

export const listCampaigns = async (): Promise<Campaign[]> => (await call<{ campaigns: Campaign[] }>("campaigns")).campaigns;

export const saveCampaign = (input: CampaignInput) =>
  call<{ campaign: Campaign }>("campaigns", { method: "POST", body: JSON.stringify(input) });

export const endCampaign = (id: string) => call<unknown>(`campaigns/${encodeURIComponent(id)}/end`, { method: "POST" });

export const listTesters = async (): Promise<Tester[]> => (await call<{ testers: Tester[] }>("testers")).testers;

export const addTester = (email: string) => call<unknown>("testers", { method: "POST", body: JSON.stringify({ email }) });

export const grantTester = (userId: string, count: GrantCount) =>
  call<unknown>(`testers/${encodeURIComponent(userId)}/grant`, { method: "POST", body: JSON.stringify({ count }) });

export const removeTester = (userId: string) => call<unknown>(`testers/${encodeURIComponent(userId)}`, { method: "DELETE" });

export type CampaignStatus = "scheduled" | "live" | "ended";

/** Today in Brussels as YYYY-MM-DD, the clock the campaign days run on. */
export function brusselsToday(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Brussels" }).format(now);
}

export function campaignStatus(c: Pick<Campaign, "startsOn" | "endsOn" | "endedAt">, now: Date): CampaignStatus {
  const today = brusselsToday(now);
  if (c.endedAt || today > c.endsOn) return "ended";
  return today < c.startsOn ? "scheduled" : "live";
}

/** A link-only campaign runs from the site's address with `?c=<slug>`, kept with the visitor's session. */
export const campaignLink = (origin: string, slug: string) => `${origin}/?c=${slug}`;

export function dayLabel(day: string): string {
  return new Date(`${day}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

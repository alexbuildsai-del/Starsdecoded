import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import type { IncomingHttpHeaders } from "node:http";
import { and, eq, isNull, lte, or } from "drizzle-orm";
import { LEGAL_IDENTITY, waitlistReady, type SellerIdentity } from "@workspace/commerce";
import { db, waitlistSignupsTable, type WaitlistSignup } from "@workspace/db";
import { readAppEnv, type AppEnv } from "./appEnv.js";

/** One row per address: the unique index sees every spelling of it as the same. */
export function normaliseEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

/** Campaign tags are labels, not free text: letters, digits and a few joiners, or nothing. */
export function tag(raw: string | undefined, max = 100): string | null {
  const clean = (raw ?? "").replace(/[^\w.+~ -]/g, "").trim().slice(0, max);
  return clean || null;
}

/**
 * True when the call carries EDGE_PROXY_SECRET, which only the root middleware.ts adds, on its way through Vercel to
 * here (ADR-224). Both sides are hashed first, so the comparison takes the same time whatever was sent and gives away
 * nothing of the secret, not even its length. Unset or empty, nothing came through the edge; a header sent twice is not
 * the edge's, which sets one.
 */
export function cameThroughEdge(headers: IncomingHttpHeaders, secret = process.env.EDGE_PROXY_SECRET): boolean {
  const sent = headers["x-edge-proxy-secret"];
  if (!secret || typeof sent !== "string") return false;
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(sent), digest(secret));
}

/**
 * Who is sending, for throttling only; never stored. Through Vercel's rewrite every request reaches Railway from
 * Vercel's own addresses, so the client is the address Vercel forwards, but only on a call through our edge: anyone
 * calling Railway directly can write that header, and a new address per call would dodge every limit (MB-150). Any
 * other call is the address Railway's proxy saw, `req.ip` behind the one trusted hop.
 */
export function clientKey(headers: IncomingHttpHeaders, ip: string | undefined): string {
  if (cameThroughEdge(headers)) {
    const forwarded = headers["x-vercel-forwarded-for"];
    const first = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(",")[0]?.trim();
    if (first) return first;
  }
  return ip || "unknown";
}

/** A sliding window per key, in memory: the API runs as one process. */
export class RateLimiter {
  private readonly hits = new Map<string, number[]>();

  constructor(private readonly limit: number, private readonly windowMs: number) {}

  /** Records a hit and says whether it may go ahead. */
  take(key: string, now: number = Date.now()): boolean {
    const since = now - this.windowMs;
    const recent = (this.hits.get(key) ?? []).filter((t) => t > since);
    const allowed = recent.length < this.limit;
    if (allowed) recent.push(now);
    this.hits.set(key, recent);
    if (this.hits.size > 10_000) this.prune(since);
    return allowed;
  }

  private prune(since: number) {
    for (const [key, times] of this.hits) {
      if (times.every((t) => t <= since)) this.hits.delete(key);
    }
  }
}

/**
 * Production takes no address until the privacy page can name who holds the
 * list and how to reach them (ADR-145, reading 12). Staging and local always
 * take sign-ups, so the form can be tried before the seller's fields are in.
 */
export function waitlistClosed(env: NodeJS.ProcessEnv = process.env, seller: SellerIdentity = LEGAL_IDENTITY): boolean {
  return readAppEnv(env) === "production" && !waitlistReady(seller);
}

// Double opt-in (ADR-145, reading 11). An address nobody confirms goes when its
// latest link dies, so no live link ever points at a deleted row.
export const CONFIRM_LINK_MS = 7 * 86_400_000;
// However often the form is sent, one inbox gets at most one link in ten
// minutes: the form cannot be turned into a way to flood someone.
export const RELINK_AFTER_MS = 10 * 60_000;

/** 32 random bytes for the emailed link. Only the SHA-256 is stored, so a leaked table confirms nobody. */
export function newConfirmToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashConfirmToken(token) };
}

export function hashConfirmToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// What newConfirmToken makes; anything else cannot be ours and never reaches the table.
const TOKEN_SHAPE = /^[A-Za-z0-9_-]{43}$/;

// So a deployment that has not set PUBLIC_APP_URL still links to its own web app.
const WEB_ORIGIN: Record<AppEnv, string> = {
  production: "https://mystarsdecoded.com",
  staging: "https://starsdecoded-staging.vercel.app",
  development: "http://localhost:5173",
};

/**
 * The web app's origin, for every link and image an email carries. Configuration alone sets it: the API also answers
 * on its own Railway host, where a caller can send any Host or X-Forwarded-Host, and a mail signed for our domain must
 * never send its reader to a host they named.
 */
export function publicWebBase(env: NodeJS.ProcessEnv = process.env): string {
  return env.PUBLIC_APP_URL?.trim().replace(/\/+$/, "") || WEB_ORIGIN[readAppEnv(env)];
}

/** The emailed link opens the web app's /waitlist page, which posts the token itself. */
export function confirmUrl(token: string, env: NodeJS.ProcessEnv = process.env): string {
  return `${publicWebBase(env)}/waitlist?confirm=${encodeURIComponent(token)}`;
}

export type StoredSignup = Pick<WaitlistSignup, "id" | "confirmedAt" | "confirmSentAt" | "createdAt">;

export type JoinAction = "insert" | "relink" | "none";

/** A confirmed address gets nothing, having nothing left to confirm; a waiting one a fresh link once the ten minutes are up. */
export function joinAction(row: StoredSignup | null, now: Date): JoinAction {
  if (!row) return "insert";
  if (row.confirmedAt) return "none";
  if (row.confirmSentAt && now.getTime() - row.confirmSentAt.getTime() < RELINK_AFTER_MS) return "none";
  return "relink";
}

export function linkExpiry(sentAt: Date): Date {
  return new Date(sentAt.getTime() + CONFIRM_LINK_MS);
}

/** Exactly the rows the sweep keeps: a link is live until the instant its row may be swept. */
export function linkLive(row: Pick<StoredSignup, "confirmSentAt">, now: Date): boolean {
  return row.confirmSentAt !== null && now.getTime() < linkExpiry(row.confirmSentAt).getTime();
}

/** Unconfirmed rows whose latest link went out at or before this instant are past their seven days. */
export function sweepBefore(now: Date): Date {
  return new Date(now.getTime() - CONFIRM_LINK_MS);
}

export interface NewSignup {
  id: string;
  email: string;
  consent: string;
  source: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  confirmTokenHash: string;
  confirmSentAt: Date;
}

export interface WaitlistStore {
  /** Deletes every unconfirmed row whose latest link went out at or before `before`. */
  sweep(before: Date): Promise<void>;
  find(email: string): Promise<StoredSignup | null>;
  findByTokenHash(hash: string): Promise<StoredSignup | null>;
  /** False when the address is already there: a join sent at the same moment got in first. */
  insert(row: NewSignup): Promise<boolean>;
  /** Swaps in a new link while the row is unconfirmed and its last link went out at or before `sentBefore`; false when another join or a confirmation got there first. */
  relink(id: string, link: { hash: string; sentAt: Date; consent: string }, sentBefore: Date): Promise<boolean>;
  /** False when the row is gone. */
  markConfirmed(id: string, at: Date): Promise<boolean>;
}

const t = waitlistSignupsTable;
const storedColumns = { id: t.id, confirmedAt: t.confirmedAt, confirmSentAt: t.confirmSentAt, createdAt: t.createdAt };

export const dbWaitlistStore: WaitlistStore = {
  async sweep(before) {
    await db
      .delete(t)
      .where(and(isNull(t.confirmedAt), or(lte(t.confirmSentAt, before), and(isNull(t.confirmSentAt), lte(t.createdAt, before)))));
  },
  async find(email) {
    const [row] = await db.select(storedColumns).from(t).where(eq(t.email, email)).limit(1);
    return row ?? null;
  },
  async findByTokenHash(hash) {
    const [row] = await db.select(storedColumns).from(t).where(eq(t.confirmTokenHash, hash)).limit(1);
    return row ?? null;
  },
  async insert(row) {
    const added = await db.insert(t).values(row).onConflictDoNothing({ target: t.email }).returning({ id: t.id });
    return added.length > 0;
  },
  async relink(id, link, sentBefore) {
    const moved = await db
      .update(t)
      .set({ confirmTokenHash: link.hash, confirmSentAt: link.sentAt, consent: link.consent })
      .where(and(eq(t.id, id), isNull(t.confirmedAt), or(isNull(t.confirmSentAt), lte(t.confirmSentAt, sentBefore))))
      .returning({ id: t.id });
    return moved.length > 0;
  },
  async markConfirmed(id, at) {
    // By id alone: two clicks racing both land here, and both must answer confirmed.
    const marked = await db.update(t).set({ confirmedAt: at }).where(eq(t.id, id)).returning({ id: t.id });
    return marked.length > 0;
  },
};

export interface JoinRequest {
  email: string;
  consent: string;
  source?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
}

export interface ConfirmMail {
  to: string;
  token: string;
  expiresOn: Date;
}

/**
 * Stores or refreshes an address and names the link to email, if any. Whatever
 * comes back, the caller answers the same (ADR-145): only the address's owner
 * learns anything, and only from their inbox. Tags keep the first join's; the
 * consent follows the latest, since that is the wording the link confirms.
 */
export async function joinWaitlist(
  store: WaitlistStore,
  request: JoinRequest,
  now: Date = new Date(),
  mint: () => { token: string; hash: string } = newConfirmToken,
): Promise<ConfirmMail | null> {
  await store.sweep(sweepBefore(now));
  const email = normaliseEmail(request.email);
  const row = await store.find(email);
  const action = joinAction(row, now);
  if (action === "none") return null;
  const { token, hash } = mint();
  const stored =
    action === "relink" && row
      ? await store.relink(row.id, { hash, sentAt: now, consent: request.consent }, new Date(now.getTime() - RELINK_AFTER_MS))
      : await store.insert({
          id: randomUUID(),
          email,
          consent: request.consent,
          source: tag(request.source, 32),
          utmSource: tag(request.utmSource),
          utmMedium: tag(request.utmMedium),
          utmCampaign: tag(request.utmCampaign),
          utmContent: tag(request.utmContent),
          confirmTokenHash: hash,
          confirmSentAt: now,
        });
  return stored ? { to: email, token, expiresOn: linkExpiry(now) } : null;
}

/** True when the token's address is confirmed, now or by an earlier click, so a repeat answers the same. */
export async function confirmWaitlist(store: WaitlistStore, token: string, now: Date = new Date()): Promise<boolean> {
  await store.sweep(sweepBefore(now));
  if (!TOKEN_SHAPE.test(token)) return false;
  const row = await store.findByTokenHash(hashConfirmToken(token));
  if (!row) return false;
  if (row.confirmedAt) return true;
  if (!linkLive(row, now)) return false;
  return store.markConfirmed(row.id, now);
}

export interface ListedSignup {
  id: string;
  email: string;
  consent: string;
  source: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  createdAt: string;
  confirmedAt: string | null;
}

/** The admin's list, with how many confirmed and how many still wait on their link. The token's hash never leaves the table. */
export function waitlistListing(rows: readonly WaitlistSignup[]): {
  total: number;
  confirmed: number;
  pending: number;
  signups: ListedSignup[];
} {
  const confirmed = rows.filter((r) => r.confirmedAt !== null).length;
  return {
    total: rows.length,
    confirmed,
    pending: rows.length - confirmed,
    signups: rows.map((r) => ({
      id: r.id,
      email: r.email,
      consent: r.consent,
      source: r.source,
      utmSource: r.utmSource,
      utmMedium: r.utmMedium,
      utmCampaign: r.utmCampaign,
      utmContent: r.utmContent,
      createdAt: r.createdAt.toISOString(),
      confirmedAt: r.confirmedAt?.toISOString() ?? null,
    })),
  };
}

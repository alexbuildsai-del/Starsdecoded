/**
 * Campaigns (ADR-278, 281; R-6.7): a lower price on Couple, Family & friends or both, saved from the admin's Sales page
 * into this environment's own list, so starting one needs no deploy. Nothing here calls Stripe and no route runs the
 * sync (ADR-315): checkout makes a campaign's coupon the first time it needs one (`couponIdFor`).
 *
 * A campaign's days are whole days in Brussels (reading 5): it holds its price from 00:00 on its first day to 24:00 on
 * its last, so the last day it prints is the last day it runs (R16-01's lesson), and End now stops it at that instant.
 */
import { randomUUID } from "node:crypto";
import { and, desc, eq, gte, isNull, lte, sql } from "drizzle-orm";
import { db, campaignsTable, type CampaignAudience, type CampaignRow } from "@workspace/db";
import {
  CAMPAIGN_ITEMS,
  MAX_CAMPAIGN_OFF,
  PLANS,
  bundleById,
  formatEuro,
  itemById,
  type BundleId,
  type CatalogueItemId,
} from "@workspace/commerce";

/** Stripe's receipt names a campaign by its coupon, and Stripe takes at most 40 characters for that name. */
export const CAMPAIGN_NAME_MAX = 40;

// MB-149 provisional: a product goes back to its full price for 30 whole days between two of its campaigns, so the
// price struck through beside a campaign's is the one the 30 days before it charged.
export const DAYS_AT_FULL_PRICE = 30;

/** A link-only campaign's word after `?c=`: small letters and digits, with single dashes between. */
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const SLUG_LENGTH = { min: 3, max: 32 } as const;

/** Euro cents for each item a campaign covers. */
export type CampaignPrices = Partial<Record<BundleId, number>>;

export interface Campaign {
  id: string;
  name: string;
  audience: CampaignAudience;
  /** Only a link-only campaign has one. */
  slug: string | null;
  /** Its first and last day in Brussels, YYYY-MM-DD. */
  startsOn: string;
  endsOn: string;
  prices: CampaignPrices;
  /** When End now stopped it; null while it keeps to its days. */
  endedAt: Date | null;
  createdAt: Date;
}

/** A campaign as the Sales page sends it; every rule is checked here, so each refusal has its own line. */
export interface CampaignInput {
  name: string;
  audience: CampaignAudience;
  slug?: string | null;
  startsOn: string;
  endsOn: string;
  prices: Readonly<Record<string, number>>;
}

/** One item's price for one request, as checkout and its options read it. */
export interface ItemPrice {
  item: CatalogueItemId;
  /** What this request pays: the live campaign's price while one runs. */
  cents: number;
  /** The catalogue's price for the item, struck through beside a campaign's; never the Singles total. */
  fullCents: number;
  /** The id names the coupon and goes on the purchase; the name and the last day are what the buyer reads. */
  campaign: { id: string; name: string; endsOn: string } | null;
}

export class CampaignRefused extends Error {
  constructor(
    readonly status: 400 | 404 | 409,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "CampaignRefused";
  }
}

export type CampaignRefusal = { status: 400 | 409; code: string; line: string };

const BRUSSELS = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Brussels",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** The day in Brussels at an instant, YYYY-MM-DD; built from its parts, since a locale's short date can change shape. */
export function brusselsDay(at: Date): string {
  const part: Record<string, string> = {};
  for (const { type, value } of BRUSSELS.formatToParts(at)) part[type] = value;
  return `${part.year}-${part.month}-${part.day}`;
}

const DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** A day the calendar has: 30 February is refused, never read as 2 March (R16-05's lesson). */
export function isRealDay(text: string): boolean {
  const match = DAY.exec(text);
  if (!match) return false;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const at = new Date(Date.UTC(year, month - 1, day));
  return at.getUTCFullYear() === year && at.getUTCMonth() === month - 1 && at.getUTCDate() === day;
}

function addDays(day: string, days: number): string {
  const [year, month, date] = day.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, date + days)).toISOString().slice(0, 10);
}

const DAY_LABEL = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

function dayLabel(day: string): string {
  return DAY_LABEL.format(new Date(`${day}T12:00:00Z`));
}

/** The least a campaign may charge: the full price less the most it may take off, in whole cents. */
export function lowestCampaignCents(fullCents: number): number {
  // The nudge keeps a share such as 0.3 from flooring a cent short in binary floating point.
  return fullCents - Math.floor(fullCents * MAX_CAMPAIGN_OFF + 1e-9);
}

function campaignItemOf(key: string): BundleId | null {
  return CAMPAIGN_ITEMS.find((item) => item === key) ?? null;
}

/** A visitor's `?c=`, or the word typed on the Sales page, as a slug; null when it can't be one. */
function slugOf(text: string | null | undefined): string | null {
  const slug = text?.trim().toLowerCase() ?? "";
  return slug.length >= SLUG_LENGTH.min && slug.length <= SLUG_LENGTH.max && SLUG.test(slug) ? slug : null;
}

/** The covered items' prices from a stored row or a checked input; anything else is left out. */
function pricesOf(value: unknown): CampaignPrices {
  const prices: CampaignPrices = {};
  if (typeof value !== "object" || value === null || Array.isArray(value)) return prices;
  for (const item of CAMPAIGN_ITEMS) {
    const cents = (value as Record<string, unknown>)[item];
    if (typeof cents === "number" && Number.isSafeInteger(cents) && cents > 0) prices[item] = cents;
  }
  return prices;
}

function toCampaign(row: CampaignRow): Campaign {
  return {
    id: row.id,
    name: row.name,
    audience: row.audience,
    slug: row.slug,
    startsOn: row.startsOn,
    endsOn: row.endsOn,
    prices: pricesOf(row.prices),
    endedAt: row.endedAt,
    createdAt: row.createdAt,
  };
}

/** Whether a campaign holds its price at this instant: on one of its days in Brussels, and before any End now. */
export function isLive(campaign: Campaign, at: Date): boolean {
  const day = brusselsDay(at);
  return (
    campaign.startsOn <= day &&
    day <= campaign.endsOn &&
    (campaign.endedAt === null || at.getTime() < campaign.endedAt.getTime())
  );
}

/**
 * The last day a campaign ran or will run: its own last day, or the day End now stopped it. Null when End now came
 * before its first day: it never ran, so it holds no day against another campaign.
 */
function lastLiveDay(campaign: Campaign): string | null {
  if (!campaign.endedAt) return campaign.endsOn;
  const ended = brusselsDay(campaign.endedAt);
  if (ended < campaign.startsOn) return null;
  return ended < campaign.endsOn ? ended : campaign.endsOn;
}

/**
 * The campaign that prices an item at this instant for this visitor, or null. Its price must still be under the
 * item's full price, so a later change to the catalogue can never make a campaign charge more than the full price.
 */
export function liveCampaignFor(
  item: CatalogueItemId,
  at: Date,
  slug: string | null | undefined,
  campaigns: readonly Campaign[],
): Campaign | null {
  const key = campaignItemOf(item);
  if (!key) return null;
  const full = itemById(item).cents;
  const visitor = slugOf(slug);
  const cents = (campaign: Campaign) => campaign.prices[key] ?? full;
  const live = campaigns.filter(
    (campaign) =>
      cents(campaign) < full &&
      isLive(campaign, at) &&
      (campaign.audience === "everyone" || (visitor !== null && campaign.slug === visitor)),
  );
  // A save lets one campaign a product run at a time, so two only meet in a row written by hand: the lower price wins.
  live.sort((a, b) => cents(a) - cents(b) || a.id.localeCompare(b.id));
  return live[0] ?? null;
}

/**
 * What one item costs at this instant (R-7.1): a live campaign's price while one runs, else the catalogue's. A caller
 * pricing several items in one request passes them the same instant, so they agree. A link-only campaign answers only
 * to its own slug, and a slug is only ever read. Single and the plans never take a campaign and cost no query.
 */
export async function priceFor(item: CatalogueItemId, at: Date, slug?: string | null): Promise<ItemPrice> {
  const fullCents = itemById(item).cents;
  const key = campaignItemOf(item);
  if (!key) return { item, cents: fullCents, fullCents, campaign: null };
  const day = brusselsDay(at);
  const rows = await db
    .select()
    .from(campaignsTable)
    .where(and(lte(campaignsTable.startsOn, day), gte(campaignsTable.endsOn, day)));
  const live = liveCampaignFor(item, at, slug, rows.map(toCampaign));
  const cents = live?.prices[key];
  if (!live || cents === undefined) return { item, cents: fullCents, fullCents, campaign: null };
  return { item, cents, fullCents, campaign: { id: live.id, name: live.name, endsOn: live.endsOn } };
}

const [COUPLE, FAMILY] = CAMPAIGN_ITEMS.map((item) => bundleById(item).name);
const PICK = `Pick ${COUPLE}, ${FAMILY} or both.`;
const OFF = `${Math.round(MAX_CAMPAIGN_OFF * 100)}%`;

export const CAMPAIGN_LINES = {
  noName: "Give the campaign a name.",
  longName: `Keep the name to ${CAMPAIGN_NAME_MAX} characters or fewer. It goes on the receipt.`,
  noItem: PICK,
  single: `${bundleById("solo").name} never has a campaign price. ${PICK}`,
  plan: `${PLANS[0].name} has no campaign prices for now. ${PICK}`,
  notCents: (product: string) => `Type the ${product} price in euros, like 45 or 44.50.`,
  notLower: (product: string, full: number) => `The ${product} price has to be under its full price of ${formatEuro(full)}.`,
  tooLow: (product: string, lowest: number) =>
    `The ${product} price can be at most ${OFF} off, so ${formatEuro(lowest)} or more.`,
  firstDay: "Pick a real date for the first day.",
  lastDay: "Pick a real date for the last day.",
  lastBeforeFirst: "The last day can't be before the first day.",
  firstDayPast: "The first day can't be before today.",
  noSlug: "A link-only campaign needs a link word.",
  badSlug: `Use ${SLUG_LENGTH.min} to ${SLUG_LENGTH.max} small letters, numbers or dashes for the link word, like spring-offer.`,
  slugTaken: "Another campaign already uses that link word. Pick a new one.",
  overlap: (product: string, other: string, from: string, to: string) =>
    `${product} already has a campaign on those days: ${other}, ${dayLabel(from)} to ${dayLabel(to)}. Pick other days.`,
  tooSoonAfter: (product: string, other: string, earliest: string) =>
    `${product} needs ${DAYS_AT_FULL_PRICE} days at full price after ${other}. Start on ${dayLabel(earliest)} or later.`,
  tooCloseBefore: (product: string, other: string, latest: string) =>
    `${product} needs ${DAYS_AT_FULL_PRICE} days at full price before ${other}. End on ${dayLabel(latest)} or earlier.`,
  notFound: "That campaign isn't on the list.",
  alreadyOver: "That campaign has already ended.",
} as const;

/**
 * Why a campaign can't be saved beside the others, or null when it can. Others are every campaign this host has
 * kept, ended ones too: a slug stays taken, and a campaign that ran still needs its 30 days at full price around it.
 */
export function campaignRefusal(
  input: CampaignInput,
  others: readonly Campaign[],
  today: string,
): CampaignRefusal | null {
  const invalid = (code: string, line: string): CampaignRefusal => ({ status: 400, code, line });
  const conflict = (code: string, line: string): CampaignRefusal => ({ status: 409, code, line });
  const L = CAMPAIGN_LINES;

  const name = input.name.trim();
  if (!name) return invalid("name_missing", L.noName);
  if (name.length > CAMPAIGN_NAME_MAX) return invalid("name_too_long", L.longName);

  const keys = Object.keys(input.prices);
  if (keys.includes("solo")) return invalid("single", L.single);
  if (keys.some((key) => PLANS.some((plan) => plan.id === key))) return invalid("plan", L.plan);
  if (keys.length === 0 || keys.some((key) => campaignItemOf(key) === null)) return invalid("no_item", L.noItem);
  const items = CAMPAIGN_ITEMS.filter((item) => keys.includes(item));
  for (const item of items) {
    const cents = input.prices[item];
    const { name: product, cents: full } = bundleById(item);
    if (!Number.isSafeInteger(cents) || cents <= 0) return invalid("price_not_cents", L.notCents(product));
    if (cents >= full) return invalid("price_not_lower", L.notLower(product, full));
    if (cents < lowestCampaignCents(full)) return invalid("price_too_low", L.tooLow(product, lowestCampaignCents(full)));
  }

  if (!isRealDay(input.startsOn)) return invalid("first_day", L.firstDay);
  if (!isRealDay(input.endsOn)) return invalid("last_day", L.lastDay);
  if (input.endsOn < input.startsOn) return invalid("last_before_first", L.lastBeforeFirst);
  if (input.startsOn < today) return invalid("first_day_past", L.firstDayPast);

  if (input.audience === "link") {
    if (!input.slug?.trim()) return invalid("slug_missing", L.noSlug);
    const slug = slugOf(input.slug);
    if (!slug) return invalid("slug_malformed", L.badSlug);
    if (others.some((other) => other.slug === slug)) return conflict("slug_taken", L.slugTaken);
  }

  for (const item of items) {
    const product = bundleById(item).name;
    for (const other of others) {
      if (other.prices[item] === undefined) continue;
      const last = lastLiveDay(other);
      if (last === null) continue;
      if (other.endedAt === null && input.startsOn <= last && other.startsOn <= input.endsOn) {
        return conflict("second_campaign", L.overlap(product, other.name, other.startsOn, last));
      }
      if (input.startsOn >= other.startsOn && input.startsOn <= addDays(last, DAYS_AT_FULL_PRICE)) {
        return conflict("too_soon", L.tooSoonAfter(product, other.name, addDays(last, DAYS_AT_FULL_PRICE + 1)));
      }
      if (input.startsOn < other.startsOn && other.startsOn <= addDays(input.endsOn, DAYS_AT_FULL_PRICE)) {
        return conflict("too_soon", L.tooCloseBefore(product, other.name, addDays(other.startsOn, -(DAYS_AT_FULL_PRICE + 1))));
      }
    }
  }
  return null;
}

/** The refusal line for a campaign beside the others, or null when it can be saved. */
export function checkCampaign(
  input: CampaignInput,
  others: readonly Campaign[],
  today: string = brusselsDay(new Date()),
): string | null {
  return campaignRefusal(input, others, today)?.line ?? null;
}

/** Every campaign this host has kept, the latest first day first. */
export async function listCampaigns(): Promise<Campaign[]> {
  const rows = await db.select().from(campaignsTable).orderBy(desc(campaignsTable.startsOn), desc(campaignsTable.createdAt));
  return rows.map(toCampaign);
}

/** Saves a campaign under its rules, or throws CampaignRefused with the line that says why not. */
export async function saveCampaign(input: CampaignInput, by: string, now: Date = new Date()): Promise<Campaign> {
  const today = brusselsDay(now);
  // What the input breaks on its own is told before any query; the others are read under the lock.
  const alone = campaignRefusal(input, [], today);
  if (alone) throw new CampaignRefused(alone.status, alone.code, alone.line);
  return db.transaction(async (tx) => {
    // Saves wait for each other, so two at once can't both pass the one-campaign-a-product rule.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended('campaigns', 0))`);
    const others = (await tx.select().from(campaignsTable)).map(toCampaign);
    const refusal = campaignRefusal(input, others, today);
    if (refusal) throw new CampaignRefused(refusal.status, refusal.code, refusal.line);
    const [row] = await tx
      .insert(campaignsTable)
      .values({
        id: randomUUID(),
        name: input.name.trim(),
        audience: input.audience,
        slug: input.audience === "link" ? slugOf(input.slug) : null,
        startsOn: input.startsOn,
        endsOn: input.endsOn,
        prices: pricesOf(input.prices),
        createdBy: by,
      })
      .returning();
    return toCampaign(row);
  });
}

/**
 * End now: buyers see the full price from this instant. Only the end is stamped, so a checkout already started keeps
 * the price, and the coupon, it was made with.
 */
export async function endCampaign(id: string, now: Date = new Date()): Promise<Campaign> {
  const [row] = await db.select().from(campaignsTable).where(eq(campaignsTable.id, id)).limit(1);
  if (!row) throw new CampaignRefused(404, "not_found", CAMPAIGN_LINES.notFound);
  const campaign = toCampaign(row);
  if (campaign.endedAt || campaign.endsOn < brusselsDay(now)) {
    throw new CampaignRefused(409, "already_ended", CAMPAIGN_LINES.alreadyOver);
  }
  const [ended] = await db
    .update(campaignsTable)
    .set({ endedAt: now, updatedAt: now })
    .where(and(eq(campaignsTable.id, id), isNull(campaignsTable.endedAt)))
    .returning();
  if (!ended) throw new CampaignRefused(409, "already_ended", CAMPAIGN_LINES.alreadyOver);
  return toCampaign(ended);
}

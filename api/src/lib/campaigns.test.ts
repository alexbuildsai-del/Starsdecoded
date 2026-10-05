/**
 * Campaigns (ADR-278, 281; MB-149; readings 5, 6): every refusal with its own line, a price by whole Brussels days, and
 * the Sales page's campaign routes behind the admin gate. The rules and the days run anywhere. The save, End now and
 * priceFor's reads run on a scratch Postgres named by WALK_DATABASE_URL, and skip without one, saying why; their
 * campaigns sit in a far year of their own, so nothing else on that database meets them.
 */
import { after, test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { AddressInfo } from "node:net";
import express from "express";

const SCRATCH = process.env.WALK_DATABASE_URL;
// Only a database handed over for this: without one the pool points nowhere, so a query past a refusal fails loudly.
process.env.DATABASE_URL = SCRATCH ?? "postgres://test:test@127.0.0.1:1/never";
process.env.OPENAI_API_KEY ??= "sk-dummy-never-sent";
process.env.LOG_LEVEL ??= "silent";
// No Stripe here: a campaign is saved and ended without one, and its coupon waits for checkout.
delete process.env.STRIPE_SECRET_KEY;
// Production's read-only flag, read when the guards load: the Sales page still saves there.
process.env.PROMPTS_READ_ONLY = "true";

const C = await import("./campaigns.js");
const { default: adminPaymentsRouter } = await import("../routes/adminPayments.js");
const { logger } = await import("./logger.js");
const { pool } = await import("@workspace/db");
const { PLANS, bundleById, formatEuro } = await import("@workspace/commerce");

type Campaign = import("./campaigns.js").Campaign;
type CampaignInput = import("./campaigns.js").CampaignInput;

const L = C.CAMPAIGN_LINES;
const COUPLE = bundleById("couple");
const FAMILY = bundleById("family");
const LOWEST = C.lowestCampaignCents(COUPLE.cents);
const TODAY = "2026-10-05";

const kept = (over: Partial<Campaign> = {}): Campaign => ({
  id: randomUUID(),
  name: "Spring offer",
  audience: "everyone",
  slug: null,
  startsOn: "2026-11-01",
  endsOn: "2026-11-14",
  prices: { couple: LOWEST + 400 },
  endedAt: null,
  createdAt: new Date("2026-10-01T10:00:00Z"),
  ...over,
});

const input = (over: Partial<CampaignInput> = {}): CampaignInput => ({
  name: "Winter offer",
  audience: "everyone",
  slug: null,
  startsOn: "2026-12-15",
  endsOn: "2026-12-31",
  prices: { couple: LOWEST + 400 },
  ...over,
});

const check = (over: Partial<CampaignInput>, others: Campaign[] = [], today = TODAY) => C.checkCampaign(input(over), others, today);

test("a save is refused at more than 25% off, on Single or a plan, and allowed at 25% exactly", () => {
  assert.equal(LOWEST, Math.ceil(COUPLE.cents * 0.75), "the most off is a quarter of the full price, in whole cents");
  assert.equal(C.lowestCampaignCents(FAMILY.cents), Math.ceil(FAMILY.cents * 0.75));
  assert.equal(check({ prices: { couple: LOWEST } }), null);
  assert.equal(check({ prices: { couple: LOWEST - 1 } }), L.tooLow(COUPLE.name, LOWEST));
  assert.match(L.tooLow(COUPLE.name, LOWEST), /at most 25% off, so €\d+(\.\d\d)? or more\.$/);
  assert.ok(L.tooLow(COUPLE.name, LOWEST).includes(formatEuro(LOWEST)));

  assert.equal(check({ prices: { solo: 2000 } }), L.single);
  assert.equal(check({ prices: { solo: 2000, couple: LOWEST } }), L.single, "Single beside an allowed product is still refused");
  for (const plan of PLANS) assert.equal(check({ prices: { [plan.id]: plan.cents - 100 } }), L.plan, plan.id);
  assert.equal(check({ prices: { family: FAMILY.cents - 100, timeline_year: 6000 } }), L.plan);
});

test("a price is whole cents under the item's full price, for Couple, Family & friends or both", () => {
  assert.equal(check({ prices: {} }), L.noItem);
  assert.equal(check({ prices: { gift: 1000 } }), L.noItem);
  for (const cents of [LOWEST + 0.5, 0, -100, Number.NaN]) assert.equal(check({ prices: { couple: cents } }), L.notCents(COUPLE.name), String(cents));
  assert.equal(check({ prices: { couple: COUPLE.cents } }), L.notLower(COUPLE.name, COUPLE.cents));
  assert.equal(check({ prices: { couple: COUPLE.cents + 100 } }), L.notLower(COUPLE.name, COUPLE.cents));
  assert.equal(check({ prices: { couple: LOWEST, family: FAMILY.cents } }), L.notLower(FAMILY.name, FAMILY.cents), "each product is checked");
  assert.equal(check({ prices: { couple: LOWEST, family: C.lowestCampaignCents(FAMILY.cents) } }), null, "both at once is allowed");
  assert.equal(check({ prices: { family: FAMILY.cents - 1 } }), null);
});

test("a name is required and kept to 40 characters, the most a Stripe coupon's name takes", () => {
  assert.equal(C.CAMPAIGN_NAME_MAX, 40);
  assert.equal(check({ name: "" }), L.noName);
  assert.equal(check({ name: "   " }), L.noName);
  assert.equal(check({ name: "x".repeat(41) }), L.longName);
  assert.equal(check({ name: "x".repeat(40) }), null);
  assert.equal(check({ name: `  ${"x".repeat(40)}  ` }), null, "the spaces around it are not part of the name");
});

test("days are real calendar days, the last not before the first and the first not before today in Brussels", () => {
  // R16-05: a rolled-over date (30 February read as 2 March) is refused, never moved.
  for (const day of ["2026-02-30", "2026-11-31", "2027-02-29", "2026-13-01", "2026-00-10", "2026-1-5", "05/11/2026", "2026-11-05T00:00", ""]) {
    assert.equal(check({ startsOn: day }), L.firstDay, `first ${day}`);
    assert.equal(check({ endsOn: day }), L.lastDay, `last ${day}`);
  }
  assert.equal(check({ startsOn: "2028-02-29", endsOn: "2028-03-01" }), null, "a leap day is a real day");
  assert.equal(check({ startsOn: "2026-12-15", endsOn: "2026-12-14" }), L.lastBeforeFirst);
  assert.equal(check({ startsOn: "2026-12-15", endsOn: "2026-12-15" }), null, "one day is a campaign");
  assert.equal(check({ startsOn: "2026-10-04", endsOn: "2026-10-20" }), L.firstDayPast);
  assert.equal(check({ startsOn: TODAY, endsOn: "2026-10-20" }), null, "it can start today");
});

test("a link-only campaign needs its own well-formed link word, taken by no other campaign, ended ones too", () => {
  const link = (slug: string | null) => ({ audience: "link" as const, slug });
  assert.equal(check(link(null)), L.noSlug);
  assert.equal(check(link("   ")), L.noSlug);
  for (const slug of ["Spring Offer", "-spring", "spring-", "spring--offer", "spring_offer", "spring!", "ab", "x".repeat(33)]) {
    assert.equal(check(link(slug)), L.badSlug, slug);
  }
  assert.equal(check(link("spring-offer")), null);
  assert.equal(check(link("x".repeat(32))), null);
  assert.equal(check(link(" Spring-Offer ")), null, "the word is read in small letters");

  const autumn = kept({ audience: "link", slug: "spring-offer", startsOn: "2026-05-01", endsOn: "2026-05-14", endedAt: new Date("2026-05-03T09:00:00Z") });
  assert.equal(check(link("spring-offer"), [autumn]), L.slugTaken);
  assert.equal(check(link("SPRING-offer"), [autumn]), L.slugTaken);
  assert.equal(check({ audience: "everyone", slug: "spring-offer" }, [autumn]), null, "an everyone campaign keeps no word");
});

test("one live campaign a product: a second on the same days is refused, another product's is not", () => {
  const spring = kept({ startsOn: "2026-12-20", endsOn: "2027-01-05" });
  const line = L.overlap(COUPLE.name, spring.name, spring.startsOn, spring.endsOn);
  assert.equal(check({}, [spring]), line);
  assert.match(line, /^Couple already has a campaign on those days: Spring offer, 20 Dec 2026 to 5 Jan 2027\. Pick other days\.$/);
  assert.equal(check({ prices: { family: FAMILY.cents - 100 } }, [spring]), null, "Family & friends has no campaign then");
  assert.equal(check({ prices: { couple: LOWEST, family: FAMILY.cents - 100 } }, [spring]), line, "both products: Couple is taken");
  const linkOnly = kept({ audience: "link", slug: "podcast", startsOn: "2026-12-20", endsOn: "2027-01-05" });
  assert.equal(check({}, [linkOnly]), L.overlap(COUPLE.name, linkOnly.name, linkOnly.startsOn, linkOnly.endsOn), "a link-only campaign counts");
});

test("MB-149: 30 whole days at full price between two campaigns on a product, after one and before the next", () => {
  const spring = kept({ startsOn: "2026-11-01", endsOn: "2026-11-14" });
  assert.equal(check({ startsOn: "2026-11-15", endsOn: "2026-11-20" }, [spring]), L.tooSoonAfter(COUPLE.name, spring.name, "2026-12-15"));
  assert.equal(check({ startsOn: "2026-12-14", endsOn: "2026-12-31" }, [spring]), L.tooSoonAfter(COUPLE.name, spring.name, "2026-12-15"));
  assert.equal(check({ startsOn: "2026-12-15", endsOn: "2026-12-31" }, [spring]), null, "15 November to 14 December is 30 days at full price");
  assert.match(L.tooSoonAfter(COUPLE.name, spring.name, "2026-12-15"), /^Couple needs 30 days at full price after Spring offer\. Start on 15 Dec 2026 or later\.$/);

  const winter = kept({ name: "Winter offer", startsOn: "2026-12-15", endsOn: "2026-12-20" });
  assert.equal(check({ name: "Early", startsOn: "2026-11-01", endsOn: "2026-11-14" }, [winter]), null);
  assert.equal(
    check({ name: "Early", startsOn: "2026-11-01", endsOn: "2026-11-15" }, [winter]),
    L.tooCloseBefore(COUPLE.name, winter.name, "2026-11-14"),
  );

  const both = kept({ prices: { couple: LOWEST, family: FAMILY.cents - 100 } });
  assert.equal(check({ prices: { family: FAMILY.cents - 100 }, startsOn: "2026-11-20", endsOn: "2026-11-30" }, [both]), L.tooSoonAfter(FAMILY.name, both.name, "2026-12-15"));
  assert.equal(check({ prices: { family: FAMILY.cents - 100 } }, [kept()]), null, "the 30 days are per product");
});

test("a campaign ended early counts to the day it was ended, and one ended before its first day counts not at all", () => {
  // Ended at noon on 10 November in Brussels: it ran from the 1st to the 10th.
  const cut = kept({ startsOn: "2026-11-01", endsOn: "2026-11-30", endedAt: new Date("2026-11-10T11:00:00Z") });
  assert.equal(check({ startsOn: "2026-11-10", endsOn: "2026-11-20" }, [cut], "2026-11-10"), L.tooSoonAfter(COUPLE.name, cut.name, "2026-12-11"));
  assert.equal(check({ startsOn: "2026-12-10", endsOn: "2026-12-20" }, [cut], "2026-11-10"), L.tooSoonAfter(COUPLE.name, cut.name, "2026-12-11"));
  assert.equal(check({ startsOn: "2026-12-11", endsOn: "2026-12-20" }, [cut], "2026-11-10"), null);

  const never = kept({ startsOn: "2026-11-01", endsOn: "2026-11-14", endedAt: new Date("2026-10-20T10:00:00Z") });
  assert.equal(check({ startsOn: "2026-11-01", endsOn: "2026-11-14" }, [never]), null, "it never ran, so it holds no day");
});

test("every refusal reads its own line", () => {
  const spring = kept({ startsOn: "2026-12-20", endsOn: "2027-01-05" });
  const lines = [
    check({ name: "" }),
    check({ name: "x".repeat(41) }),
    check({ prices: {} }),
    check({ prices: { solo: 2000 } }),
    check({ prices: { timeline_month: 899 } }),
    check({ prices: { couple: 0.5 } }),
    check({ prices: { couple: COUPLE.cents } }),
    check({ prices: { couple: LOWEST - 1 } }),
    check({ startsOn: "2026-02-30" }),
    check({ endsOn: "2026-02-30" }),
    check({ endsOn: "2026-12-01" }),
    check({ startsOn: "2026-10-01" }),
    check({ audience: "link", slug: null }),
    check({ audience: "link", slug: "No Good" }),
    check({ audience: "link", slug: "podcast" }, [kept({ audience: "link", slug: "podcast", startsOn: "2026-01-01", endsOn: "2026-01-02" })]),
    check({}, [spring]),
    check({ startsOn: "2026-11-20" }, [kept()]),
    check({ startsOn: "2026-11-01", endsOn: "2026-11-30" }, [kept({ startsOn: "2026-12-20", endsOn: "2026-12-24" })]),
  ];
  for (const line of lines) assert.equal(typeof line, "string");
  assert.equal(new Set(lines).size, lines.length, lines.join("\n"));
  for (const line of lines as string[]) assert.doesNotMatch(line, /[;!—]/, `plain punctuation: ${line}`);
});

test("the day is Brussels's, across both clock changes", () => {
  assert.equal(C.brusselsDay(new Date("2026-03-28T22:59:59Z")), "2026-03-28");
  assert.equal(C.brusselsDay(new Date("2026-03-28T23:00:00Z")), "2026-03-29");
  assert.equal(C.brusselsDay(new Date("2026-03-29T21:59:59Z")), "2026-03-29", "summer time from 02:00 that night");
  assert.equal(C.brusselsDay(new Date("2026-03-29T22:00:00Z")), "2026-03-30");
  assert.equal(C.brusselsDay(new Date("2026-10-25T22:59:59Z")), "2026-10-25", "winter time from 03:00 that night");
  assert.equal(C.brusselsDay(new Date("2026-10-25T23:00:00Z")), "2026-10-26");
});

test("R16-01: a campaign holds its price from 00:00 on its first day to 23:59 on its last in Brussels, then stops", () => {
  const live = (campaign: Campaign, at: string, slug?: string | null) => C.liveCampaignFor("couple", new Date(at), slug, [campaign])?.id ?? null;
  const winter = kept({ startsOn: "2026-11-01", endsOn: "2026-11-14" });
  assert.equal(live(winter, "2026-10-31T22:59:59Z"), null, "23:59:59 the day before");
  assert.equal(live(winter, "2026-10-31T23:00:00Z"), winter.id, "00:00 on the first day");
  assert.equal(live(winter, "2026-11-14T22:59:00Z"), winter.id, "23:59 on the last day");
  assert.equal(live(winter, "2026-11-14T22:59:59.999Z"), winter.id);
  assert.equal(live(winter, "2026-11-14T23:00:00Z"), null, "00:00 the day after");

  const summer = kept({ startsOn: "2026-07-01", endsOn: "2026-07-31" });
  assert.equal(live(summer, "2026-07-31T21:59:00Z"), summer.id, "23:59 summer time on the last day");
  assert.equal(live(summer, "2026-07-31T22:00:00Z"), null, "00:00 summer time the day after");

  const turning = kept({ startsOn: "2026-10-20", endsOn: "2026-10-25" });
  assert.equal(live(turning, "2026-10-25T22:59:00Z"), turning.id, "23:59 on a last day the clocks went back");
  assert.equal(live(turning, "2026-10-25T23:00:00Z"), null);
});

test("a link-only campaign prices only a visitor with its word; End now stops it at that instant", () => {
  const live = (campaign: Campaign, at: string, slug?: string | null) => C.liveCampaignFor("couple", new Date(at), slug, [campaign])?.id ?? null;
  const podcast = kept({ audience: "link", slug: "podcast" });
  const at = "2026-11-05T12:00:00Z";
  assert.equal(live(podcast, at), null);
  assert.equal(live(podcast, at, null), null);
  assert.equal(live(podcast, at, "spring"), null);
  assert.equal(live(podcast, at, "podcast"), podcast.id);
  assert.equal(live(podcast, at, " Podcast "), podcast.id);

  const everyone = kept();
  assert.equal(live(everyone, at, "anything"), everyone.id, "an everyone campaign prices every visitor, a word or none");
  const stopped = kept({ endedAt: new Date("2026-11-05T12:00:00Z") });
  assert.equal(live(stopped, "2026-11-05T11:59:59.999Z"), stopped.id);
  assert.equal(live(stopped, "2026-11-05T12:00:00Z"), null);
});

test("Single and the plans never take a campaign, and a price not under the full one is never charged", () => {
  const at = new Date("2026-11-05T12:00:00Z");
  const handWritten = kept({ prices: { solo: 1000, couple: COUPLE.cents + 500 } as Campaign["prices"] });
  assert.equal(C.liveCampaignFor("solo", at, null, [handWritten]), null);
  assert.equal(C.liveCampaignFor("couple", at, null, [handWritten]), null);
  for (const plan of PLANS) assert.equal(C.liveCampaignFor(plan.id, at, null, [kept()]), null);
  const two = [kept({ id: "b", prices: { couple: LOWEST + 100 } }), kept({ id: "a", prices: { couple: LOWEST } })];
  assert.equal(C.liveCampaignFor("couple", at, null, two)?.id, "a", "two rows written by hand: the lower price");
});

test("priceFor answers Single and the plans at the catalogue's price without a query", async () => {
  // The pool points nowhere without a scratch database, so a query here would fail the test.
  for (const id of ["solo", ...PLANS.map((plan) => plan.id)] as const) {
    const item = id === "solo" ? bundleById("solo") : PLANS.find((plan) => plan.id === id);
    assert.deepEqual(await C.priceFor(id, new Date(), "podcast"), { item: id, cents: item?.cents, fullCents: item?.cents, campaign: null });
  }
});

const NO_DB = SCRATCH ? false : "no WALK_DATABASE_URL: saving, ending and pricing campaigns read and write a scratch Postgres";

/** Each run's own year, far off, so its campaigns meet nothing else on the database and none of an earlier run. */
const YEAR = 2200 + Math.floor(Math.random() * 700);
const day = (monthDay: string) => `${YEAR}-${monthDay}`;
const madeHere: string[] = [];
const run = randomUUID().slice(0, 8);
const ADMIN = `user_admin_${run}`;

if (SCRATCH) {
  after(async () => {
    await pool.query("delete from purchases where campaign_id = any($1)", [madeHere]);
    await pool.query("delete from campaigns where id = any($1) or created_by = $2", [madeHere, ADMIN]);
    await pool.end();
  });
}

async function save(over: Partial<CampaignInput>, now?: Date) {
  const campaign = await C.saveCampaign(input(over), ADMIN, now);
  madeHere.push(campaign.id);
  return campaign;
}

test("a saved campaign prices its product on its days, at the last day's 23:59 and not at 00:00 after", { skip: NO_DB }, async () => {
  const saved = await save({ name: "  Far spring  ", startsOn: day("11-01"), endsOn: day("11-14"), prices: { couple: LOWEST } });
  assert.equal(saved.name, "Far spring");
  assert.deepEqual(saved.prices, { couple: LOWEST });
  assert.equal(saved.slug, null);
  assert.equal(saved.endedAt, null);
  const stored = await pool.query("select created_by, starts_on::text, ends_on::text, prices, coupons from campaigns where id = $1", [saved.id]);
  assert.deepEqual(stored.rows[0], { created_by: ADMIN, starts_on: day("11-01"), ends_on: day("11-14"), prices: { couple: LOWEST }, coupons: {} });

  const campaign = { id: saved.id, name: "Far spring", endsOn: day("11-14") };
  const lastMinute = await C.priceFor("couple", new Date(`${day("11-14")}T22:59:00Z`));
  assert.deepEqual(lastMinute, { item: "couple", cents: LOWEST, fullCents: COUPLE.cents, campaign });
  assert.deepEqual(await C.priceFor("couple", new Date(`${day("11-14")}T23:00:00Z`)), {
    item: "couple", cents: COUPLE.cents, fullCents: COUPLE.cents, campaign: null,
  });
  assert.deepEqual(await C.priceFor("family", new Date(`${day("11-05")}T12:00:00Z`)), {
    item: "family", cents: FAMILY.cents, fullCents: FAMILY.cents, campaign: null,
  }, "Family & friends is not in it");
  assert.notEqual(lastMinute.fullCents, COUPLE.fullCents, "the full price is Couple's own, never the Singles total");
  assert.ok((await C.listCampaigns()).some((c) => c.id === saved.id));

  await assert.rejects(save({ name: "Overlap", startsOn: day("11-10"), endsOn: day("11-20") }), (err: unknown) => {
    assert.ok(err instanceof C.CampaignRefused);
    assert.equal(err.status, 409);
    assert.equal(err.message, L.overlap(COUPLE.name, "Far spring", day("11-01"), day("11-14")));
    return true;
  });
  await assert.rejects(save({ name: "Too soon", startsOn: day("12-14"), endsOn: day("12-20") }), /needs 30 days at full price after Far spring/);
  const later = await save({ name: "Far winter", startsOn: day("12-15"), endsOn: day("12-20") });
  assert.equal(later.startsOn, day("12-15"));
});

test("a link-only campaign prices only its link, and its word stays taken", { skip: NO_DB }, async () => {
  const slug = `far-${run}`;
  const saved = await save({ name: "Far link", audience: "link", slug: slug.toUpperCase(), startsOn: day("03-01"), endsOn: day("03-07"), prices: { family: FAMILY.cents - 600 } });
  assert.equal(saved.slug, slug);
  const at = new Date(`${day("03-04")}T12:00:00Z`);
  assert.equal((await C.priceFor("family", at)).campaign, null);
  assert.equal((await C.priceFor("family", at, "someone-else")).campaign, null);
  assert.equal((await C.priceFor("family", at, slug)).cents, FAMILY.cents - 600);
  await assert.rejects(save({ name: "Same word", audience: "link", slug, startsOn: day("08-01"), endsOn: day("08-02") }), (err: unknown) => {
    assert.ok(err instanceof C.CampaignRefused);
    assert.equal(err.message, L.slugTaken);
    return true;
  });
});

test("End now gives the full price from that instant and leaves a checkout already started at its price", { skip: NO_DB }, async () => {
  const saved = await save({ name: "Far autumn", startsOn: day("09-01"), endsOn: day("09-30"), prices: { couple: LOWEST + 200 } });
  const purchaseId = randomUUID();
  await pool.query(
    `insert into purchases (id, user_id, kind, item, cents, full_cents, campaign_id, stripe_session_id, tick_hash, ticked_at, return_to, status, is_test)
     values ($1, $2, 'bundle', 'couple', $3, $4, $5, $6, 'tick', now(), '/dashboard', 'open', true)`,
    [purchaseId, `user_buyer_${run}`, LOWEST + 200, COUPLE.cents, saved.id, `cs_test_${run}`],
  );
  const endedAt = new Date(`${day("09-10")}T08:30:00Z`);
  const ended = await C.endCampaign(saved.id, endedAt);
  assert.equal(ended.endedAt?.toISOString(), endedAt.toISOString());
  assert.equal((await C.priceFor("couple", new Date(endedAt.getTime() - 1))).cents, LOWEST + 200);
  assert.deepEqual((await C.priceFor("couple", endedAt)).campaign, null);

  const purchase = await pool.query("select cents, full_cents, campaign_id, status from purchases where id = $1", [purchaseId]);
  assert.deepEqual(purchase.rows[0], { cents: LOWEST + 200, full_cents: COUPLE.cents, campaign_id: saved.id, status: "open" });
  const row = await pool.query("select coupons from campaigns where id = $1", [saved.id]);
  assert.deepEqual(row.rows[0].coupons, {}, "no coupon is touched");

  await assert.rejects(C.endCampaign(saved.id, endedAt), (err: unknown) => err instanceof C.CampaignRefused && err.status === 409 && err.message === L.alreadyOver);
  await assert.rejects(C.endCampaign(randomUUID()), (err: unknown) => err instanceof C.CampaignRefused && err.status === 404 && err.message === L.notFound);
});

test("a campaign ended before its first day never ran, so another may take its days", { skip: NO_DB }, async () => {
  const early = await save({ name: "Far early", startsOn: day("06-01"), endsOn: day("06-14") });
  await C.endCampaign(early.id);
  const again = await save({ name: "Far again", startsOn: day("06-01"), endsOn: day("06-14") });
  assert.equal(again.startsOn, day("06-01"));
});

/** The Sales page's routes behind a stand-in for the session and sign-in, as app.ts stands them. */
async function serve(t: TestContext, adminUserId: string | undefined) {
  const before = process.env.ADMIN_USER_ID;
  if (adminUserId) process.env.ADMIN_USER_ID = adminUserId;
  else delete process.env.ADMIN_USER_ID;
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.userId = req.header("x-user") || null;
    req.log = logger;
    next();
  });
  app.use(adminPaymentsRouter);
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.on("listening", () => resolve()));
  t.after(() => {
    if (before === undefined) delete process.env.ADMIN_USER_ID;
    else process.env.ADMIN_USER_ID = before;
    server.closeAllConnections();
    return new Promise<void>((resolve) => server.close(() => resolve()));
  });
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  return async (method: string, path: string, user?: string, body?: unknown) => {
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (user) headers["x-user"] = user;
    const res = await fetch(`${base}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    const text = await res.text();
    return { status: res.status, body: text ? JSON.parse(text) : null };
  };
}

test("the campaign routes sit behind the admin gate", async (t) => {
  const closed = await serve(t, undefined);
  assert.equal((await closed("GET", "/admin/campaigns", ADMIN)).status, 503);
  const call = await serve(t, ADMIN);
  for (const user of [undefined, "user_someone_else"]) {
    assert.equal((await call("GET", "/admin/campaigns", user)).status, 403);
    assert.equal((await call("POST", "/admin/campaigns", user, input())).status, 403);
    assert.equal((await call("POST", "/admin/campaigns/x/end", user)).status, 403);
  }
});

test("a refused save answers its line, on production's read-only host too, before any query", async (t) => {
  const call = await serve(t, ADMIN);
  const single = await call("POST", "/admin/campaigns", ADMIN, input({ prices: { solo: 2000 } }));
  assert.deepEqual(single, { status: 400, body: { error: "single", message: L.single } });
  const malformed = await call("POST", "/admin/campaigns", ADMIN, { ...input(), prices: "lots" });
  assert.equal(malformed.status, 400);
  assert.equal(malformed.body.error, "validation_error");
  assert.equal((await call("POST", "/admin/campaigns", ADMIN, { ...input(), audience: "friends" })).status, 400);
});

test("the Sales page's shapes: campaigns listed, saved and ended", { skip: NO_DB }, async (t) => {
  const call = await serve(t, ADMIN);
  const body = input({ name: "Far route", startsOn: day("01-10"), endsOn: day("01-12"), prices: { couple: LOWEST + 50, family: FAMILY.cents - 50 } });
  const saved = await call("POST", "/admin/campaigns", ADMIN, body);
  assert.equal(saved.status, 201);
  madeHere.push(saved.body.campaign.id);
  const { createdAt, id, ...rest } = saved.body.campaign;
  assert.match(createdAt, /^\d{4}-\d\d-\d\dT/);
  assert.equal(typeof id, "string");
  assert.deepEqual(rest, {
    name: "Far route", audience: "everyone", slug: null, startsOn: day("01-10"), endsOn: day("01-12"),
    prices: { couple: LOWEST + 50, family: FAMILY.cents - 50 }, endedAt: null,
  });
  const listed = await call("GET", "/admin/campaigns", ADMIN);
  assert.equal(listed.status, 200);
  assert.ok(listed.body.campaigns.some((c: { id: string }) => c.id === id));

  const second = await call("POST", "/admin/campaigns", ADMIN, { ...body, name: "Far second" });
  assert.equal(second.status, 409);
  assert.deepEqual(Object.keys(second.body).sort(), ["error", "message"]);
  assert.match(second.body.message, /^Couple already has a campaign on those days: Far route/);

  const ended = await call("POST", `/admin/campaigns/${id}/end`, ADMIN);
  assert.equal(ended.status, 200);
  assert.match(ended.body.campaign.endedAt, /^\d{4}-\d\d-\d\dT/);
  assert.deepEqual(await call("POST", `/admin/campaigns/${id}/end`, ADMIN), { status: 409, body: { error: "already_ended", message: L.alreadyOver } });
  assert.deepEqual(await call("POST", `/admin/campaigns/${randomUUID()}/end`, ADMIN), { status: 404, body: { error: "not_found", message: L.notFound } });
});

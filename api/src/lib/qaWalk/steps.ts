/**
 * The staging walk's map of the shared step list (api/src/walk/steps.ts; ADR-279, 314, 315): what each step that isn't
 * local does on the live site as Mira and Idris, through the live API from their signed-in pages, and the one screen it
 * reads once its calls are done. Keyed by the list's own ids, so a step added there fails typecheck here until it is
 * walked or says why it is local.
 *
 * A stored step has two halves. A Release's walk writes the report for real, one try; a deploy's walk has the seed
 * copied in instead (reading 11). Both then check the report the same way. A Release's pair also lands on its loading
 * screen as Make it does, and opens with Start reading once written (ADR-336, 393). Balances on staging depend on what
 * is stored, so every step names what changes and checks it against the ledger it reads, never a typed balance.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { z } from "zod";
import {
  ClaimInviteResponse,
  CreateCompatibilityReportResponse,
  CreateGiftResponse,
  CreateReportResponse,
  GetCheckoutResponse,
  GetCreditHistoryResponse,
  GetCreditsResponse,
  GetHomeResponse,
  GetInviteResponse,
  GetReportResponse,
  GetTimelineAccessResponse,
  SendCompatibilityResponse,
  ShareBackResponse,
  ShareMyReportResponse,
} from "@workspace/api-zod";
import { bundleById, PLANS, type PlanId } from "@workspace/commerce";
import type { QaWalkMode } from "@workspace/db";
import { QA_CREDITS, QA_PAIR, type QaRole } from "../qaPair.js";
import type { StagingStepId, StoredStepId } from "../../walk/steps.js";
import type { ApiAnswer, WalkPage, WriteRoute } from "./browser.js";

export interface Credits {
  available: number;
  used: number;
  held: number;
}

/** One of the pair as the walk plays them: their account and their signed-in tab. */
export interface Actor {
  role: QaRole;
  name: string;
  email: string;
  userId: string;
  page: WalkPage;
}

/** Stripe as the walk drives it: a test clock and its customer, a refund, and the plan's renewal and cancel. */
export interface WalkStripe {
  /** A clock frozen at now, once Stripe says it is ready. */
  makeClock(name: string): Promise<string>;
  makeCustomer(clock: string, email: string, name: string): Promise<string>;
  /** Moves the clock on, and waits until every renewal the move caused is done. */
  advance(clock: string, to: Date): Promise<void>;
  /** Deleting the clock deletes its customer and the customer's plans with it. */
  deleteClock(clock: string): Promise<void>;
  refund(paymentIntent: string): Promise<void>;
  /** The customer's newest plan and the end of its current period. */
  subscriptionOf(customer: string): Promise<{ id: string; status: string; periodEnd: Date } | null>;
  cancelAtPeriodEnd(subscription: string): Promise<void>;
}

/** What the walk reads or sets in the database that no reader's API call shows. */
export interface WalkLedger {
  /** Checkout bills the account's stored customer (reading 1), so this points it at the walk's clock's. */
  useCustomer(userId: string, customer: string): Promise<void>;
  /** Once its clock is gone the customer is too, so the account forgets it and its next checkout makes a new one. */
  forgetCustomer(userId: string, customer: string): Promise<void>;
  /** The payment a refund of the purchase names. */
  paymentOf(purchase: string): Promise<string | null>;
  /** The purchase's credits still in the buyer's hands, as a refund counts them (reading 3). */
  unusedOf(purchase: string): Promise<{ available: number; held: number }>;
  /** Whether our receipt went: null until it is tried. */
  receiptOf(purchase: string): Promise<boolean | null>;
}

/** What a step hands on to the steps after it. A link stays here and never reaches a finding. */
export interface Kept {
  clock?: { id: string; customer: string | null };
  purchase?: string;
  miraReport?: { id: string; profileId: string };
  idrisReport?: { id: string; profileId: string };
  giftLink?: string;
  pair?: string;
}

export interface WalkTimes {
  /** Between two reads of something that changes on its own. */
  poll: number;
  /** How long a webhook may take to reach the ledger. */
  webhook: number;
  /** How long a report a Release's walk writes may take. */
  report: number;
  /** How long a second grant would take to land if the webhook granted twice. */
  once: number;
}

export type Method = "GET" | "POST";

export interface Walk {
  readonly mode: QaWalkMode;
  readonly mira: Actor;
  readonly idris: Actor;
  readonly stripe: WalkStripe;
  readonly ledger: WalkLedger;
  readonly kept: Kept;
  readonly times: WalkTimes;
  /** A call to the live API from the reader's signed-in page. */
  call(who: Actor, method: Method, path: string, body?: unknown): Promise<ApiAnswer>;
  /** The walk's own write, through the door every write passes (reading 17). */
  write(who: Actor, path: WriteRoute, body: unknown): Promise<ApiAnswer>;
  /** Something wrong a reader would meet that doesn't stop the step, as an email that didn't go. */
  note(title: string, detail: string): void;
  /** Reads until `done` holds, or fails the step naming what it waited for. */
  until<T>(what: string, read: () => Promise<T>, done: (value: T) => boolean, ms: number): Promise<T>;
  pause(ms: number): Promise<void>;
}

export interface LiveStep {
  /** Live steps this one stands on, beyond the reports the list says it reads: it waits with them for a seed. */
  after?: readonly StagingStepId[];
  run(walk: Walk): Promise<void>;
}

export interface StoredStep {
  /** A Release's walk: the report written for real, one try, after the free dry render. */
  write(walk: Walk): Promise<string>;
  /** Either walk: the report as its readers meet it, written now or copied in from the seed. */
  check(walk: Walk, reportId: string): Promise<void>;
}

export type StagingSteps = { readonly [K in StagingStepId]: K extends StoredStepId ? StoredStep : LiveStep };

export function isStored(step: LiveStep | StoredStep): step is StoredStep {
  return "write" in step;
}

const CREDITS_SHEET = "/dashboard?open=credits";
const ACCOUNT = "/dashboard/account";
const GIFT_NOTE = "Happy birthday. Love, Mira.";
const FAMILY = bundleById("family");
const YEARLY = planById("timeline_year");
// The year's invoice is drafted at the period's end and paid within the hour, so two days on it is paid.
const PAST_PERIOD_MS = 2 * 86_400_000;

function planById(id: PlanId) {
  const plan = PLANS.find((row) => row.id === id);
  if (!plan) throw new Error(`the catalogue has no ${id}`);
  return plan;
}

function firstName(who: Actor): string {
  return who.name.split(" ")[0];
}

/** The sheet's own title over a balance: the web's words, so the screen is read as a reader reads it. */
export function creditsHeading(available: number): string {
  if (available <= 0) return "No credits left";
  return `${available} ${available === 1 ? "credit" : "credits"} to use`;
}

function said(body: unknown): string {
  if (!body || typeof body !== "object") return "";
  const { error, message } = body as { error?: unknown; message?: unknown };
  const parts = [typeof error === "string" ? error : null, typeof message === "string" ? `"${message}"` : null].filter(Boolean);
  return parts.length ? ` (${parts.join(" ")})` : "";
}

function expectStatus(answer: ApiAnswer, status: number, what: string): unknown {
  if (answer.status !== status) throw new Error(`${what}: answered ${answer.status}${said(answer.body)}, not ${status}`);
  return answer.body;
}

function parsed<T>(schema: z.ZodType<T>, body: unknown, what: string): T {
  const result = schema.safeParse(body);
  if (result.success) return result.data;
  const where = result.error.issues.slice(0, 3).map((issue) => issue.path.join(".") || "the body");
  throw new Error(`${what} came back in a shape the contract doesn't have (${where.join(", ")})`);
}

/**
 * A report or a dashboard is read by the few fields the step checks, so a change elsewhere in that large answer, which
 * the buyer walk's contract checks already guard, never fails the walk on the live site.
 */
function fieldsOf<T extends object>(body: unknown, what: string): Partial<T> {
  if (!body || typeof body !== "object") throw new Error(`${what} came back empty`);
  return body as Partial<T>;
}

function same(what: string, got: unknown, want: unknown): void {
  if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`${what}: read ${JSON.stringify(got)}, not ${JSON.stringify(want)}`);
}

function need<T>(value: T | undefined | null, what: string): T {
  if (value === undefined || value === null) throw new Error(`${what} isn't there: the step that makes it didn't pass`);
  return value;
}

type ReportView = Pick<
  z.infer<typeof GetReportResponse>,
  "id" | "name" | "type" | "status" | "profileId" | "lens" | "access" | "send" | "participants"
>;
type HomeView = Pick<z.infer<typeof GetHomeResponse>, "you" | "teaser" | "week">;
type Access = z.infer<typeof GetTimelineAccessResponse>;

async function credits(walk: Walk, who: Actor): Promise<Credits> {
  const what = `${firstName(who)}'s balance`;
  const body = parsed(GetCreditsResponse, expectStatus(await walk.call(who, "GET", "/api/credits"), 200, what), what);
  return { available: body.available, used: body.used, held: body.held ?? 0 };
}

async function newestLine(walk: Walk, who: Actor) {
  const what = `${firstName(who)}'s History`;
  const lines = parsed(GetCreditHistoryResponse, expectStatus(await walk.call(who, "GET", "/api/credits/history"), 200, what), what);
  return need(lines[0], what);
}

async function accessOf(walk: Walk, who: Actor): Promise<Access> {
  const what = `${firstName(who)}'s Timeline access`;
  return parsed(GetTimelineAccessResponse, expectStatus(await walk.call(who, "GET", "/api/timeline/access"), 200, what), what);
}

async function purchaseOf(walk: Walk, who: Actor, purchase: string) {
  const what = "the purchase";
  return parsed(GetCheckoutResponse, expectStatus(await walk.call(who, "GET", `/api/checkout/${purchase}`), 200, what), what);
}

async function homeOf(walk: Walk, who: Actor): Promise<Partial<HomeView>> {
  const what = `${firstName(who)}'s dashboard`;
  return fieldsOf<HomeView>(expectStatus(await walk.call(who, "GET", "/api/home"), 200, what), what);
}

async function readReport(walk: Walk, who: Actor, id: string, what: string): Promise<Partial<ReportView>> {
  return fieldsOf<ReportView>(expectStatus(await walk.call(who, "GET", `/api/reports/${id}`), 200, what), what);
}

/**
 * Signs in and checks the API knows who it is: signed out, a balance still reads as none and a write still answers
 * 402, so neither would show a sign-in that never reached the API.
 */
async function signIn(walk: Walk, who: Actor): Promise<Access> {
  await who.page.signIn(who.email);
  return accessOf(walk, who);
}

async function hiddenFrom(walk: Walk, who: Actor, id: string, what: string): Promise<void> {
  expectStatus(await walk.call(who, "GET", `/api/reports/${id}`), 404, what);
}

async function reportCount(walk: Walk, who: Actor, what: string): Promise<number> {
  const body = expectStatus(await walk.call(who, "GET", "/api/reports"), 200, what);
  if (!Array.isArray(body)) throw new Error(`${what}: the answer holds no list of reports`);
  return body.length;
}

/** The token a claim link carries; it is used, never written down. */
function tokenOf(link: string): string {
  const token = new URL(link).searchParams.get("token");
  if (!token) throw new Error("the claim link carries no token");
  return token;
}

/** A gift's two share questions, the giver's at the gift and its claimer's at the claim (ADR-331). */
interface GiftAnswers {
  giverShares: boolean;
  shareBack: boolean;
}

/**
 * Idris's road says Not now to both, as the buyer walk's does, so Share and Share yours back keep steps of their own
 * here; the Yes on both sides is Hanna's, who has no account on staging.
 */
const NOT_NOW: GiftAnswers = { giverShares: false, shareBack: false };

/**
 * The cover is read before the claim, as the reader opens the link first, so a link that shows the wrong thing fails
 * there. Only a giver's Yes puts "Share yours back when it's ready?" on a cover. A gift claims with its claimer's
 * answer, Not now sent as a stated false, and a send or a share with none, as the claim page does.
 */
async function claimLink(walk: Walk, who: Actor, link: string, kind: "gift" | "share" | "send", answers: GiftAnswers = NOT_NOW) {
  const token = encodeURIComponent(tokenOf(link));
  const cover = parsed(GetInviteResponse, expectStatus(await walk.call(who, "GET", `/api/invites/${token}`), 200, `the ${kind}'s cover`), `the ${kind}'s cover`);
  same(`the ${kind}'s cover`, [cover.kind, cover.alreadyClaimed, cover.giverShares], [kind, false, kind === "gift" && answers.giverShares]);
  const answer = kind === "gift" ? { shareBack: answers.shareBack } : undefined;
  const claimed = parsed(
    ClaimInviteResponse,
    expectStatus(await walk.call(who, "POST", `/api/invites/${token}/claim`, answer), 200, `the ${kind}'s claim`),
    `the ${kind}'s claim`,
  );
  same(`the ${kind}'s claim`, claimed.kind, kind);
  return claimed;
}

function delivered(walk: Walk, sent: boolean, what: string): void {
  if (!sent) walk.note(`${what} wasn't delivered`, "the API answered emailDelivered false, so the email never reached its reader");
}

interface SamplePerson {
  birthDate: string;
  birthTime: string;
  birthTimeWindowMinutes?: number;
  latitude: number;
  longitude: number;
  timezoneOffset: number;
  timezone: string;
}

const PEOPLE = join("fixtures", "sample-people");

/** The sample person's birth data, as the site, the buyer walk and the seed read it (R-3.1). */
function samplePerson(role: QaRole): SamplePerson {
  // Railway starts the API in api/, and a test runs anywhere below the root.
  for (const dir of [process.cwd(), join(process.cwd(), ".."), join(process.cwd(), "..", "..")]) {
    const path = join(dir, PEOPLE, `${role}.json`);
    if (existsSync(path)) return JSON.parse(readFileSync(path, "utf8")) as SamplePerson;
  }
  throw new Error(`no ${PEOPLE}/${role}.json beside the process`);
}

/** The body the birth form posts, so a write on the live site meets the checks a reader's own write meets. */
export function ownBirthForm(role: QaRole): Record<string, unknown> {
  const person = samplePerson(role);
  return {
    name: QA_PAIR[role].name,
    birthDate: person.birthDate,
    birthTime: person.birthTime,
    birthTimeWindowMinutes: person.birthTimeWindowMinutes ?? 0,
    birthPlace: QA_PAIR[role].place,
    latitude: person.latitude,
    longitude: person.longitude,
    timezoneOffset: person.timezoneOffset,
    timezone: person.timezone,
    isForSelf: true,
  };
}

/** A report is written after POST answers, so the step waits on its status as the page does. */
async function written(walk: Walk, who: Actor, id: string): Promise<void> {
  const status = await walk.until(
    "the report to finish",
    async () => fieldsOf<{ status: string }>(expectStatus(await walk.call(who, "GET", `/api/reports/${id}/status`), 200, "the report's status"), "the report's status").status,
    (now) => now === "complete" || now === "failed",
    walk.times.report,
  );
  if (status !== "complete") throw new Error("the report failed, and a Release's walk writes each report once with no Try again");
}

/** One credit is taken as the write starts, before a word of it is written (ADR-275). */
function tookOne(before: Credits, after: Credits, what: string): void {
  same(`${what}: the balance as the write starts`, [after.available, after.used], [before.available - 1, before.used + 1]);
}

async function writeOwnReport(walk: Walk, who: Actor): Promise<string> {
  const before = await credits(walk, who);
  const what = `${firstName(who)}'s Personal report`;
  const made = parsed(CreateReportResponse, expectStatus(await walk.write(who, "/api/reports", ownBirthForm(who.role)), 201, what), what);
  tookOne(before, await credits(walk, who), what);
  await written(walk, who, made.id);
  return made.id;
}

async function checkOwnReport(walk: Walk, who: Actor, id: string): Promise<{ id: string; profileId: string }> {
  const what = `${firstName(who)}'s Personal report`;
  const read = await readReport(walk, who, id, what);
  same(what, [read.access, read.type, read.status, read.name], ["owner", "natal", "complete", who.name]);
  const home = await homeOf(walk, who);
  same(`${firstName(who)}'s dashboard`, home.you?.reportId, id);
  await who.page.screen(`/report/${id}`, { title: [who.name, "Personal Report"] });
  return { id, profileId: need(read.profileId, `${what}'s chart`) };
}

/** The sheet's heading over the balance the API reads: the screen and the ledger agree. */
async function sheetShows(who: Actor, available: number, open: boolean): Promise<void> {
  await who.page.screen(open ? CREDITS_SHEET : null, { heading: creditsHeading(available), inDialog: true });
}

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

export const STAGING_STEPS: StagingSteps = {
  "sign-in": {
    async run(walk) {
      const { mira } = walk;
      // Signed out, paying and Timeline both ask for an account first (reading 1).
      const buy = await walk.call(mira, "POST", "/api/checkout", { item: FAMILY.id, ticked: true, returnTo: CREDITS_SHEET });
      expectStatus(buy, 401, "a checkout signed out");
      expectStatus(await walk.call(mira, "GET", "/api/timeline/access"), 401, "Timeline signed out");
      await signIn(walk, mira);
      // The reset's state (reading 10): Mira's test credits, no report, an empty dashboard.
      const balance = await credits(walk, mira);
      same("Mira's balance after the reset", balance, { available: QA_CREDITS.mira, used: 0, held: 0 });
      same("Mira's reports after the reset", await reportCount(walk, mira, "Mira's reports after the reset"), 0);
      same("Mira's own chart after the reset", (await homeOf(walk, mira)).you ?? null, null);
      // The reset's top-up is a bundle of several credits, so the dashboard alone would open its path over everything;
      // the credits sheet holds the path back and shows the balance as she reads it.
      await sheetShows(mira, balance.available, true);
    },
  },

  buy: {
    async run(walk) {
      const { mira } = walk;
      // A customer can't leave a test clock (Round start 4d), so each walk makes a fresh clock and customer, and checkout
      // bills that customer from here on: the plan's renewal and its end are then the clock's to move.
      const clock: { id: string; customer: string | null } = { id: await walk.stripe.makeClock(`Stars Decoded staging walk (${walk.mode})`), customer: null };
      walk.kept.clock = clock;
      clock.customer = await walk.stripe.makeCustomer(clock.id, mira.email, mira.name);
      await walk.ledger.useCustomer(mira.userId, clock.customer);

      const before = await credits(walk, mira);
      const purchase = await mira.page.pay(FAMILY.id, CREDITS_SHEET, { path: CREDITS_SHEET, link: `Buy ${FAMILY.name}`, inDialog: true });
      walk.kept.purchase = purchase;
      const state = await purchaseOf(walk, mira, purchase);
      same("the purchase", [state.status, state.item, state.credits, state.returnTo], ["granted", FAMILY.id, FAMILY.credits, CREDITS_SHEET]);
      const after = await credits(walk, mira);
      same("Mira's balance after paying", after.available, before.available + FAMILY.credits);
      // Once: a replay or the session's async twin adds nothing more (ADR-275).
      await walk.pause(walk.times.once);
      same("Mira's balance a moment later", (await credits(walk, mira)).available, after.available);
      const line = await newestLine(walk, mira);
      same("History's newest line", [line.kind, line.count], ["bought", FAMILY.credits]);
      const receipt = await walk
        .until("our receipt to be tried", () => walk.ledger.receiptOf(purchase), (sent) => sent !== null, walk.times.webhook)
        .catch(() => null);
      if (receipt !== true) walk.note("our receipt wasn't delivered", receipt === false ? "Resend didn't take it" : "it was never sent");
      await sheetShows(mira, after.available, false);
    },
  },

  "own-report": {
    write: (walk) => writeOwnReport(walk, walk.mira),
    async check(walk, reportId) {
      walk.kept.miraReport = await checkOwnReport(walk, walk.mira, reportId);
    },
  },

  gift: {
    async run(walk) {
      const { mira, idris } = walk;
      const before = await credits(walk, mira);
      const body = { recipientName: firstName(idris), email: idris.email, note: GIFT_NOTE, shareOwn: NOT_NOW.giverShares };
      const gift = parsed(CreateGiftResponse, expectStatus(await walk.call(mira, "POST", "/api/gifts", body), 201, "the gift"), "the gift");
      same("the gift", [gift.state, gift.creditHeld], ["waiting", true]);
      delivered(walk, gift.emailDelivered, "the gift's email");
      walk.kept.giftLink = gift.claimUrl;
      const after = await credits(walk, mira);
      same("Mira's balance with the gift out", [after.available, after.held], [before.available - 1, before.held + 1]);
      await sheetShows(mira, after.available, true);
    },
  },

  "gift-claimed": {
    async run(walk) {
      const { mira, idris } = walk;
      const link = need(walk.kept.giftLink, "the gift's link");
      // He signs in from the email's link, and his balance holds nothing until the claim.
      await signIn(walk, idris);
      const [hers, his] = [await credits(walk, mira), await credits(walk, idris)];
      same("Idris's balance before the claim", his, { available: 0, used: 0, held: 0 });
      const claimed = await claimLink(walk, idris, link, "gift", NOT_NOW);
      same("the gift's claim", claimed.redirectTo, "/dashboard");
      const hisNow = await credits(walk, idris);
      same("Idris's balance after the claim", hisNow.available, his.available + 1);
      // The held credit leaves Mira's hands, so her available balance stays and her held one drops.
      const hersNow = await credits(walk, mira);
      same("Mira's balance after the claim", [hersNow.available, hersNow.held], [hers.available, hers.held - 1]);
      await sheetShows(idris, hisNow.available, true);
    },
  },

  "idris-report": {
    // His balance holds the gift's credit alone, so the gift pays for it.
    write: (walk) => writeOwnReport(walk, walk.idris),
    async check(walk, reportId) {
      walk.kept.idrisReport = await checkOwnReport(walk, walk.idris, reportId);
    },
  },

  "no-credit": {
    async run(walk) {
      const { idris } = walk;
      const balance = await credits(walk, idris);
      // Reading 17: the one write a deploy's walk asks for, and only once his report has taken the gift's credit, so
      // the 402 answers before anything is written.
      if (balance.available !== 0 || balance.held !== 0) {
        throw new Error(`Idris holds ${balance.available} credits and ${balance.held} held, so the walk won't ask to write`);
      }
      const before = await reportCount(walk, idris, "Idris's reports before the 402");
      const asked = await walk.write(idris, "/api/reports", { ...ownBirthForm("mira"), isForSelf: false });
      const refusal = fieldsOf<{ error: string; message: string }>(expectStatus(asked, 402, "Idris's write with no credit"), "the 402");
      same("the 402", refusal.error, "no_credit");
      if (typeof refusal.message !== "string" || !refusal.message.trim()) throw new Error("the 402 carries no line for the reader");
      same("Idris's reports after the 402", await reportCount(walk, idris, "Idris's reports after the 402"), before);
      same("Idris's balance after the 402", await credits(walk, idris), balance);
      await idris.page.screen("/dashboard", { control: "Get credits" });
    },
  },

  share: {
    async run(walk) {
      const { mira, idris } = walk;
      const hers = need(walk.kept.miraReport, "Mira's Personal report");
      await hiddenFrom(walk, idris, hers.id, "Mira's report before she shares it");
      const shared = parsed(
        ShareMyReportResponse,
        expectStatus(await walk.call(mira, "POST", "/api/shares", { email: idris.email }), 201, "Mira's share"),
        "Mira's share",
      );
      delivered(walk, shared.emailDelivered, "the share's email");
      await claimLink(walk, idris, shared.claimUrl, "share");
      const read = await readReport(walk, idris, hers.id, "Mira's report as Idris reads it");
      same("Mira's report as Idris reads it", [read.access, read.status], ["shared", "complete"]);
      await idris.page.screen(`/report/${hers.id}`, { title: [mira.name, "Personal Report"] });
    },
  },

  "share-back": {
    // Share yours back answers someone who shared first, so it waits with Mira's share.
    after: ["share"],
    async run(walk) {
      const { mira, idris } = walk;
      const hers = need(walk.kept.miraReport, "Mira's Personal report");
      const his = need(walk.kept.idrisReport, "Idris's Personal report");
      await hiddenFrom(walk, mira, his.id, "Idris's report before he shares it back");
      const back = parsed(
        ShareBackResponse,
        expectStatus(await walk.call(idris, "POST", "/api/shares/back", { profileId: hers.profileId }), 201, "Idris's share back"),
        "Idris's share back",
      );
      same("Idris's share back", back.state, "active");
      const read = await readReport(walk, mira, his.id, "Idris's report as Mira reads it");
      same("Idris's report as Mira reads it", [read.access, read.status], ["shared", "complete"]);
      await mira.page.screen(`/report/${his.id}`, { title: [idris.name, "Personal Report"] });
    },
  },

  pair: {
    async write(walk) {
      const { mira, idris } = walk;
      const hers = need(walk.kept.miraReport, "Mira's Personal report");
      const his = need(walk.kept.idrisReport, "Idris's Personal report");
      const before = await credits(walk, mira);
      // What the picker's Make it posts. Mira is the child and Idris the parent, as the seed's pair is (R17-09).
      const body = { reportAId: hers.id, reportBId: his.id, lens: "parent_child", parent: "B" };
      const what = "the parent and child report";
      const made = parsed(CreateCompatibilityReportResponse, expectStatus(await walk.write(mira, "/api/compatibility", body), 201, what), what);
      tookOne(before, await credits(walk, mira), what);
      // Make it lands on the pair's loading screen (ADR-336), which holds on Start reading once the pair is written
      // (ADR-393), so her tab waits there and taps it.
      await mira.page.screen(`/compatibility/${made.id}`, { loading: true });
      await written(walk, mira, made.id);
      await mira.page.screen(null, { opened: [firstName(mira), firstName(idris), "Compatibility Report"] });
      return made.id;
    },
    async check(walk, reportId) {
      const { mira, idris } = walk;
      const what = "the parent and child report";
      const read = await readReport(walk, mira, reportId, what);
      same(what, [read.access, read.type, read.lens, read.status], ["owner", "compatibility", "parent_child", "complete"]);
      same(`${what}'s two people`, (read.participants ?? []).map((p) => p.name).sort(), [mira.name, idris.name].sort());
      walk.kept.pair = reportId;
      await mira.page.screen(`/compatibility/${reportId}`, { title: [firstName(mira), firstName(idris), "Compatibility Report"] });
    },
  },

  "pair-shared": {
    async run(walk) {
      const { mira, idris } = walk;
      const pair = need(walk.kept.pair, "the parent and child report");
      // ADR-285: Idris holds his own chart, shared with Mira, so the pair goes to him as any send does.
      same("the pair's Send", (await readReport(walk, mira, pair, "the pair")).send?.state, "can_send");
      await hiddenFrom(walk, idris, pair, "the pair before Mira shares it");
      const what = "the pair's send";
      const sent = parsed(
        SendCompatibilityResponse,
        expectStatus(await walk.call(mira, "POST", `/api/compatibility/${pair}/send`, { email: idris.email }), 201, what),
        what,
      );
      same(what, sent.state, "invited");
      const invite = need(sent.invite, "the pair's link");
      delivered(walk, invite.emailDelivered, "the pair's email");
      const claimed = await claimLink(walk, idris, invite.claimUrl, "send");
      // Nothing changes hands: the claim makes his side a participant and lands on the pair.
      same("the pair's claim", [claimed.profileId, claimed.redirectTo], [null, `/compatibility/${pair}`]);
      const read = await readReport(walk, idris, pair, "the pair as Idris reads it");
      same("the pair as Idris reads it", [read.access, read.status], ["participant", "complete"]);
      await idris.page.screen(`/compatibility/${pair}`, { title: [firstName(mira), firstName(idris), "Compatibility Report"] });
    },
  },

  refund: {
    async run(walk) {
      const { mira, idris } = walk;
      const purchase = need(walk.kept.purchase, "the Family & friends purchase");
      const payment = need(await walk.ledger.paymentOf(purchase), "the purchase's payment");
      const unused = await walk.ledger.unusedOf(purchase);
      const [hers, his] = [await credits(walk, mira), await credits(walk, idris)];
      await walk.stripe.refund(payment);
      await walk.until("the refund to reach the purchase", () => purchaseOf(walk, mira, purchase), (state) => state.status === "refunded", walk.times.webhook);
      // Reading 3: what she still held goes; a used credit stays used, and the one Idris claimed stays his.
      const after = await credits(walk, mira);
      same("Mira's balance after the refund", after, { available: hers.available - unused.available, used: hers.used, held: hers.held - unused.held });
      same("Idris's balance after the refund", await credits(walk, idris), his);
      const taken = unused.available + unused.held;
      if (taken > 0) {
        const line = await newestLine(walk, mira);
        same("History's newest line", [line.kind, line.count], ["refunded", taken]);
      }
      await sheetShows(mira, after.available, true);
    },
  },

  timeline: {
    async run(walk) {
      const { mira } = walk;
      const clock = need(walk.kept.clock, "the walk's test clock");
      const customer = need(clock.customer, "the test clock's customer");
      const closed = await accessOf(walk, mira);
      same("Mira's Timeline before she starts it", [closed.access, closed.hasPersonalReport], [false, true]);
      const before = await credits(walk, mira);

      await mira.page.pay(YEARLY.id, ACCOUNT);
      const opened = await walk.until(
        "Timeline to open for Mira",
        () => accessOf(walk, mira),
        (now) => now.access && now.source === "subscription" && now.plan?.item === YEARLY.id && Boolean(now.plan?.renewsOn),
        walk.times.webhook,
      );
      const firstEnd = need(opened.plan?.renewsOn, "the plan's renewal day");
      // The yearly plan opens with a credit to give (ADR-277), read in History as "With Timeline".
      const given = await walk.until(
        "the plan's credit to give",
        () => credits(walk, mira),
        (now) => now.available === before.available + YEARLY.creditsToGive,
        walk.times.webhook,
      );
      same("History's newest line", (await newestLine(walk, mira)).kind, "granted");
      await mira.page.screen(ACCOUNT, { control: "Cancel Timeline" });

      // One advance per renewal (Round start 4d), a little past the period's end.
      const plan = need(await walk.stripe.subscriptionOf(customer), "the plan in Stripe");
      await walk.stripe.advance(clock.id, new Date(plan.periodEnd.getTime() + PAST_PERIOD_MS));
      const renewed = await walk.until(
        "the plan to renew",
        () => accessOf(walk, mira),
        (now) => now.access && (now.plan?.renewsOn ?? "") > firstEnd,
        walk.times.webhook,
      );
      const nextEnd = need(renewed.plan?.renewsOn, "the renewed plan's day");
      const days = daysBetween(firstEnd, nextEnd);
      if (days < 360 || days > 370) throw new Error(`the plan renewed for ${days} days, not a year`);
      // Each paid year brings its own credit to give.
      await walk.until(
        "the renewed year's credit",
        () => credits(walk, mira),
        (now) => now.available === given.available + YEARLY.creditsToGive,
        walk.times.webhook,
      );
    },
  },

  "timeline-ends": {
    // The plan she cancels is the one the Timeline step started and renewed on the walk's clock.
    after: ["timeline"],
    async run(walk) {
      const { mira, idris } = walk;
      const clock = need(walk.kept.clock, "the walk's test clock");
      const customer = need(clock.customer, "the test clock's customer");
      const plan = need(await walk.stripe.subscriptionOf(customer), "the plan in Stripe");
      const renewsOn = need((await accessOf(walk, mira)).plan?.renewsOn, "the renewed plan's day");

      await walk.stripe.cancelAtPeriodEnd(plan.id);
      await walk.until(
        "the cancel to reach the plan",
        () => accessOf(walk, mira),
        (now) => now.access && now.plan?.renewsOn === null && now.plan?.endsOn === renewsOn,
        walk.times.webhook,
      );
      const ending = need(await walk.stripe.subscriptionOf(customer), "the plan in Stripe");
      await walk.stripe.advance(clock.id, new Date(ending.periodEnd.getTime() + PAST_PERIOD_MS));
      const closed = await walk.until(
        "Timeline to close at the period's end",
        () => accessOf(walk, mira),
        (now) => !now.access && !now.plan,
        walk.times.webhook,
      );
      // Closed, her Account page offers Timeline again, which her own finished report allows (reading 1).
      same("Mira's Timeline once it closes", closed.hasPersonalReport, true);
      await mira.page.screen(ACCOUNT, { control: "Start Timeline" });

      // Idris never had a plan: his door stays shut, and his own report keeps the teaser on his dashboard.
      same("Idris's Timeline", (await accessOf(walk, idris)).access, false);
      if (walk.kept.idrisReport) {
        const home = await homeOf(walk, idris);
        same("Idris's dashboard", [Boolean(home.teaser), Boolean(home.week)], [true, false]);
      }
    },
  },
};

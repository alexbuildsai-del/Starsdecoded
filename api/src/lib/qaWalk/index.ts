/**
 * The staging walk (ADR-279, 314, 315; R-4.4): the Owner's flow on the live staging site as the QA pair, Mira and
 * Idris, in Chromium on Railway, down the shared step list (api/src/walk/steps.ts) in its order. Live steps run on the
 * live site, paying in Stripe's sandbox with the test card, with the plan's renewal and end on a test clock that is
 * deleted at the end. A stored step writes its report only in a Release's walk, one try; a deploy's walk copies in the
 * seed the last Release kept, or waits for the first with every step that reads it (reading 11). So a deploy spends
 * nothing: its one call to a route that writes is Idris's at a zero balance, which the 402 answers (reading 17).
 *
 * The verdict lists every step of the list with how it went, and findings that carry no email, token, link or Clerk
 * id, since /api/qa/latest shows them to anyone (R14-14). No Chromium on the image is `unconfigured`, never a crash.
 * Staging only: the walk refuses anywhere else, on APP_ENV alone and never on a request (R13-08).
 */
import { and, eq, sql } from "drizzle-orm";
import type Stripe from "stripe";
import {
  db,
  bundlesTable,
  creditsTable,
  inviteTokensTable,
  purchasesTable,
  testersTable,
  usersTable,
  type QaWalkMode,
  type QaWalkStatus,
} from "@workspace/db";
import { STAGING_STEP_IDS, STEPS, mapProblem, seedsFor, type StagingStepId, type StepId, type StoredStepId } from "../../walk/steps.js";
import { readAppEnv } from "../appEnv.js";
import { logger } from "../logger.js";
import { findChromium } from "../qaAgent/browser.js";
import { ensureQaPair, placeSeed, resetQaPair, type QaPair, type QaRole } from "../qaPair.js";
import { stripe as stripeFor } from "../stripe.js";
import { publicWebBase } from "../waitlist.js";
import { SpendGuard, chromiumWalkBrowser, type WalkBrowser, type WalkPage, type WalkSession } from "./browser.js";
import {
  STAGING_STEPS,
  isStored,
  type Actor,
  type Kept,
  type Walk,
  type WalkLedger,
  type WalkStripe,
  type WalkTimes,
} from "./steps.js";

export { STAGING_STEPS };
export type { WalkBrowser, WalkLedger, WalkStripe, WalkTimes };

export type QaWalkStepStatus = "pass" | "fail" | "stored" | "local" | "not_run";

export interface QaWalkStep {
  id: StepId;
  label: string;
  status: QaWalkStepStatus;
  reason?: string;
  ms: number;
}

export interface QaWalkFinding {
  /** Null for what concerns the whole walk rather than one step. */
  step: StepId | null;
  title: string;
  detail: string;
}

export interface QaWalkVerdict {
  status: Exclude<QaWalkStatus, "running">;
  steps: QaWalkStep[];
  findings: QaWalkFinding[];
}

/** Why the walk can't run on this host at all. */
export interface Unconfigured {
  unconfigured: string;
}

export interface QaPairDoors {
  ensure(): Promise<QaPair>;
  reset(pair: QaPair): Promise<void>;
  place(pair: QaPair, step: StoredStepId): Promise<string | null>;
}

export interface QaWalkDeps {
  env: NodeJS.ProcessEnv;
  browser: WalkBrowser | Unconfigured;
  stripe: WalkStripe | Unconfigured;
  ledger: WalkLedger;
  pair: QaPairDoors;
  times: WalkTimes;
  sleep(ms: number): Promise<void>;
}

export interface QaWalkInput {
  mode: QaWalkMode;
  signal?: AbortSignal;
  /** Tests and rehearsals swap these; each default is the live one. */
  deps?: Partial<QaWalkDeps>;
}

export const WAITING_LINE = "waiting for the first Release to write it";
const STORED_LINE = "copied from the report the last Release wrote";
const AFTER_FAILURE_LINE = "an earlier step failed";
const STOPPED_LINE = "the walk was stopped before it finished";
const WHOLE_WALK = null;

const LIVE_TIMES: WalkTimes = { poll: 2_000, webhook: 120_000, report: 20 * 60_000, once: 5_000 };
// Stripe moves a clock on in the background; a year of one plan takes it seconds, now and then minutes.
const CLOCK_MS = 5 * 60_000;

const SCRUBS: ReadonlyArray<readonly [RegExp, string]> = [
  [/\b[a-z][a-z0-9+.-]*:\/\/[^\s"'<>]+/gi, "[link]"],
  [/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "[email]"],
  [/\beyJ[\w-]*\.[\w-]+\.[\w-]+/g, "[token]"],
  [/\b(?:user|sess|sia|client|org|idn|inv|ins|sms|email|phone|dvb)_[A-Za-z0-9]{6,}/g, "[id]"],
  [/\b(?:sk|rk|pk)_(?:test|live)_\w+|\bwhsec_\w+/g, "[key]"],
  [/\b(token|ticket|secret)=[^\s&"']+/gi, "$1=[token]"],
  // What is left that is long and unbroken is a token, a secret or an id.
  [/[A-Za-z0-9_-]{24,}/g, "[token]"],
];

/**
 * A finding's words with no email, link, token, key or Clerk id left in them, read by the value itself wherever it
 * sits, never by the key it came under (R14-14).
 */
export function cleanText(text: string, max = 300): string {
  let out = text.replace(/[\u0000-\u001f\u007f]+/g, " ");
  for (const [pattern, mark] of SCRUBS) out = out.replace(pattern, mark);
  out = out.replace(/\s+/g, " ").trim();
  return out.length > max ? `${out.slice(0, max - 1)}…` : out;
}

function messageOf(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** A failure's words split where they name what went wrong: "Mira's balance: read 20, not 25". */
function findingOf(step: StepId | null, err: unknown, fallback: string): QaWalkFinding {
  const text = messageOf(err);
  const at = text.indexOf(": ");
  const title = at > 0 && at < 80 ? text.slice(0, at) : fallback;
  const detail = at > 0 && at < 80 ? text.slice(at + 2) : text;
  return { step, title: cleanText(title, 120), detail: cleanText(detail) };
}

/** A failed step's reason, its finding in one line, as the Failures tab shows it. */
function lineOf(finding: QaWalkFinding): string {
  return cleanText(`${finding.title}: ${finding.detail}`);
}

function isUnconfigured(value: object): value is Unconfigured {
  return "unconfigured" in value;
}

async function sleepFor(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

type Until = <T>(what: string, read: () => Promise<T>, done: (value: T) => boolean, ms: number) => Promise<T>;

function untilWith(poll: number, sleep: (ms: number) => Promise<void>, signal?: AbortSignal): Until {
  return async (what, read, done, ms) => {
    const end = Date.now() + ms;
    for (;;) {
      if (signal?.aborted) throw new Error(STOPPED_LINE);
      const value = await read();
      if (done(value)) return value;
      if (Date.now() >= end) throw new Error(`waited ${Math.max(1, Math.round(ms / 1000))} s for ${what}`);
      await sleep(poll);
    }
  };
}

/** Only what the walk asks of Stripe, so a test stands Stripe in with these few calls. */
export function stripeWalkDoors(client: Stripe, until: Until): WalkStripe {
  const clocks = client.testHelpers.testClocks;
  const settle = async (id: string) => {
    // An advance runs on Stripe's side; the clock reads ready once every renewal it caused is done (Round start 4d).
    const clock = await until("the test clock to be ready", () => clocks.retrieve(id), (now) => now.status !== "advancing", CLOCK_MS);
    if (clock.status !== "ready") throw new Error(`the test clock stopped as ${clock.status}`);
  };
  return {
    async makeClock(name) {
      const clock = await clocks.create({ frozen_time: Math.floor(Date.now() / 1000), name });
      await settle(clock.id);
      return clock.id;
    },
    async makeCustomer(clock, email, name) {
      const customer = await client.customers.create({ email, name, test_clock: clock });
      return customer.id;
    },
    async advance(clock, to) {
      await clocks.advance(clock, { frozen_time: Math.floor(to.getTime() / 1000) });
      await settle(clock);
    },
    async deleteClock(clock) {
      await clocks.del(clock);
    },
    async refund(paymentIntent) {
      await client.refunds.create({ payment_intent: paymentIntent, reason: "requested_by_customer" });
    },
    async subscriptionOf(customer) {
      const { data } = await client.subscriptions.list({ customer, status: "all", limit: 1 });
      const plan = data[0];
      if (!plan) return null;
      // Since the basil API a period's end sits on each item, not on the subscription.
      const end = Math.max(...plan.items.data.map((item) => item.current_period_end));
      return { id: plan.id, status: plan.status, periodEnd: new Date(end * 1000) };
    },
    async cancelAtPeriodEnd(subscription) {
      await client.subscriptions.update(subscription, { cancel_at_period_end: true });
    },
  };
}

export const dbWalkLedger: WalkLedger = {
  async useCustomer(userId, customer) {
    // Checkout bills whichever customer the account names, so this repoints only a QA account, and only on staging.
    const appEnv = readAppEnv();
    if (appEnv !== "staging") throw new Error(`the walk's customer is set on staging alone, so it is refused on ${appEnv}`);
    const moved = await db
      .update(usersTable)
      .set({ stripeCustomerId: customer, updatedAt: new Date() })
      .where(
        and(
          eq(usersTable.id, userId),
          sql`exists (select 1 from ${testersTable} where ${testersTable.userId} = ${usersTable.id} and ${testersTable.qa} is not null)`,
        ),
      )
      .returning({ id: usersTable.id });
    if (moved.length === 0) throw new Error("only one of the QA pair's accounts takes the walk's customer");
  },
  async forgetCustomer(userId, customer) {
    await db
      .update(usersTable)
      .set({ stripeCustomerId: null, updatedAt: new Date() })
      .where(and(eq(usersTable.id, userId), eq(usersTable.stripeCustomerId, customer)));
  },
  async paymentOf(purchase) {
    const [row] = await db
      .select({ intent: purchasesTable.stripePaymentIntent })
      .from(purchasesTable)
      .where(eq(purchasesTable.id, purchase))
      .limit(1);
    return row?.intent ?? null;
  },
  async unusedOf(purchase) {
    // As takeBack counts them: the buyer's own available credits, and the ones held for a gift no one has claimed.
    const [row] = await db
      .select({
        available: sql<number>`count(*) filter (where ${creditsTable.status} = 'available')`.mapWith(Number),
        held: sql<number>`count(*) filter (where ${creditsTable.status} = 'held' and exists (
          select 1 from ${inviteTokensTable}
          where ${inviteTokensTable.creditId} = ${creditsTable.id}
            and ${inviteTokensTable.createdByUserId} = ${creditsTable.userId}
            and ${inviteTokensTable.kind} = 'gift'
            and ${inviteTokensTable.claimedAt} is null
        ))`.mapWith(Number),
      })
      .from(creditsTable)
      .innerJoin(bundlesTable, eq(creditsTable.bundleId, bundlesTable.id))
      .where(and(eq(bundlesTable.purchaseId, purchase), eq(creditsTable.userId, bundlesTable.userId)));
    return { available: row?.available ?? 0, held: row?.held ?? 0 };
  },
  async receiptOf(purchase) {
    const [row] = await db
      .select({ sent: purchasesTable.receiptDelivered })
      .from(purchasesTable)
      .where(eq(purchasesTable.id, purchase))
      .limit(1);
    return row?.sent ?? null;
  },
};

/** Chromium on the image and Clerk's two keys, or why the walk can't run here. */
export function liveWalkBrowser(env: NodeJS.ProcessEnv = process.env): WalkBrowser | Unconfigured {
  const executablePath = findChromium(env);
  if (!executablePath) return { unconfigured: "no Chromium on this image (MB-77); set QA_BROWSER_PATH or add chromium to nixpacks.toml" };
  const publishableKey = env.CLERK_PUBLISHABLE_KEY?.trim();
  const secretKey = env.CLERK_SECRET_KEY?.trim();
  if (!publishableKey || !secretKey) return { unconfigured: "Clerk's keys aren't set here, so the pair can't sign in" };
  return chromiumWalkBrowser({ executablePath, webOrigin: publicWebBase(env), clerk: { publishableKey, secretKey } });
}

const LIVE_PAIR: QaPairDoors = { ensure: ensureQaPair, reset: resetQaPair, place: placeSeed };

/** Every step's status and reason when nothing ran, for a walk that couldn't start. */
function nothingRan(reason: string): QaWalkStep[] {
  return STEPS.map((step): QaWalkStep =>
    step.staging === "local"
      ? { id: step.id, label: step.label, status: "local", reason: step.reason, ms: 0 }
      : { id: step.id, label: step.label, status: "not_run", reason, ms: 0 },
  );
}

/** The stored steps a step's report or the reports it reads come from, through the live steps it stands on too. */
function seedsNeeded(id: StagingStepId): StoredStepId[] {
  const entry = STAGING_STEPS[id];
  const after = isStored(entry) ? [] : (entry.after ?? []);
  return [...new Set([...seedsFor(id), ...after.flatMap((step) => seedsFor(step))])];
}

function verdictOf(steps: QaWalkStep[], findings: QaWalkFinding[]): QaWalkVerdict {
  const status = steps.some((step) => step.status === "fail")
    ? "fail"
    : steps.some((step) => step.status === "not_run")
      ? "unseeded"
      : "pass";
  return { status, steps, findings };
}

function unconfiguredVerdict(reason: string): QaWalkVerdict {
  return {
    status: "unconfigured",
    steps: nothingRan(reason),
    findings: [{ step: WHOLE_WALK, title: "the walk can't run on this host", detail: cleanText(reason) }],
  };
}

/**
 * Walks the list once. Mira and Idris are found or made, and put back at the walk's start, before the browser opens;
 * the first step that fails stops the rest, which read `not_run`; the clock is deleted and the browser closed whatever
 * happened. Only a Release's walk writes a report.
 */
export async function runQaWalk(input: QaWalkInput): Promise<QaWalkVerdict> {
  const over = input.deps ?? {};
  const env = over.env ?? process.env;
  const appEnv = readAppEnv(env);
  if (appEnv !== "staging") throw new Error(`the staging walk pays, resets accounts and writes, so it is refused on ${appEnv}`);

  const times = over.times ?? LIVE_TIMES;
  const sleep = over.sleep ?? sleepFor;
  const until = untilWith(times.poll, sleep, input.signal);
  const mismatch = mapProblem(STAGING_STEPS, STAGING_STEP_IDS);
  if (mismatch) {
    return verdictOf(nothingRan(mismatch), [{ step: WHOLE_WALK, title: "the walk can't start", detail: cleanText(mismatch) }]);
  }
  const browser = over.browser ?? liveWalkBrowser(env);
  if (isUnconfigured(browser)) return unconfiguredVerdict(browser.unconfigured);
  const client = over.stripe ? null : stripeFor(env);
  const stripe = over.stripe ?? (client ? stripeWalkDoors(client, until) : { unconfigured: "Stripe has no key this host may use" });
  if (isUnconfigured(stripe)) return unconfiguredVerdict(stripe.unconfigured);

  return walkTheList({
    mode: input.mode,
    signal: input.signal,
    browser,
    stripe,
    ledger: over.ledger ?? dbWalkLedger,
    pair: over.pair ?? LIVE_PAIR,
    times,
    sleep,
    until,
  });
}

interface WalkRun {
  mode: QaWalkMode;
  signal?: AbortSignal;
  browser: WalkBrowser;
  stripe: WalkStripe;
  ledger: WalkLedger;
  pair: QaPairDoors;
  times: WalkTimes;
  sleep(ms: number): Promise<void>;
  until: Until;
}

async function walkTheList(run: WalkRun): Promise<QaWalkVerdict> {
  const guard = new SpendGuard(run.mode);
  const steps: QaWalkStep[] = [];
  const findings: QaWalkFinding[] = [];
  const kept: Kept = {};
  // The step a note belongs to.
  let current: StepId | null = WHOLE_WALK;

  const walkOf = (pair: QaPair, session: WalkSession): Walk => {
    const actor = (role: QaRole, page: WalkPage): Actor => ({ role, ...pair[role], page });
    return {
      mode: run.mode,
      mira: actor("mira", session.mira),
      idris: actor("idris", session.idris),
      stripe: run.stripe,
      ledger: run.ledger,
      kept,
      times: run.times,
      call: (who, method, path, body) => who.page.api(method, path, body),
      async write(who, path, body) {
        guard.arm(path);
        try {
          return await who.page.api("POST", path, body);
        } finally {
          guard.disarm();
        }
      },
      note(title, detail) {
        findings.push({ step: current, title: cleanText(title, 120), detail: cleanText(detail) });
      },
      until: run.until,
      async pause(ms) {
        if (run.signal?.aborted) throw new Error(STOPPED_LINE);
        await run.sleep(ms);
      },
    };
  };

  const runStep = async (id: StagingStepId, walk: Walk, pair: QaPair): Promise<"pass" | "stored" | "waiting"> => {
    const entry = STAGING_STEPS[id];
    if (!isStored(entry)) {
      await entry.run(walk);
      return "pass";
    }
    if (run.mode === "release") {
      await entry.check(walk, await entry.write(walk));
      return "pass";
    }
    const placed = await run.pair.place(pair, id as StoredStepId);
    if (!placed) return "waiting";
    await entry.check(walk, placed);
    return "stored";
  };

  let pair: QaPair | null = null;
  let session: WalkSession | null = null;
  let startError: unknown = null;
  try {
    pair = await run.pair.ensure();
    await run.pair.reset(pair);
    session = await run.browser.open(guard);
  } catch (err) {
    startError = err;
  }

  try {
    const walk = pair && session ? walkOf(pair, session) : null;
    const waiting = new Set<StoredStepId>();
    let stopped = false;
    for (const listed of STEPS) {
      const base = { id: listed.id, label: listed.label };
      if (listed.staging === "local") {
        steps.push({ ...base, status: "local", reason: listed.reason, ms: 0 });
        continue;
      }
      if (stopped) {
        steps.push({ ...base, status: "not_run", reason: AFTER_FAILURE_LINE, ms: 0 });
        continue;
      }
      const id: StagingStepId = listed.id;
      if (!walk || !pair) {
        // The pair or the browser couldn't be made ready, so the walk stops at its first step.
        const finding = findingOf(id, startError, "the walk couldn't start");
        steps.push({ ...base, status: "fail", reason: lineOf(finding), ms: 0 });
        findings.push(finding);
        stopped = true;
        continue;
      }
      if (seedsNeeded(id).some((seed) => waiting.has(seed))) {
        steps.push({ ...base, status: "not_run", reason: WAITING_LINE, ms: 0 });
        continue;
      }
      current = id;
      const started = Date.now();
      const refusedBefore = guard.refused.length;
      try {
        if (run.signal?.aborted) throw new Error(STOPPED_LINE);
        const outcome = await runStep(id, walk, pair);
        const refused = [...new Set(guard.refused.slice(refusedBefore))];
        if (refused.length > 0) throw new Error(`the page asked for ${refused.join(", ")}, which a walk never lets through`);
        const ms = Date.now() - started;
        if (outcome === "waiting") {
          waiting.add(id as StoredStepId);
          steps.push({ ...base, status: "not_run", reason: WAITING_LINE, ms });
        } else if (outcome === "stored") {
          steps.push({ ...base, status: "stored", reason: STORED_LINE, ms });
        } else {
          steps.push({ ...base, status: "pass", ms });
        }
      } catch (err) {
        const finding = findingOf(id, err, "the step failed");
        steps.push({ ...base, status: "fail", reason: lineOf(finding), ms: Date.now() - started });
        findings.push(finding);
        stopped = true;
      }
      const last = steps[steps.length - 1];
      logger.info({ step: id, status: last.status, ms: last.ms }, "staging walk step");
    }
  } finally {
    current = WHOLE_WALK;
    const clock = kept.clock;
    if (clock) {
      try {
        await run.stripe.deleteClock(clock.id);
      } catch (err) {
        findings.push(findingOf(WHOLE_WALK, err, "the test clock wasn't deleted"));
      }
      if (clock.customer && pair) {
        try {
          await run.ledger.forgetCustomer(pair.mira.userId, clock.customer);
        } catch (err) {
          findings.push(findingOf(WHOLE_WALK, err, "Mira's account still names the deleted customer"));
        }
      }
    }
    if (session) await session.close().catch(() => undefined);
  }
  return verdictOf(steps, findings);
}

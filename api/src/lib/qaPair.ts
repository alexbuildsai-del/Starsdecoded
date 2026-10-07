/**
 * The staging walk's two accounts (ADR-314): Mira and Idris Costa, the site's sample people, made in Clerk by code and
 * marked as testers, so no one signs them up by hand. Before each walk they go back to the walk's start. A Release's
 * walk writes their three reports for real, and those become the seed a deploy's walk copies back in, so a deploy
 * reads real reports and spends nothing (ADR-315). Nothing here calls a model.
 *
 * Both stay banned in Clerk outside a walk. A walk opens them for as long as it runs and signs them in only with the
 * sign-in tokens its hold makes, and each start bans them again unless a walk here holds them.
 *
 * Staging only (reading 10): every function refuses anywhere else, on APP_ENV alone and never on a request (R13-08),
 * so production can't make, top up, reset or seed them.
 */
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { and, desc, eq, inArray, isNull, ne, sql } from "drizzle-orm";
import {
  db,
  askMessagesTable,
  bundlesTable,
  creditsTable,
  inviteTokensTable,
  labRunsTable,
  profileSharesTable,
  profilesTable,
  relationshipParticipantsTable,
  relationshipsTable,
  reportWorkbooksTable,
  reportsTable,
  subscriptionsTable,
  testersTable,
  timelineReadingsTable,
  usersTable,
  type InsertLabRun,
  type Report,
} from "@workspace/db";
import { readAppEnv } from "./appEnv.js";
import { consumeCredit } from "./credits.js";
import { logger } from "./logger.js";
import type { NatalChartData } from "./chartCalculation.js";

/** The locked `+clerk_test` addresses (stripe-payments, Automatic QA), with the sample people's names and birth towns. */
export const QA_PAIR = {
  mira: { email: "qa-a+clerk_test@mystarsdecoded.com", name: "Mira Costa", place: "Lisbon" },
  idris: { email: "qa-b+clerk_test@mystarsdecoded.com", name: "Idris Costa", place: "Cardiff" },
} as const;

export type QaRole = keyof typeof QA_PAIR;
const QA_ROLES: readonly QaRole[] = ["mira", "idris"];

/** Mira pays for what the walk writes and gives; Idris starts with none, so the walk meets the 402 (the spec). */
export const QA_CREDITS: Readonly<Record<QaRole, number>> = { mira: 20, idris: 0 };

export interface QaMember {
  userId: string;
  email: string;
  name: string;
}

export interface QaPair {
  mira: QaMember;
  idris: QaMember;
}

/** The step list's stored steps, each the report it would write. */
export type SeedStep = "own-report" | "idris-report" | "pair";

const SEED_FIXTURE: Record<SeedStep, string> = { "own-report": "mira", "idris-report": "idris", pair: "mira-idris" };
const SEED_STEPS = Object.keys(SEED_FIXTURE) as SeedStep[];
const SEED_LABEL = "qa-seed";
const SEED_SECTION = "whole";

export function seedKey(step: SeedStep): string {
  return `${SEED_FIXTURE[step]}.${SEED_LABEL}`;
}

/** Mira's parent and child report with her father Idris, the step list's pair: Mira is A and the child, Idris B and the parent. */
const PAIR_LENS = "parent_child";
// Where an admin's Clerk id names who added a tester: code added these two.
const ADDED_BY = "qa-pair";

function stagingOnly(what: string): void {
  const env = readAppEnv();
  if (env !== "staging") throw new Error(`the QA pair lives on staging alone, so ${what} is refused on ${env}`);
}

/** What the pair asks of Clerk, swapped in tests so none reaches it. */
export interface QaClerk {
  /** The Clerk id holding this address, or null when there is none. */
  find(email: string): Promise<string | null>;
  /** Makes the account already banned, so only a walk ever opens it. */
  create(person: { email: string; firstName: string; lastName: string }): Promise<string>;
  ban(userId: string): Promise<void>;
  unban(userId: string): Promise<void>;
  /** A one-time sign-in token for the account, good for this many seconds. */
  signInToken(userId: string, seconds: number): Promise<string>;
}

const liveClerk: QaClerk = {
  async find(email) {
    const { clerkClient } = await import("@clerk/express");
    const { data } = await clerkClient.users.getUserList({ emailAddress: [email], limit: 1 });
    return data[0]?.id ?? null;
  },
  async create({ email, firstName, lastName }) {
    const { clerkClient } = await import("@clerk/express");
    // The walk signs in with a sign-in token, never a password, and the instance may require one (Round start 4f).
    const user = await clerkClient.users.createUser({ emailAddress: [email], firstName, lastName, skipPasswordRequirement: true, banned: true });
    return user.id;
  },
  async ban(userId) {
    const { clerkClient } = await import("@clerk/express");
    await clerkClient.users.banUser(userId);
  },
  async unban(userId) {
    const { clerkClient } = await import("@clerk/express");
    await clerkClient.users.unbanUser(userId);
  },
  async signInToken(userId, seconds) {
    const { clerkClient } = await import("@clerk/express");
    const { token } = await clerkClient.signInTokens.createSignInToken({ userId, expiresInSeconds: seconds });
    return token;
  },
};

let clerk: QaClerk = liveClerk;

/** Tests swap Clerk; returns the restore function. */
export function setQaClerk(next: QaClerk | null): () => void {
  const previous = clerk;
  clerk = next ?? liveClerk;
  return () => {
    clerk = previous;
  };
}

async function clerkIdFor(email: string, name: string): Promise<string> {
  const found = await clerk.find(email);
  if (found) return found;
  const [firstName, ...rest] = name.split(" ");
  try {
    return await clerk.create({ email, firstName, lastName: rest.join(" ") });
  } catch (err) {
    // Two starts at once both find no one and both create; the second create fails and finds the first's.
    const again = await clerk.find(email);
    if (again) return again;
    throw err;
  }
}

async function ensureMember(role: QaRole): Promise<QaMember> {
  const { email, name } = QA_PAIR[role];
  const userId = await clerkIdFor(email, name);
  await db.transaction(async (tx) => {
    // Checkout makes the Stripe customer from the account's address, so a row Clerk's first sight left blank is filled.
    await tx
      .insert(usersTable)
      .values({ id: userId, email })
      .onConflictDoUpdate({ target: usersTable.id, set: { email, updatedAt: new Date() }, setWhere: sql`${usersTable.email} is distinct from ${email}` });
    // An address made again in Clerk is a new account, and only one account plays each part.
    await tx.update(testersTable).set({ qa: null }).where(and(eq(testersTable.qa, role), ne(testersTable.userId, userId)));
    await tx
      .insert(testersTable)
      .values({ userId, email, qa: role, addedBy: ADDED_BY })
      .onConflictDoUpdate({
        target: testersTable.userId,
        set: { email, qa: role },
        setWhere: sql`${testersTable.qa} is distinct from ${role} or ${testersTable.email} is distinct from ${email}`,
      });
  });
  return { userId, email, name };
}

/** All three reports, or the walk can't pass: a step with no seed waits for the first Release (reading 11). */
async function seedStored(): Promise<boolean> {
  const rows = await db
    .select({ runKey: labRunsTable.runKey })
    .from(labRunsTable)
    .where(and(inArray(labRunsTable.runKey, SEED_STEPS.map(seedKey)), eq(labRunsTable.section, SEED_SECTION)));
  return new Set(rows.map((r) => r.runKey)).size === SEED_STEPS.length;
}

/**
 * Finds or makes both accounts in Clerk with their `users` and `testers` rows, and says whether the seed is stored.
 * A second call finds both and changes nothing.
 */
export async function ensureQaPair(): Promise<QaPair & { seeded: boolean }> {
  stagingOnly("making the pair");
  const mira = await ensureMember("mira");
  const idris = await ensureMember("idris");
  return { mira, idris, seeded: await seedStored() };
}

/** A reset empties an account, so it only ever takes the two accounts ensureQaPair marked. */
async function confirmPair(pair: QaPair): Promise<string[]> {
  const ids = [pair.mira.userId, pair.idris.userId];
  const rows = await db.select({ userId: testersTable.userId, qa: testersTable.qa }).from(testersTable).where(inArray(testersTable.userId, ids));
  const part = new Map(rows.map((r) => [r.userId, r.qa]));
  if (ids[0] === ids[1] || part.get(ids[0]) !== "mira" || part.get(ids[1]) !== "idris") {
    throw new Error("these accounts are not the QA pair ensureQaPair marked");
  }
  return ids;
}

/**
 * Puts both accounts back at the walk's start: what either one made goes (invites and gifts, shares, reports and
 * pairs, credits and grants) and Timeline's plan ends, then Mira holds 20 test credits and Idris none. A customer can't
 * leave a Stripe test clock and goes when its clock does, so each account's customer is forgotten and the next walk
 * makes a fresh one. Purchases stay, as a payment's record stays when an account goes, so a late webhook still finds
 * its row.
 */
export async function resetQaPair(pair: QaPair): Promise<void> {
  stagingOnly("resetting the pair");
  const ids = await confirmPair(pair);
  const endedAt = new Date();
  await db.transaction(async (tx) => {
    const profileIds = (await tx.select({ id: profilesTable.id }).from(profilesTable).where(inArray(profilesTable.userId, ids))).map((p) => p.id);
    const relationshipIds = (await tx.select({ id: relationshipsTable.id }).from(relationshipsTable).where(inArray(relationshipsTable.userId, ids))).map(
      (r) => r.id,
    );
    await tx.delete(inviteTokensTable).where(inArray(inviteTokensTable.createdByUserId, ids));
    await tx.delete(profileSharesTable).where(inArray(profileSharesTable.ownerUserId, ids));
    await tx.delete(reportWorkbooksTable).where(inArray(reportWorkbooksTable.reader, ids));
    if (relationshipIds.length) {
      // A pair's report hangs on its relationship by id alone, so it goes first.
      await tx.delete(reportsTable).where(inArray(reportsTable.relationshipId, relationshipIds));
      await tx.delete(relationshipsTable).where(inArray(relationshipsTable.id, relationshipIds));
    }
    if (profileIds.length) await tx.delete(profilesTable).where(inArray(profilesTable.id, profileIds));
    await tx.delete(timelineReadingsTable).where(inArray(timelineReadingsTable.userId, ids));
    await tx.delete(askMessagesTable).where(inArray(askMessagesTable.userId, ids));
    await tx.delete(creditsTable).where(inArray(creditsTable.userId, ids));
    await tx.delete(bundlesTable).where(inArray(bundlesTable.userId, ids));
    // The plan's row is ended, not deleted. Its purchase stays, and a plan purchase with no row reads as a plan still kept
    // for a day after its grant (subscriptions.ts), which would make the next walk's plan a second one, cancelled at once.
    // An ended row never moves again, whatever Stripe sends for it later.
    await tx
      .update(subscriptionsTable)
      .set({
        status: "canceled",
        cancelAtPeriodEnd: true,
        currentPeriodEnd: sql`least(${subscriptionsTable.currentPeriodEnd}, ${endedAt.toISOString()}::timestamptz)`,
        updatedAt: endedAt,
      })
      .where(inArray(subscriptionsTable.userId, ids));
    await tx.update(usersTable).set({ stripeCustomerId: null, updatedAt: new Date() }).where(inArray(usersTable.id, ids));
    for (const role of QA_ROLES) {
      const count = QA_CREDITS[role];
      if (!count) continue;
      const userId = pair[role].userId;
      const bundleId = randomUUID();
      // A bundle is a count (ADR-42) and History reads its credits, so the top-up is one line; the column still wants a
      // catalogue kind.
      await tx.insert(bundlesTable).values({ id: bundleId, userId, bundleKind: "family", isTest: true, source: "test" });
      await tx
        .insert(creditsTable)
        .values(Array.from({ length: count }, () => ({ id: randomUUID(), userId, bundleId, status: "available", usedForReportId: null, isTest: true })));
    }
  });
}

/** Made as the reader signs in and used at once, so two minutes is room enough. */
const TICKET_SECONDS = 120;

/** Walks in this process holding the pair open; a start bans neither while one does. */
let walksOpen = 0;

/** The newest walk's own reports, by the stored step whose write answered each: the only ones storeQaSeed may keep. */
let newestWalkWrote = new Map<SeedStep, string>();

/** What one walk holds while it runs. */
export interface QaPairHold {
  /** A one-time sign-in token for one of the two, made only while the walk holds them. */
  ticket(role: QaRole): Promise<string>;
  /** A stored step's report, as its own write answered it. */
  wrote(step: SeedStep, reportId: string): void;
  /**
   * Bans both again, even while another walk here holds them: a walk that outlived its limit can't leave them open for
   * one that came after. A second call does nothing.
   */
  close(): Promise<void>;
}

function messageOf(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** One call per account, so a refusal never leaves the other undone; then any that failed is thrown, with Clerk's words. */
async function eachAccount(userIds: string[], call: (userId: string) => Promise<void>): Promise<void> {
  const failed = (await Promise.allSettled(userIds.map((userId) => call(userId)))).filter((r): r is PromiseRejectedResult => r.status === "rejected");
  if (failed.length) throw new Error(`Clerk failed ${failed.length} of ${userIds.length} calls: ${messageOf(failed[0].reason)}`);
}

/**
 * Opens both accounts for one walk: their bans lift before the hold makes any sign-in token, and its close bans them
 * again. An open that fails part way bans both again before it throws, so a walk never leaves one open behind it.
 */
export async function openQaPair(pair: QaPair): Promise<QaPairHold> {
  stagingOnly("opening the pair");
  // Asked of Clerk, not of the pair handed in: only the accounts holding the locked addresses ever open.
  const held = await Promise.all(QA_ROLES.map((role) => clerk.find(QA_PAIR[role].email)));
  if (pair.mira.userId === pair.idris.userId || QA_ROLES.some((role, i) => held[i] !== pair[role].userId)) {
    throw new Error("these accounts are not the QA pair ensureQaPair marked");
  }
  const ids = QA_ROLES.map((role) => pair[role].userId);
  walksOpen += 1;
  const wrote = new Map<SeedStep, string>();
  newestWalkWrote = wrote;
  let holding = true;
  const hold: QaPairHold = {
    async ticket(role) {
      if (!holding) throw new Error("the walk has let the pair go, so no sign-in token is made");
      try {
        return await clerk.signInToken(pair[role].userId, TICKET_SECONDS);
      } catch (err) {
        throw new Error(`Clerk made no sign-in token: ${messageOf(err)}`);
      }
    },
    wrote(step, reportId) {
      wrote.set(step, reportId);
    },
    async close() {
      if (!holding) return;
      holding = false;
      walksOpen -= 1;
      await eachAccount(ids, (userId) => clerk.ban(userId));
    },
  };
  try {
    await eachAccount(ids, (userId) => clerk.unban(userId));
  } catch (err) {
    await hold.close().catch(() => undefined);
    throw err;
  }
  return hold;
}

/** A Clerk error's HTTP status, the one part of it a log line may carry. */
function statusOf(err: unknown): number | null {
  const status = (err as { status?: unknown } | null)?.status;
  return typeof status === "number" ? status : null;
}

/**
 * Bans both accounts as the API starts, unless a walk here holds them. A walk lives in the process that runs it, and a
 * restart cuts it off (routes/qa.ts settles its row as failed), so a walk a restart ended never banned them itself.
 * Off staging it asks nothing; on staging an address Clerk holds no account for is skipped. It never throws: a Clerk
 * that is slow or down is a warn line, never a held or failed start.
 */
export async function banQaPairUnlessWalking(): Promise<void> {
  try {
    if (readAppEnv() !== "staging" || walksOpen > 0) return;
    const found = await Promise.all(QA_ROLES.map((role) => clerk.find(QA_PAIR[role].email)));
    const ids = found.filter((id): id is string => id !== null);
    // A walk may have opened them while Clerk looked them up; its own close bans them.
    if (ids.length === 0 || walksOpen > 0) return;
    const failed = (await Promise.allSettled(ids.map((userId) => clerk.ban(userId)))).filter((r): r is PromiseRejectedResult => r.status === "rejected");
    if (failed.length) {
      logger.warn({ accounts: ids.length, failed: failed.length, status: statusOf(failed[0].reason) }, "QA pair: not banned at the start");
    } else {
      logger.info({ accounts: ids.length }, "QA pair: banned at the start");
    }
  } catch (err) {
    logger.warn({ status: statusOf(err) }, "QA pair: not banned at the start, Clerk couldn't find the accounts");
  }
}

interface OwnReport {
  profileId: string;
  reportId: string;
  name: string;
  chart: unknown;
  interpretation: unknown;
}

/**
 * The account's own finished Personal report, the one the own-report and idris-report steps write: the newest, or the
 * one named, if it still is.
 */
async function ownReport(userId: string, reportId?: string): Promise<OwnReport | null> {
  const [row] = await db
    .select({ profile: profilesTable, report: reportsTable })
    .from(reportsTable)
    .innerJoin(profilesTable, eq(reportsTable.profileId, profilesTable.id))
    .where(
      and(
        eq(profilesTable.userId, userId),
        eq(profilesTable.isSelf, true),
        isNull(profilesTable.claimedByUserId),
        eq(reportsTable.type, "natal"),
        eq(reportsTable.status, "complete"),
        reportId === undefined ? undefined : eq(reportsTable.id, reportId),
      ),
    )
    .orderBy(desc(reportsTable.createdAt))
    .limit(1);
  return row
    ? { profileId: row.profile.id, reportId: row.report.id, name: row.profile.name, chart: row.profile.chartData, interpretation: row.report.interpretation }
    : null;
}

/** Every pair report the maker holds over exactly these two charts under the pair's lens, newest first. */
async function pairsOver(makerId: string, aProfileId: string, bProfileId: string): Promise<Report[]> {
  const rows = await db
    .select({ report: reportsTable, profileId: relationshipParticipantsTable.profileId })
    .from(reportsTable)
    .innerJoin(relationshipsTable, eq(reportsTable.relationshipId, relationshipsTable.id))
    .innerJoin(relationshipParticipantsTable, eq(relationshipParticipantsTable.relationshipId, relationshipsTable.id))
    .where(and(eq(relationshipsTable.userId, makerId), eq(relationshipsTable.type, PAIR_LENS), eq(reportsTable.type, "compatibility")))
    .orderBy(desc(reportsTable.createdAt));
  const byReport = new Map<string, { report: Report; people: Set<string> }>();
  for (const row of rows) {
    const entry = byReport.get(row.report.id) ?? { report: row.report, people: new Set<string>() };
    entry.people.add(row.profileId);
    byReport.set(row.report.id, entry);
  }
  return [...byReport.values()]
    .filter(({ people }) => people.size === 2 && people.has(aProfileId) && people.has(bProfileId))
    .map(({ report }) => report);
}

function seedRow(step: SeedStep, output: unknown, chart: unknown, subjectName: string): InsertLabRun {
  const model = (output as { meta?: { model?: unknown } } | null)?.meta?.model;
  return {
    id: randomUUID(),
    runKey: seedKey(step),
    fixture: SEED_FIXTURE[step],
    label: SEED_LABEL,
    source: "qa",
    section: SEED_SECTION,
    model: typeof model === "string" ? model : "mixed",
    serviceTier: "standard",
    status: "done",
    output: output as object,
    chart: (chart ?? null) as object | null,
    subjectName,
    // The Release's writes recorded their spend as each call landed (R13-09); a copy of their text adds none, so the
    // lab budget never counts it twice.
    usage: null,
    costUsd: null,
    faults: [],
    words: 0,
    seconds: null,
  };
}

/**
 * Keeps each report the newest walk here wrote as the new seed, one `whole` row per report: the text entire and the
 * chart and name it was written for. Only a report a stored step's own write answered is kept, and only while it is
 * still that account's own finished report; a report the walk didn't finish leaves its old seed. A walk's reports are
 * taken once. Answers how many it kept.
 */
export async function storeQaSeed(pair: QaPair): Promise<number> {
  stagingOnly("storing the seed");
  // Taken before any check can throw, so a store that fails leaves no ids behind for the next Release to keep.
  const wrote = newestWalkWrote;
  newestWalkWrote = new Map();
  await confirmPair(pair);
  const written = (step: "own-report" | "idris-report", userId: string) => {
    const reportId = wrote.get(step);
    return reportId ? ownReport(userId, reportId) : Promise.resolve(null);
  };
  const rows: InsertLabRun[] = [];
  const [mira, idris] = await Promise.all([written("own-report", pair.mira.userId), written("idris-report", pair.idris.userId)]);
  if (mira) rows.push(seedRow("own-report", mira.interpretation, mira.chart, mira.name));
  if (idris) rows.push(seedRow("idris-report", idris.interpretation, idris.chart, idris.name));
  const pairId = wrote.get("pair");
  if (mira && idris && pairId) {
    const finished = (await pairsOver(pair.mira.userId, mira.profileId, idris.profileId)).find(
      (r) => r.id === pairId && r.status === "complete" && r.interpretation,
    );
    if (finished) rows.push(seedRow("pair", finished.interpretation, null, `${mira.name} & ${idris.name}`));
  }
  if (!rows.length) return 0;
  await db.transaction(async (tx) => {
    await tx.delete(labRunsTable).where(and(inArray(labRunsTable.runKey, rows.map((r) => r.runKey)), eq(labRunsTable.section, SEED_SECTION)));
    await tx.insert(labRunsTable).values(rows);
  });
  return rows.length;
}

async function readSeed(step: SeedStep): Promise<{ output: unknown; chart: unknown } | null> {
  const [row] = await db
    .select({ output: labRunsTable.output, chart: labRunsTable.chart })
    .from(labRunsTable)
    .where(and(eq(labRunsTable.runKey, seedKey(step)), eq(labRunsTable.section, SEED_SECTION)))
    .limit(1);
  return row?.output ? row : null;
}

interface SampleBirth {
  birthDate: string;
  birthTime: string;
  birthTimeWindowMinutes?: number;
  latitude: number;
  longitude: number;
  timezone: string;
}

const PEOPLE = join("fixtures", "sample-people");

/** Birth data from the sample person's fixture, as the site and the buyer walk read it (R-3.1). */
function birthOf(role: QaRole): SampleBirth {
  // Railway starts the API in api/, and a test runs anywhere below the root.
  for (const dir of [process.cwd(), join(process.cwd(), ".."), join(process.cwd(), "..", "..")]) {
    const path = join(dir, PEOPLE, `${role}.json`);
    if (existsSync(path)) return JSON.parse(readFileSync(path, "utf8")) as SampleBirth;
  }
  throw new Error(`no ${PEOPLE}/${role}.json beside the process`);
}

/** The credit the copied report's write would have taken, in the copy's transaction, so neither stands alone. */
async function takeTheWritesCredit(tx: Parameters<typeof consumeCredit>[2], userId: string, reportId: string, what: string): Promise<void> {
  if (!(await consumeCredit(userId, reportId, tx))) throw new Error(`no credit was left to copy ${what} with`);
}

async function placeNatal(step: "own-report" | "idris-report", pair: QaPair, seed: { output: unknown; chart: unknown }): Promise<string> {
  const role: QaRole = step === "own-report" ? "mira" : "idris";
  const member = pair[role];
  const chart = seed.chart as NatalChartData | null;
  if (!chart) throw new Error(`the ${seedKey(step)} seed holds no chart`);
  const [own] = await db.select({ id: profilesTable.id }).from(profilesTable).where(and(eq(profilesTable.userId, member.userId), eq(profilesTable.isSelf, true))).limit(1);
  if (own) throw new Error(`${member.name}'s own chart is already in place: reset the pair before placing the seed`);
  const birth = birthOf(role);
  const windowMinutes = birth.birthTimeWindowMinutes ?? 0;
  const profileId = randomUUID();
  const reportId = randomUUID();
  // A session no browser holds: an id anyone could send as a cookie would let them read these signed out.
  const sessionId = randomUUID();
  await db.transaction(async (tx) => {
    await tx.insert(profilesTable).values({
      id: profileId,
      sessionId,
      userId: member.userId,
      isSelf: true,
      name: member.name,
      birthDate: birth.birthDate,
      birthTime: birth.birthTime,
      birthPlace: QA_PAIR[role].place,
      latitude: birth.latitude,
      longitude: birth.longitude,
      timezoneOffset: chart.timezoneOffset,
      timezone: birth.timezone,
      birthTimeWindowMinutes: windowMinutes,
      // The chart the text was written on, so the wheel and the text's evidence agree.
      chartData: chart as unknown as object,
    });
    await tx.insert(reportsTable).values({
      id: reportId,
      profileId,
      sessionId,
      type: "natal",
      status: "complete",
      interpretation: seed.output as object,
      // Stamped as routes/reports.ts stamps a write, so a later birth-time change finds the copy as it would the report (reading 9).
      computeData: { writtenFor: { birthTime: birth.birthTime, birthTimeWindowMinutes: windowMinutes, passes: 0 } },
    });
    await takeTheWritesCredit(tx, member.userId, reportId, `${member.name}'s Personal report`);
  });
  return reportId;
}

async function placePair(pair: QaPair, seed: { output: unknown }): Promise<string> {
  const [a, b] = await Promise.all([ownReport(pair.mira.userId), ownReport(pair.idris.userId)]);
  if (!a || !b) throw new Error("the pair's seed goes over Mira's and Idris's own Personal reports: place those first");
  if ((await pairsOver(pair.mira.userId, a.profileId, b.profileId)).length) {
    throw new Error("Mira already holds the pair with Idris: reset the pair before placing the seed");
  }
  const relationshipId = randomUUID();
  const reportId = randomUUID();
  const sessionId = randomUUID();
  await db.transaction(async (tx) => {
    await tx.insert(relationshipsTable).values({ id: relationshipId, sessionId, userId: pair.mira.userId, type: PAIR_LENS, label: null });
    await tx.insert(relationshipParticipantsTable).values([
      { id: randomUUID(), relationshipId, profileId: a.profileId, role: "child", position: "0" },
      { id: randomUUID(), relationshipId, profileId: b.profileId, role: "parent", position: "1" },
    ]);
    await tx.insert(reportsTable).values({
      id: reportId,
      profileId: a.profileId,
      sessionId,
      type: "compatibility",
      relationshipId,
      status: "complete",
      interpretation: seed.output as object,
      computeData: { reportAId: a.reportId, reportBId: b.reportId, lens: PAIR_LENS },
    });
    await takeTheWritesCredit(tx, pair.mira.userId, reportId, "the pair");
  });
  return reportId;
}

/**
 * Copies a stored step's seed into its account, as the step would have written it, and answers the report's id, or
 * null when no Release has stored that report yet. The pair goes over Mira's own chart and Idris's own, so their
 * Personal reports come first. A copy takes the credit the write would, so a deploy's balances follow the Owner's
 * path as a Release's do: Idris is out of credits once his report is in (2026-10-06).
 */
export async function placeSeed(pair: QaPair, step: SeedStep): Promise<string | null> {
  stagingOnly("placing the seed");
  await confirmPair(pair);
  const seed = await readSeed(step);
  if (!seed) return null;
  return step === "pair" ? placePair(pair, seed) : placeNatal(step, pair, seed);
}

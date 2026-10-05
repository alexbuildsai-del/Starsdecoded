/**
 * Testers (ADR-276): accounts the admin marks by email on the Sales page, one list on each host, given 1, 3 or 5
 * credits by grant. A grant is a test bundle from Stars Decoded with no purchase behind it, so it never counts as
 * revenue and History reads it "From Stars Decoded" (reading 4). Removing a tester leaves what they were given.
 *
 * The QA pair (ADR-314) sits in the same list, marked by `qa`. Staging makes, tops up and resets those two by code
 * (`qaPair.ts`), so nothing here adds, grants to or removes either of them.
 */
import { and, count, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db, bundlesTable, creditsTable, testersTable, usersTable, type QaAccount, type TesterRow } from "@workspace/db";
import { BUNDLES, type BundleId } from "@workspace/commerce";
import { grantBundle } from "./credits.js";
import { logger } from "./logger.js";
import { QA_PAIR } from "./qaPair.js";

/** A grant is a bundle's size, never an amount the admin types. */
export const GRANT_COUNTS = [1, 3, 5] as const;
export type GrantCount = (typeof GRANT_COUNTS)[number];

export function isGrantCount(value: unknown): value is GrantCount {
  return (GRANT_COUNTS as readonly unknown[]).includes(value);
}

/** The bundle a grant of this many credits is, from the catalogue's counts, so a grant and a purchase of one size agree. */
export function grantKind(count: GrantCount): BundleId {
  const bundle = BUNDLES.find((row) => row.credits === count);
  if (!bundle) throw new Error(`No bundle holds ${count} credits`);
  return bundle.id;
}

export interface Tester {
  userId: string;
  email: string;
  qa: QaAccount | null;
  /** Credits granted to this account, and how many of them were used, wherever a gift took them. */
  granted: number;
  used: number;
  addedAt: Date;
}

export class TesterRefused extends Error {
  constructor(
    readonly status: 400 | 404 | 409,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "TesterRefused";
  }
}

export const TESTER_LINES = {
  badEmail: "That isn't an email address. Use the one on their account.",
  noAccount: "No account here uses that email. Ask them to sign in once, then add them.",
  already: "That account is already a tester.",
  qaAdd: "That's a QA account. Staging adds and resets it by itself.",
  qaChange: "Staging looks after the QA accounts. They can't be changed here.",
  notTester: "That account isn't a tester.",
  grantNotTester: "That account isn't a tester. Add it first.",
  badCount: `Grant ${GRANT_COUNTS.slice(0, -1).join(", ")} or ${GRANT_COUNTS[GRANT_COUNTS.length - 1]} credits.`,
} as const;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const QA_EMAILS: ReadonlySet<string> = new Set(Object.values(QA_PAIR).map((member) => member.email.toLowerCase()));

/** Either QA account, by its mark or by its address, so one added by hand before staging marked it stays out too. */
function isQaPair(row: Pick<TesterRow, "qa" | "email">): boolean {
  return row.qa !== null || QA_EMAILS.has(row.email.toLowerCase());
}

/** Credits granted to each account and how many of them were used. A gift moves a credit but keeps its bundle. */
async function grantCounts(userIds: string[]): Promise<Map<string, { granted: number; used: number }>> {
  if (!userIds.length) return new Map();
  const rows = await db
    .select({
      userId: bundlesTable.userId,
      granted: count(creditsTable.id),
      used: sql<number>`count(*) filter (where ${creditsTable.status} = 'used')`.mapWith(Number),
    })
    .from(bundlesTable)
    .innerJoin(creditsTable, eq(creditsTable.bundleId, bundlesTable.id))
    .where(and(eq(bundlesTable.source, "grant"), inArray(bundlesTable.userId, userIds)))
    .groupBy(bundlesTable.userId);
  return new Map(rows.map((row) => [row.userId, { granted: row.granted, used: row.used }]));
}

function testerOf(row: TesterRow, counts: { granted: number; used: number } | undefined): Tester {
  return {
    userId: row.userId,
    email: row.email,
    qa: row.qa,
    granted: counts?.granted ?? 0,
    used: counts?.used ?? 0,
    addedAt: row.addedAt,
  };
}

async function testerRow(userId: string): Promise<TesterRow | null> {
  const [row] = await db.select().from(testersTable).where(eq(testersTable.userId, userId)).limit(1);
  return row ?? null;
}

async function testerWithCounts(row: TesterRow): Promise<Tester> {
  return testerOf(row, (await grantCounts([row.userId])).get(row.userId));
}

/** This host's testers, the QA pair among them, the latest added first. */
export async function listTesters(): Promise<Tester[]> {
  const rows = await db.select().from(testersTable).orderBy(desc(testersTable.addedAt));
  const counts = await grantCounts(rows.map((row) => row.userId));
  return rows.map((row) => testerOf(row, counts.get(row.userId)));
}

export async function isTester(userId: string): Promise<boolean> {
  return (await testerRow(userId)) !== null;
}

/**
 * Marks the account with this email a tester. The account must already exist on this host, since only a sign-in
 * makes one: the address is matched as Clerk gave it at that first sign-in, in any case.
 */
export async function addTester(email: string, by: string): Promise<Tester> {
  const address = email.trim().toLowerCase();
  if (address.length > 320 || !EMAIL.test(address)) throw new TesterRefused(400, "bad_email", TESTER_LINES.badEmail);
  if (QA_EMAILS.has(address)) throw new TesterRefused(409, "qa_pair", TESTER_LINES.qaAdd);
  // An address made again in Clerk is a second account with the same email; the newer one is the one in use.
  const [account] = await db
    .select({ id: usersTable.id, email: usersTable.email })
    .from(usersTable)
    .where(sql`lower(${usersTable.email}) = ${address}`)
    .orderBy(desc(usersTable.createdAt))
    .limit(1);
  if (!account) throw new TesterRefused(404, "no_account", TESTER_LINES.noAccount);
  // An account already on the list keeps its row as it is, the QA pair's mark included.
  const [added] = await db
    .insert(testersTable)
    .values({ userId: account.id, email: account.email ?? address, qa: null, addedBy: by })
    .onConflictDoNothing({ target: testersTable.userId })
    .returning();
  if (!added) throw new TesterRefused(409, "already_tester", TESTER_LINES.already);
  // Someone removed and added again kept their grants, so the counts are read rather than taken as zero.
  return testerWithCounts(added);
}

/**
 * Gives a tester 1, 3 or 5 credits: a test bundle with source `grant` and no purchase row, so it is never revenue
 * (ADR-276). The QA pair is refused: staging sets their credits before each walk.
 */
export async function grantTester(userId: string, count: GrantCount, by: string): Promise<Tester> {
  if (!isGrantCount(count)) throw new TesterRefused(400, "bad_count", TESTER_LINES.badCount);
  const row = await testerRow(userId);
  if (!row) throw new TesterRefused(404, "not_tester", TESTER_LINES.grantNotTester);
  if (isQaPair(row)) throw new TesterRefused(409, "qa_pair", TESTER_LINES.qaChange);
  const { bundleId } = await grantBundle(userId, grantKind(count), { test: true, source: "grant" });
  // No column holds who granted a bundle, so the log keeps it.
  logger.info({ userId, by, count, bundleId }, "tester granted credits");
  return testerWithCounts(row);
}

/** Takes the tester's mark away and nothing else: the credits they were given stay in their balance. */
export async function removeTester(userId: string): Promise<void> {
  const row = await testerRow(userId);
  if (!row) throw new TesterRefused(404, "not_tester", TESTER_LINES.notTester);
  if (isQaPair(row)) throw new TesterRefused(409, "qa_pair", TESTER_LINES.qaChange);
  // The mark is checked again in the delete, so a row staging marks in between stays.
  const gone = await db
    .delete(testersTable)
    .where(and(eq(testersTable.userId, userId), isNull(testersTable.qa)))
    .returning({ userId: testersTable.userId });
  if (gone.length) return;
  if (await isTester(userId)) throw new TesterRefused(409, "qa_pair", TESTER_LINES.qaChange);
  throw new TesterRefused(404, "not_tester", TESTER_LINES.notTester);
}

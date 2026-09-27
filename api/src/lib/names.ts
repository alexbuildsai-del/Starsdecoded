import { and, desc, eq, isNull, or } from "drizzle-orm";
import { db, profilesTable } from "@workspace/db";
import { logger } from "./logger.js";

/**
 * The first word of a name as typed, cut the way the orbit cuts its labels
 * (web/src/lib/orbit.ts), so "Send to Beatrice" and BEATRICE always agree.
 */
export function firstWord(name: string): string {
  return name.normalize("NFC").trim().split(/\s+/)[0] ?? "";
}

// The dashboard polls the report list every few seconds while one writes, and
// a Clerk first name does not change between polls; failures are not kept.
const CLERK_TTL_MS = 10 * 60 * 1000;
const CLERK_MEMO_LIMIT = 1000;
const clerkNames = new Map<string, { at: number; name: string | null }>();

async function clerkFirstName(userId: string): Promise<string | null> {
  const hit = clerkNames.get(userId);
  if (hit && Date.now() - hit.at < CLERK_TTL_MS) return hit.name;
  try {
    const { clerkClient } = await import("@clerk/express");
    const user = await clerkClient.users.getUser(userId);
    const name = firstWord(user.firstName ?? "") || null;
    if (clerkNames.size >= CLERK_MEMO_LIMIT) clerkNames.clear();
    clerkNames.set(userId, { at: Date.now(), name });
    return name;
  } catch (err) {
    logger.warn({ err, userId }, "no Clerk first name");
    return null;
  }
}

/**
 * A user's first name as the people they send to read it, never an email
 * (MB-85). Their own chart's name comes first, since they typed it: the one
 * they wrote and marked as theirs, else a sent one they said is them
 * (reading 16); then Clerk's first name; else null.
 */
export async function firstNameOf(userId: string): Promise<string | null> {
  if (!userId) return null;
  const [own] = await db
    .select({ name: profilesTable.name })
    .from(profilesTable)
    .where(
      and(
        eq(profilesTable.userId, userId),
        eq(profilesTable.isSelf, true),
        or(isNull(profilesTable.claimedByUserId), eq(profilesTable.claimedByUserId, userId)),
      ),
    )
    .limit(1);
  const fromOwn = own ? firstWord(own.name) : "";
  if (fromOwn) return fromOwn;

  const [claimed] = await db
    .select({ name: profilesTable.name })
    .from(profilesTable)
    .where(and(eq(profilesTable.claimedByUserId, userId), eq(profilesTable.claimedAsSelf, true)))
    .orderBy(desc(profilesTable.updatedAt))
    .limit(1);
  const fromClaimed = claimed ? firstWord(claimed.name) : "";
  if (fromClaimed) return fromClaimed;

  return clerkFirstName(userId);
}

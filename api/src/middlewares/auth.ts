import { getAuth } from "@clerk/express";
import type { Request, Response, NextFunction } from "express";
import { eq, and, isNull } from "drizzle-orm";
import { db, usersTable, profilesTable, reportsTable } from "@workspace/db";

declare global {
  namespace Express {
    interface Request {
      userId: string | null;
    }
  }
}

// Track which (sessionId, userId) pairs we've already claimed to avoid
// re-running the claim on every authenticated request. In-memory is fine —
// false misses just trigger a no-op UPDATE that touches zero rows.
const claimedPairs = new Set<string>();

/**
 * Resolves the authenticated Clerk user (if any), upserts the local user
 * row on first sight, and runs claim-on-signup so any anonymous profiles
 * and reports tied to the visitor's `session_id` get reassigned to the
 * user. Anonymous visitors pass through with `req.userId = null`.
 */
export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const auth = getAuth(req);
    const userId = auth?.userId ?? null;
    req.userId = userId;

    if (!userId) {
      return next();
    }

    // Upsert the local user row. We pull the email lazily — on first
    // sight we fetch it from Clerk. After that we skip the lookup.
    const existing = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);

    if (!existing.length) {
      let email: string | null = null;
      try {
        const { clerkClient } = await import("@clerk/express");
        const u = await clerkClient.users.getUser(userId);
        email = u.primaryEmailAddress?.emailAddress ?? u.emailAddresses[0]?.emailAddress ?? null;
      } catch (err) {
        req.log.warn({ err, userId }, "Failed to fetch Clerk user email");
      }
      await db
        .insert(usersTable)
        .values({ id: userId, email })
        .onConflictDoNothing();
    }

    // Claim-on-signup: reassign anonymous profiles + reports tied to this
    // session to the user. Once per (session, user) pair per process.
    const pairKey = `${req.sessionId}::${userId}`;
    if (req.sessionId && !claimedPairs.has(pairKey)) {
      await db
        .update(profilesTable)
        .set({ userId, updatedAt: new Date() })
        .where(
          and(eq(profilesTable.sessionId, req.sessionId), isNull(profilesTable.userId)),
        );
      // Reports don't carry user_id directly; ownership for signed-in
      // users is derived via profile.user_id. So we just need to make sure
      // the profile transition happened. Nothing to update on reports.
      claimedPairs.add(pairKey);
    }

    next();
  } catch (err) {
    req.log.error({ err }, "auth middleware failed");
    next();
  }
}

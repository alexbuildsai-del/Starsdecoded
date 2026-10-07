import { getAuth } from "@clerk/express";
import type { Request, Response, NextFunction } from "express";
import { eq, and, isNull } from "drizzle-orm";
import { db, usersTable, profilesTable, relationshipsTable } from "@workspace/db";

declare global {
  namespace Express {
    interface Request {
      userId: string | null;
    }
  }
}

// The account each browser session was last claimed for, so a signed-in request runs the claim once rather than on
// every call. A request from the session that reads as signed out, after a sign-out or on an expired session cookie,
// drops its entry: what it makes meanwhile is the session's, and the next signed-in request claims it.
const claimedFor = new Map<string, string>();

/**
 * What a browser session made before sign-in becomes the account's (reading 3): its charts and the pairs made from
 * them, in one transaction, so a pair never moves without its charts. Only rows no account holds move, so nothing
 * another account owns changes hands. Reports follow their chart or their pair and carry no account of their own.
 */
export async function claimSession(sessionId: string, userId: string): Promise<{ profiles: number; relationships: number }> {
  return db.transaction(async (tx) => {
    const now = new Date();
    const profiles = await tx
      .update(profilesTable)
      .set({ userId, updatedAt: now })
      .where(and(eq(profilesTable.sessionId, sessionId), isNull(profilesTable.userId)))
      .returning({ id: profilesTable.id });
    const relationships = await tx
      .update(relationshipsTable)
      .set({ userId, updatedAt: now })
      .where(and(eq(relationshipsTable.sessionId, sessionId), isNull(relationshipsTable.userId)))
      .returning({ id: relationshipsTable.id });
    return { profiles: profiles.length, relationships: relationships.length };
  });
}

/**
 * Resolves the authenticated Clerk user (if any), upserts the local user
 * row on first sight, and claims what the visitor's `session_id` made before
 * sign-in. Anonymous visitors pass through with `req.userId = null`.
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
      if (req.sessionId) claimedFor.delete(req.sessionId);
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
        req.log.warn({ err }, "Failed to fetch Clerk user email");
      }
      await db
        .insert(usersTable)
        .values({ id: userId, email })
        .onConflictDoNothing();
    }

    if (req.sessionId && claimedFor.get(req.sessionId) !== userId) {
      const moved = await claimSession(req.sessionId, userId);
      if (moved.profiles || moved.relationships) req.log.info(moved, "sign-in claimed the session's charts and pairs");
      claimedFor.set(req.sessionId, userId);
    }

    next();
  } catch (err) {
    req.log.error({ err }, "auth middleware failed");
    next();
  }
}

import { randomUUID } from "node:crypto";
import { and, eq, or, isNull, ne } from "drizzle-orm";
import { db, profilesTable, type Profile } from "@workspace/db";
import { CHART_VERSION, calculateNatalChart, type NatalChartData } from "./chartCalculation.js";

export interface ProfileInput {
  name: string;
  birthDate: string;
  birthTime: string;
  birthPlace: string;
  latitude: number;
  longitude: number;
  timezoneOffset: number;
}

/**
 * Find or create a profile matching the given birth data for the current
 * viewer. If a match exists, the cached chartData is reused; otherwise the
 * chart is computed once and persisted on the new profile.
 *
 * Lookup key: birth data + ownership.
 *   - Signed in: match profiles owned by the user OR profiles with the same
 *     session_id whose userId is still null (so we naturally upgrade the
 *     just-created anonymous profile to belong to the user).
 *   - Anonymous: match profiles tied to the session.
 *
 * @param isForSelf When true, marks the profile as the creator's own
 *   self-profile (sets `isSelf=true` on the row). This is the explicit
 *   intent signal from the birth form; it is never derived by heuristic.
 */
export async function resolveOrCreateProfile(
  sessionId: string,
  userId: string | null,
  input: ProfileInput,
  isForSelf = false,
): Promise<Profile> {
  const ownership = userId
    ? or(
        eq(profilesTable.userId, userId),
        and(eq(profilesTable.sessionId, sessionId), isNull(profilesTable.userId)),
      )
    : eq(profilesTable.sessionId, sessionId);

  const existing = await db
    .select()
    .from(profilesTable)
    .where(
      and(
        ownership,
        eq(profilesTable.name, input.name),
        eq(profilesTable.birthDate, input.birthDate),
        eq(profilesTable.birthTime, input.birthTime),
        eq(profilesTable.latitude, input.latitude),
        eq(profilesTable.longitude, input.longitude),
        eq(profilesTable.timezoneOffset, input.timezoneOffset),
      ),
    )
    .limit(1);

  if (existing.length) {
    let p = existing[0];
    const updates: Partial<typeof profilesTable.$inferInsert> & { updatedAt?: Date } = {};

    // If this matched profile is still anonymous and the viewer is now
    // signed in, claim it so future ownership checks succeed.
    if (userId && !p.userId) {
      updates.userId = userId;
    }

    // Promote to self-profile if caller explicitly requested it.
    // Wrap in a transaction to atomically clear others + set this row,
    // guarded by the DB partial unique index as a final safety net.
    if (isForSelf && !p.isSelf) {
      await db.transaction(async (tx) => {
        if (userId) {
          await tx
            .update(profilesTable)
            .set({ isSelf: false, updatedAt: new Date() })
            .where(and(eq(profilesTable.userId, userId), ne(profilesTable.id, p.id)));
        }
        await tx
          .update(profilesTable)
          .set({ isSelf: true, ...updates, updatedAt: new Date() })
          .where(eq(profilesTable.id, p.id));
      });
      return { ...p, ...updates, isSelf: true, updatedAt: new Date() };
    }

    // Recompute when the cached chart is missing or predates the current
    // engine shape (e.g. lacks sunAltitude).
    const cachedVersion = (p.chartData as { chartVersion?: number } | null)?.chartVersion ?? 0;
    if (!p.chartData || cachedVersion < CHART_VERSION) {
      const chartData = calculateNatalChart(
        p.birthDate,
        p.birthTime,
        p.latitude,
        p.longitude,
        p.timezoneOffset,
      );
      updates.chartData = chartData as unknown as object;
      updates.updatedAt = new Date();
      if (Object.keys(updates).length) {
        await db.update(profilesTable).set(updates).where(eq(profilesTable.id, p.id));
      }
      return { ...p, ...updates };
    }

    if (Object.keys(updates).length) {
      updates.updatedAt = new Date();
      await db.update(profilesTable).set(updates).where(eq(profilesTable.id, p.id));
      p = { ...p, ...updates };
    }
    return p;
  }

  const id = randomUUID();
  const chartData: NatalChartData = calculateNatalChart(
    input.birthDate,
    input.birthTime,
    input.latitude,
    input.longitude,
    input.timezoneOffset,
  );

  // Enforce one-self-per-user: atomically clear any existing self-profile
  // then insert the new row. The DB partial unique index is the final safety
  // net; the transaction prevents a TOCTOU race between the clear and insert.
  if (isForSelf && userId) {
    await db.transaction(async (tx) => {
      await tx
        .update(profilesTable)
        .set({ isSelf: false, updatedAt: new Date() })
        .where(eq(profilesTable.userId, userId));

      await tx.insert(profilesTable).values({
        id,
        sessionId,
        userId: userId ?? null,
        isSelf: true,
        name: input.name,
        birthDate: input.birthDate,
        birthTime: input.birthTime,
        birthPlace: input.birthPlace,
        latitude: input.latitude,
        longitude: input.longitude,
        timezoneOffset: input.timezoneOffset,
        chartData: chartData as unknown as object,
      });
    });
  } else {
    await db.insert(profilesTable).values({
      id,
      sessionId,
      userId: userId ?? null,
      isSelf: isForSelf,
      name: input.name,
      birthDate: input.birthDate,
      birthTime: input.birthTime,
      birthPlace: input.birthPlace,
      latitude: input.latitude,
      longitude: input.longitude,
      timezoneOffset: input.timezoneOffset,
      chartData: chartData as unknown as object,
    });
  }

  const inserted = await db
    .select()
    .from(profilesTable)
    .where(eq(profilesTable.id, id))
    .limit(1);
  return inserted[0];
}

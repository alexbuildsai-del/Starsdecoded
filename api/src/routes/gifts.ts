import { Router, type Request, type Response } from "express";
import { randomUUID } from "node:crypto";
import { and, desc, eq, gt, isNull } from "drizzle-orm";
import type { z } from "zod";
import { db, creditsTable, inviteTokensTable, type InviteToken } from "@workspace/db";
import {
  ChangeGiftAddressBody,
  CreateGiftBody,
  createGiftBodyNoteMax,
  type ListGiftsResponseItem,
} from "@workspace/api-zod";
import { mintInviteToken } from "../lib/inviteToken.js";
import { holdCredit, returnExpiredHolds, returnHeldCredit } from "../lib/credits.js";
import { sendGiftEmail, sendGiftReminder } from "../lib/mailer.js";
import { firstNameOf } from "../lib/names.js";
import { publicWebBase } from "../lib/waitlist.js";

type Gift = z.infer<typeof ListGiftsResponseItem>;

const router = Router();

const DAY_MS = 24 * 60 * 60 * 1000;
const GIFT_TTL_MS = 30 * DAY_MS; // ADR-123, reading 8
const REMIND_EVERY_MS = DAY_MS;

function giftState(row: Pick<InviteToken, "claimedAt" | "revokedAt" | "expiresAt">, now: Date): Gift["state"] {
  if (row.claimedAt) return "claimed";
  if (row.revokedAt || row.expiresAt.getTime() <= now.getTime()) return "returned";
  return "waiting";
}

function remindedRecently(gift: InviteToken, now: Date): boolean {
  return !!gift.remindedAt && now.getTime() - gift.remindedAt.getTime() < REMIND_EVERY_MS;
}

// Dates only, never time left (ADR-127). A claimed gift stops at "claimed": who took it and
// what they write next stay theirs until they share it (ADR-139).
function toGift(row: InviteToken, creditStatus: string | null, now: Date): Gift {
  const state = giftState(row, now);
  return {
    id: row.id,
    recipientName: row.recipientName ?? "",
    email: row.email,
    note: row.note,
    sentAt: row.createdAt.toISOString(),
    returnsAt: row.expiresAt.toISOString(),
    remindedAt: row.remindedAt?.toISOString() ?? null,
    state,
    creditHeld: state === "waiting" && creditStatus === "held",
  };
}

// The same link a send carries, so ClaimPage reads both alike.
function claimUrlFor(token: string): string {
  return `${publicWebBase()}/claim?token=${encodeURIComponent(token)}`;
}

// A throw from the mailer is a send that did not happen, so the gift's own fallbacks still run.
function mailed(send: Promise<boolean>, req: Request, giftId: string): Promise<boolean> {
  return send.catch((err: unknown) => {
    req.log.warn({ err, giftId }, "[gift-email] the mailer threw");
    return false;
  });
}

// Anyone but the giver, signed out included, meets the same 404 as a gift that does not exist.
async function ownGift(userId: string, id: string): Promise<InviteToken | null> {
  const [row] = await db
    .select()
    .from(inviteTokensTable)
    .where(
      and(
        eq(inviteTokensTable.id, id),
        eq(inviteTokensTable.kind, "gift"),
        eq(inviteTokensTable.createdByUserId, userId),
      ),
    )
    .limit(1);
  return row ?? null;
}

// A gift that never went out leaves nothing behind: no waiting point on the orbit, no credit held.
async function discard(giftId: string): Promise<void> {
  await returnHeldCredit(giftId);
  await db.delete(inviteTokensTable).where(eq(inviteTokensTable.id, giftId));
}

function notFound(res: Response) {
  return res.status(404).json({ error: "not_found", message: "We couldn't find that gift." });
}

function alreadyClaimed(res: Response) {
  return res
    .status(409)
    .json({ error: "already_claimed", message: "This gift was claimed, so it can't be taken back." });
}

function refuseReminder(res: Response, gift: InviteToken | null, now: Date) {
  if (!gift || giftState(gift, now) !== "waiting") {
    return res.status(404).json({ error: "not_found", message: "This gift isn't waiting any more." });
  }
  // No time left in the refusal and no Retry-After: dates only (ADR-127).
  return res
    .status(429)
    .json({ error: "rate_limited", message: "You sent a reminder in the last day. You can send one a day." });
}

router.get("/gifts", async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.json([]);
  try {
    await returnExpiredHolds();
    const now = new Date();
    // A claimed gift keeps its credit id, but that credit is the recipient's now: the join
    // reads only credits still in the giver's hands, so their ledger never reaches this list (ADR-139).
    const rows = await db
      .select({ gift: inviteTokensTable, creditStatus: creditsTable.status })
      .from(inviteTokensTable)
      .leftJoin(
        creditsTable,
        and(
          eq(inviteTokensTable.creditId, creditsTable.id),
          eq(creditsTable.userId, inviteTokensTable.createdByUserId),
        ),
      )
      .where(and(eq(inviteTokensTable.createdByUserId, userId), eq(inviteTokensTable.kind, "gift")))
      .orderBy(desc(inviteTokensTable.createdAt));
    return res.json(rows.map((r) => toGift(r.gift, r.creditStatus, now)));
  } catch (err) {
    req.log.error({ err }, "Failed to list gifts");
    return res
      .status(500)
      .json({ error: "internal_error", message: "We couldn't load your gifts. Try again in a few minutes." });
  }
});

router.post("/gifts", async (req, res) => {
  const userId = req.userId;
  if (!userId) {
    return res.status(401).json({ error: "unauthorized", message: "Sign in to gift a report." });
  }
  const parsed = CreateGiftBody.safeParse(req.body);
  const recipientName = parsed.success ? parsed.data.recipientName.trim() : "";
  if (!parsed.success || !recipientName) {
    return res.status(400).json({
      error: "validation_error",
      message: `Add their first name and email. The note can be up to ${createGiftBodyNoteMax} characters.`,
    });
  }
  const email = parsed.data.email.toLowerCase();
  const note = parsed.data.note?.trim() || null;

  try {
    const giverFirstName = await firstNameOf(userId);
    // A hold that lapsed is back in the balance before a new one is taken from it.
    await returnExpiredHolds();

    const { token, tokenHash } = mintInviteToken();
    const sentAt = new Date();
    const claimUrl = claimUrlFor(token);
    const [row] = await db
      .insert(inviteTokensTable)
      .values({
        id: randomUUID(),
        tokenHash,
        email,
        kind: "gift",
        profileId: null,
        recipientName,
        note,
        createdByUserId: userId,
        createdBySessionId: req.sessionId,
        expiresAt: new Date(sentAt.getTime() + GIFT_TTL_MS),
        createdAt: sentAt,
      })
      .returning();

    let creditId: string | null;
    try {
      // MB-6 provisional: null under the soft pass (holdCredit logs it), and the gift still goes
      // with creditHeld false until checkout exists; the web keeps the zero state (ADR-138).
      creditId = await holdCredit(userId, row.id);
    } catch (err) {
      await discard(row.id);
      throw err;
    }

    const emailDelivered = await mailed(
      sendGiftEmail({ to: email, giverFirstName, recipientFirstName: recipientName, note, claimUrl }),
      req,
      row.id,
    );
    // The gift stands once its email was tried, since a reminder mints a new link; a failed
    // bookkeeping write must not turn a sent gift into an error the giver would retry.
    await db
      .update(inviteTokensTable)
      .set({ emailDelivered })
      .where(eq(inviteTokensTable.id, row.id))
      .catch((err: unknown) => req.log.warn({ err, giftId: row.id }, "could not record the gift email's delivery"));
    if (!emailDelivered) {
      req.log.warn({ giftId: row.id }, "[gift-email] not sent; the giver can send a reminder");
    }

    // ADR-123: the raw token lives in this one response only, to the giver who just made
    // it; GET /gifts stores only its hash, so a later list can never rebuild the link.
    return res.status(201).json({ ...toGift(row, creditId ? "held" : null, new Date()), claimUrl, emailDelivered });
  } catch (err) {
    req.log.error({ err }, "Failed to create a gift");
    return res
      .status(500)
      .json({ error: "internal_error", message: "We couldn't send the gift. Try again in a few minutes." });
  }
});

router.post("/gifts/:id/remind", async (req, res) => {
  const userId = req.userId;
  if (!userId) return notFound(res);
  try {
    const gift = await ownGift(userId, req.params.id);
    if (!gift) return notFound(res);
    const now = new Date();
    if (giftState(gift, now) !== "waiting" || remindedRecently(gift, now)) return refuseReminder(res, gift, now);

    const giverFirstName = await firstNameOf(userId);
    // Only a token's hash is stored, so a reminder carries a fresh link and the old one stops
    // (reading 8). The swap is guarded on the old hash: of two reminders at once, one goes.
    const { token, tokenHash } = mintInviteToken();
    const swapped = await db
      .update(inviteTokensTable)
      .set({ tokenHash, remindedAt: now })
      .where(
        and(
          eq(inviteTokensTable.id, gift.id),
          eq(inviteTokensTable.tokenHash, gift.tokenHash),
          isNull(inviteTokensTable.claimedAt),
          isNull(inviteTokensTable.revokedAt),
          gt(inviteTokensTable.expiresAt, now),
        ),
      )
      .returning({ id: inviteTokensTable.id });
    if (!swapped.length) return refuseReminder(res, await ownGift(userId, gift.id), new Date());

    const delivered = await mailed(
      sendGiftReminder({
        to: gift.email,
        giverFirstName,
        recipientFirstName: gift.recipientName ?? "",
        claimUrl: claimUrlFor(token),
      }),
      req,
      gift.id,
    );
    if (!delivered) {
      // The link the recipient already has keeps working when its replacement never arrived.
      await db
        .update(inviteTokensTable)
        .set({ tokenHash: gift.tokenHash, remindedAt: gift.remindedAt })
        .where(and(eq(inviteTokensTable.id, gift.id), eq(inviteTokensTable.tokenHash, tokenHash)));
      req.log.warn({ giftId: gift.id }, "[gift-email] reminder not sent; the earlier link stands");
      return res
        .status(502)
        .json({ error: "email_failed", message: "We couldn't send the reminder. Try again in a few minutes." });
    }
    await db
      .update(inviteTokensTable)
      .set({ emailDelivered: true })
      .where(eq(inviteTokensTable.id, gift.id))
      .catch((err: unknown) => req.log.warn({ err, giftId: gift.id }, "could not record the reminder's delivery"));
    return res.status(204).end();
  } catch (err) {
    req.log.error({ err }, "Failed to remind a gift");
    return res
      .status(500)
      .json({ error: "internal_error", message: "We couldn't send the reminder. Try again in a few minutes." });
  }
});

export const GIFT_CHANGE_LINES = {
  invalid: "Check the email address and try again.",
  sameAddress: "That's the address the gift already went to. Add the new one.",
  claimed: "This gift was claimed, so its address can't change.",
  returned: "This gift was returned, so its address can't change.",
  raced: "The address just changed. Check it before you change it again.",
  failed: "We couldn't change the address. Try again in a few minutes.",
} as const;

/** Only a waiting gift's address can change; once claimed or returned it stays (ADR-237, reading 7). */
export function giftChangeRefusal(row: Pick<InviteToken, "claimedAt" | "revokedAt" | "expiresAt">, now: Date): string | null {
  const state = giftState(row, now);
  if (state === "claimed") return GIFT_CHANGE_LINES.claimed;
  if (state === "returned") return GIFT_CHANGE_LINES.returned;
  return null;
}

/** The giver's credit held for the gift, read as GET /gifts reads it, so the answer says what the list will. */
async function creditStatusOf(gift: InviteToken): Promise<string | null> {
  if (!gift.creditId || !gift.createdByUserId) return null;
  const [credit] = await db
    .select({ status: creditsTable.status })
    .from(creditsTable)
    .where(and(eq(creditsTable.id, gift.creditId), eq(creditsTable.userId, gift.createdByUserId)))
    .limit(1);
  return credit?.status ?? null;
}

// Change address (ADR-237, MB-109): the gift itself stays, with its credit, its note and its return date.
router.post("/gifts/:id/change-address", async (req, res) => {
  const userId = req.userId;
  if (!userId) return notFound(res);
  const body = ChangeGiftAddressBody.safeParse(req.body ?? {});
  if (!body.success) {
    return res.status(400).json({ error: "validation_error", message: GIFT_CHANGE_LINES.invalid });
  }
  try {
    const gift = await ownGift(userId, req.params.id);
    if (!gift) return notFound(res);
    const now = new Date();
    const refusal = giftChangeRefusal(gift, now);
    if (refusal) return res.status(409).json({ error: "not_waiting", message: refusal });
    const email = body.data.email.trim().toLowerCase();
    if (email === gift.email.trim().toLowerCase()) {
      return res.status(400).json({ error: "validation_error", message: GIFT_CHANGE_LINES.sameAddress });
    }

    const giverFirstName = await firstNameOf(userId);
    // Only a token's hash is stored, so the swap is the revocation: the old link finds no gift
    // from this statement on. Guarded on the old hash, as a reminder's swap is, so a claim, a
    // reminder or a second change racing this one leaves one winner.
    const { token, tokenHash } = mintInviteToken();
    const [changed] = await db
      .update(inviteTokensTable)
      .set({ tokenHash, email, emailDelivered: null })
      .where(
        and(
          eq(inviteTokensTable.id, gift.id),
          eq(inviteTokensTable.tokenHash, gift.tokenHash),
          isNull(inviteTokensTable.claimedAt),
          isNull(inviteTokensTable.revokedAt),
          gt(inviteTokensTable.expiresAt, now),
        ),
      )
      .returning();
    if (!changed) {
      const after = await ownGift(userId, gift.id);
      if (!after) return notFound(res);
      return res
        .status(409)
        .json({ error: "not_waiting", message: giftChangeRefusal(after, new Date()) ?? GIFT_CHANGE_LINES.raced });
    }

    // The whole gift, cover and note, since the person at the new address never saw the first email. A failed
    // email keeps the change: the old address must not keep a link, and the giver has the copy link instead.
    const claimUrl = claimUrlFor(token);
    const emailDelivered = await mailed(
      sendGiftEmail({
        to: email,
        giverFirstName,
        recipientFirstName: changed.recipientName ?? "",
        note: changed.note,
        claimUrl,
      }),
      req,
      changed.id,
    );
    await db
      .update(inviteTokensTable)
      .set({ emailDelivered })
      .where(eq(inviteTokensTable.id, changed.id))
      .catch((err: unknown) => req.log.warn({ err, giftId: changed.id }, "could not record the gift email's delivery"));
    if (!emailDelivered) {
      req.log.warn({ giftId: changed.id }, "[gift-email] not sent to the new address; the giver has the copy link");
    }
    return res.json({ ...toGift(changed, await creditStatusOf(changed), new Date()), claimUrl, emailDelivered });
  } catch (err) {
    req.log.error({ err }, "Failed to change a gift's address");
    return res.status(500).json({ error: "internal_error", message: GIFT_CHANGE_LINES.failed });
  }
});

router.delete("/gifts/:id", async (req, res) => {
  const userId = req.userId;
  if (!userId) return notFound(res);
  try {
    const gift = await ownGift(userId, req.params.id);
    if (!gift) return notFound(res);
    if (gift.claimedAt) return alreadyClaimed(res);

    if (giftState(gift, new Date()) === "waiting") {
      // Revoked before the credit moves back, so a claim racing this one can no longer take it.
      const revoked = await db
        .update(inviteTokensTable)
        .set({ revokedAt: new Date() })
        .where(
          and(
            eq(inviteTokensTable.id, gift.id),
            isNull(inviteTokensTable.claimedAt),
            isNull(inviteTokensTable.revokedAt),
          ),
        )
        .returning({ id: inviteTokensTable.id });
      if (!revoked.length && (await ownGift(userId, gift.id))?.claimedAt) return alreadyClaimed(res);
    }
    await returnHeldCredit(gift.id);
    return res.status(204).end();
  } catch (err) {
    req.log.error({ err }, "Failed to take a gift back");
    return res
      .status(500)
      .json({ error: "internal_error", message: "We couldn't take the gift back. Try again in a few minutes." });
  }
});

export default router;

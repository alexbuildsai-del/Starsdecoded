import { Router } from "express";
import { and, eq } from "drizzle-orm";
import { db, reportsTable } from "@workspace/db";
import { ShareBackBody, ShareMyReportBody, StopShareParams, type ListSharesResponseItem } from "@workspace/api-zod";
import type { z } from "zod";
import {
  grantShare,
  ownChartOf,
  revokeShare,
  shareBackOffered,
  sharerOf,
  sharesOf,
  type ShareRow,
} from "../lib/shares.js";
import { sendShareEmail } from "../lib/mailer.js";
import { validationFailure } from "../lib/validation.js";
import { createInvite, emailOfUser, giverFirstName, recordDelivery } from "./invites.js";

type Share = z.infer<typeof ListSharesResponseItem>;

const router = Router();

export const SHARE_LINES = {
  signIn: "Sign in to share your report.",
  invalid: "Check the email address and try again.",
  ownAddress: "That's your own email. Add the email of the person you're sharing with.",
  noOwnReport: "You don't have your own Personal report yet. Get yours first, then share it.",
  notReady: "Your report isn't finished yet. Share it once it's ready.",
  alreadyShared: "You've already shared your report with this email.",
  failed: "We couldn't share your report. Try again in a few minutes.",
  listFailed: "We couldn't load who you've shared your report with. Try again in a few minutes.",
  stopNotFound: "We couldn't find that share. It may have stopped already.",
  stopFailed: "We couldn't stop sharing. Try again in a few minutes.",
  backNotShared: "This report isn't shared with you any more.",
  backAlready: (name: string | null) => `${name ?? "They"} can already read your report.`,
} as const;

type Refusal = { error: "no_own_report" | "not_ready"; message: string };

/**
 * Only the reader's own Personal report goes, and only once it is finished (reading 3). Short of that, either no
 * chart is marked as theirs or it has no report yet, or its report is still writing or failed.
 */
export function ownReportRefusal(hasOwnChart: boolean, hasReport: boolean): Refusal {
  return hasOwnChart && hasReport
    ? { error: "not_ready", message: SHARE_LINES.notReady }
    : { error: "no_own_report", message: SHARE_LINES.noOwnReport };
}

/** Whether a chart has a Personal report at all, which tells "not yours yet" from "not finished yet". */
async function hasNatalReport(profileId: string): Promise<boolean> {
  const [report] = await db
    .select({ id: reportsTable.id })
    .from(reportsTable)
    .where(and(eq(reportsTable.profileId, profileId), eq(reportsTable.type, "natal")))
    .limit(1);
  return !!report;
}

async function ownReport(userId: string): Promise<{ profileId: string } | { refusal: Refusal }> {
  const own = await ownChartOf(userId);
  if (own?.finished) return { profileId: own.profileId };
  return { refusal: ownReportRefusal(!!own, own ? await hasNatalReport(own.profileId) : false) };
}

/** A reader appears by first name once they claim, never by address alone (ADR-135); a waiting link has no reader yet. */
async function toShares(rows: ShareRow[]): Promise<Share[]> {
  const names = new Map<string, string | null>();
  for (const userId of new Set(rows.map((r) => r.readerUserId).filter((u): u is string => !!u))) {
    names.set(userId, await giverFirstName(userId));
  }
  return rows.map((r) => ({
    id: r.id,
    email: r.email,
    readerName: r.readerUserId ? (names.get(r.readerUserId) ?? null) : null,
    state: r.state,
    sentAt: r.sentAt.toISOString(),
  }));
}

function sameAddress(a: string | null, b: string): boolean {
  return !!a && a.trim().toLowerCase() === b.trim().toLowerCase();
}

// GET /shares — who the reader's own Personal report is shared with, for their quick look (ADR-235).
router.get("/shares", async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.json([]);
  try {
    return res.json(await toShares(await sharesOf(userId)));
  } catch (err) {
    req.log.error({ err }, "Failed to list shares");
    return res.status(500).json({ error: "internal_error", message: SHARE_LINES.listFailed });
  }
});

// POST /shares — Share my report: a `share` link on the send-and-claim path, 7 days, counted with the sends (ADR-235).
router.post("/shares", async (req, res) => {
  const userId = req.userId;
  // A grant joins two accounts, and only an account can stop it later.
  if (!userId) return res.status(401).json({ error: "unauthorized", message: SHARE_LINES.signIn });
  const parsed = ShareMyReportBody.safeParse(req.body ?? {});
  if (!parsed.success) return res.status(400).json({ error: "validation_error", message: SHARE_LINES.invalid });
  const email = parsed.data.email.trim().toLowerCase();

  try {
    const own = await ownReport(userId);
    if ("refusal" in own) return res.status(409).json(own.refusal);
    if (sameAddress(await emailOfUser(req, userId), email)) {
      return res.status(400).json({ error: "validation_error", message: SHARE_LINES.ownAddress });
    }
    if ((await sharesOf(userId)).some((s) => sameAddress(s.email, email))) {
      return res.status(409).json({ error: "already_shared", message: SHARE_LINES.alreadyShared });
    }

    const invite = await createInvite(req, "share", { email, profileId: own.profileId, relationshipId: null });
    // A failed email still answers 201, as a send does: the sharer gets the copy link instead.
    const emailDelivered = await sendShareEmail({
      to: invite.email,
      sharerFirstName: await giverFirstName(userId),
      claimUrl: invite.claimUrl,
    });
    await recordDelivery(req, invite.id, emailDelivered);
    return res.status(201).json({
      id: invite.id,
      email: invite.email,
      claimUrl: invite.claimUrl,
      expiresAt: invite.expiresAt,
      emailDelivered,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to share a report");
    return res.status(500).json({ error: "internal_error", message: SHARE_LINES.failed });
  }
});

// POST /shares/back — Share yours back: one tap, no email, since both people are known (ADR-235, reading 4).
router.post("/shares/back", async (req, res) => {
  const parsed = ShareBackBody.safeParse(req.body ?? {});
  if (!parsed.success) return res.status(400).json(validationFailure(parsed.error));
  const userId = req.userId;
  if (!userId) return res.status(404).json({ error: "not_found", message: SHARE_LINES.backNotShared });
  const { profileId } = parsed.data;

  try {
    const sharer = await sharerOf(userId, profileId);
    if (!sharer) return res.status(404).json({ error: "not_found", message: SHARE_LINES.backNotShared });
    const own = await ownReport(userId);
    if ("refusal" in own) return res.status(409).json(own.refusal);
    // The same offer the claim and the circle show, so the route refuses exactly what neither offers.
    if (!(await shareBackOffered(userId, profileId))) {
      return res
        .status(409)
        .json({ error: "already_shared", message: SHARE_LINES.backAlready(await giverFirstName(sharer)) });
    }

    const id = await grantShare(db, { profileId: own.profileId, ownerUserId: userId, readerUserId: sharer, inviteId: null });
    const row = (await sharesOf(userId)).find((s) => s.id === id);
    const [share] = await toShares([
      row ?? { id, profileId: own.profileId, state: "active", email: "", readerUserId: sharer, sentAt: new Date() },
    ]);
    return res.status(201).json(share);
  } catch (err) {
    req.log.error({ err }, "Failed to share a report back");
    return res.status(500).json({ error: "internal_error", message: SHARE_LINES.failed });
  }
});

// DELETE /shares/:id — Stop sharing, the sharer's own and at once (ADR-235, reading 5).
router.delete("/shares/:id", async (req, res) => {
  const userId = req.userId;
  const params = StopShareParams.safeParse(req.params);
  if (!userId || !params.success) {
    return res.status(404).json({ error: "not_found", message: SHARE_LINES.stopNotFound });
  }
  try {
    if (!(await revokeShare(params.data.id, userId))) {
      return res.status(404).json({ error: "not_found", message: SHARE_LINES.stopNotFound });
    }
    return res.status(204).end();
  } catch (err) {
    req.log.error({ err }, "Failed to stop sharing");
    return res.status(500).json({ error: "internal_error", message: SHARE_LINES.stopFailed });
  }
});

export default router;

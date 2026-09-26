import { randomUUID } from "node:crypto";
import { Router, type IRouter } from "express";
import { JoinWaitlistBody } from "@workspace/api-zod";
import { db, waitlistSignupsTable } from "@workspace/db";
import { RateLimiter, clientKey, normaliseEmail, tag } from "../lib/waitlist.js";

// Mounted in app.ts ahead of the session and sign-in middleware: joining the
// list sets no cookie and reads no account (ADR-141).
const router: IRouter = Router();

// Twenty in ten minutes lets a household or an office behind one address sign
// up together, and holds a script to two a minute.
const perClient = new RateLimiter(20, 10 * 60_000);

router.post("/waitlist", async (req, res) => {
  res.set("Cache-Control", "no-store");
  if (!perClient.take(clientKey(req.headers, req.ip))) {
    return res.status(429).json({ error: "rate_limited", message: "Too many sign-ups from here. Try again in a few minutes." });
  }
  // A phone's keyboard often leaves a space after the address it filled in.
  const email: unknown = req.body?.email;
  const parsed = JoinWaitlistBody.safeParse({ ...req.body, email: typeof email === "string" ? email.trim() : email });
  if (!parsed.success) {
    const badEmail = parsed.error.issues.some((issue) => issue.path[0] === "email");
    return res.status(400).json({
      error: "validation_error",
      message: badEmail ? "Enter an email address, like name@example.com." : "Something on the form is missing. Reload the page and try again.",
    });
  }
  const body = parsed.data;
  if (body.website) return res.json({ status: "joined" });
  try {
    await db
      .insert(waitlistSignupsTable)
      .values({
        id: randomUUID(),
        email: normaliseEmail(body.email),
        consent: body.consent,
        source: tag(body.source, 32),
        utmSource: tag(body.utmSource),
        utmMedium: tag(body.utmMedium),
        utmCampaign: tag(body.utmCampaign),
      })
      .onConflictDoNothing({ target: waitlistSignupsTable.email });
  } catch (err) {
    req.log.error({ err }, "waitlist insert failed");
    return res.status(500).json({ error: "server_error", message: "We couldn't save your address. Try again in a few minutes." });
  }
  return res.json({ status: "joined" });
});

export default router;

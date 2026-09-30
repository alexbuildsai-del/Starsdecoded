import { Router, type IRouter } from "express";
import { ConfirmWaitlistBody, JoinWaitlistBody } from "@workspace/api-zod";
import { sendWaitlistConfirmEmail } from "../lib/mailer.js";
import {
  RateLimiter,
  clientKey,
  confirmUrl,
  confirmWaitlist,
  dbWaitlistStore,
  joinWaitlist,
  waitlistClosed,
  type ConfirmMail,
} from "../lib/waitlist.js";

// Mounted in app.ts ahead of the session and sign-in middleware: joining the
// list and confirming it set no cookie and read no account (ADR-141, 145).
const router: IRouter = Router();

// Twenty in ten minutes lets a household or an office behind one address sign
// up together, and holds a script to two a minute.
const perClient = new RateLimiter(20, 10 * 60_000);

router.post("/waitlist", async (req, res) => {
  res.set("Cache-Control", "no-store");
  if (waitlistClosed()) {
    return res.status(503).json({ error: "waitlist_closed", message: "Sign-ups aren't open yet. Check back soon." });
  }
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
  if (body.website) return res.json({ status: "check_email" });
  let mail: ConfirmMail | null;
  try {
    mail = await joinWaitlist(dbWaitlistStore, body);
  } catch (err) {
    req.log.error({ err }, "waitlist join failed");
    return res.status(500).json({ error: "server_error", message: "We couldn't save your address. Try again in a few minutes." });
  }
  if (mail) {
    const { to, token, expiresOn } = mail;
    // Sent once the answer is out, so how long the answer takes says nothing about whether a link went out.
    setImmediate(() => {
      sendWaitlistConfirmEmail({ to, confirmUrl: confirmUrl(token), expiresOn }).catch((err: unknown) =>
        req.log.warn({ err }, "waitlist confirmation could not be built"),
      );
    });
  }
  // One answer for a new, waiting, confirmed or held-back address, so nobody learns who is listed (ADR-145).
  return res.json({ status: "check_email" });
});

router.post("/waitlist/confirm", async (req, res) => {
  res.set("Cache-Control", "no-store");
  // The contract has no 400 here: a malformed token is as unknown as a wrong one.
  const parsed = ConfirmWaitlistBody.safeParse(req.body);
  let confirmed: boolean;
  try {
    confirmed = await confirmWaitlist(dbWaitlistStore, parsed.success ? parsed.data.token : "");
  } catch (err) {
    req.log.error({ err }, "waitlist confirm failed");
    return res.status(500).json({ error: "server_error", message: "We couldn't confirm your email just now. Try again in a few minutes." });
  }
  if (confirmed) return res.json({ status: "confirmed" });
  return res.status(404).json({
    error: "not_found",
    message: "That link doesn't work. It may have expired, or a newer email replaced it. Enter your email and we'll send a new one.",
  });
});

export default router;

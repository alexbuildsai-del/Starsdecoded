/**
 * /checkout's server (ADR-274): the prices any page reads, the session behind Pay, where a purchase stands for the page
 * that waits on it, and the Customer Portal. routes/index.ts stands the account check and each count ahead of the two
 * that call Stripe, so a refusal there reaches no route here.
 */
import { Router, type IRouter, type RequestHandler } from "express";
import Stripe from "stripe";
import {
  CreateCheckoutBody,
  GetCheckoutOptionsQueryParams,
  GetCheckoutParams,
  OpenBillingPortalBody,
} from "@workspace/api-zod";
import {
  checkoutOptions,
  checkoutState,
  openPortal,
  startCheckout,
  type CheckoutDeps,
  type CheckoutOutcome,
  type PortalOutcome,
} from "../lib/purchases.js";
import { validationFailure } from "../lib/validation.js";
import { NO_PERSONAL_REPORT } from "./timeline.js";

export const BUY_SIGN_IN_LINE = "Sign in to pay.";
export const PORTAL_SIGN_IN_LINE = "Sign in to manage your payments.";
export const TICK_REQUIRED_LINE = "Tick the box to agree before you pay.";
export const BAD_RETURN_LINE = "We can't send you back to that page. Start again from your dashboard.";
/** Timeline's own words: the plan refusals speak of Timeline, never of credits (R16-29). */
export const ALREADY_SUBSCRIBED_LINE = "You already have Timeline. You can manage it on your Account page.";
export const CHECKOUT_UNAVAILABLE_LINE = "Checkout isn't open right now. Try again later.";
export const PORTAL_UNAVAILABLE_LINE = "Your billing page isn't open right now. Try again later.";
export const NO_CUSTOMER_LINE = "You haven't paid for anything yet, so there's nothing to manage.";
export const PURCHASE_NOT_FOUND_LINE = "We couldn't find this payment.";

type Answer = { status: number; body: unknown };

export function checkoutAnswerOf(outcome: CheckoutOutcome): Answer {
  switch (outcome.kind) {
    case "started":
      return { status: 201, body: outcome.started };
    case "tick_required":
      return { status: 400, body: { error: "tick_required", message: TICK_REQUIRED_LINE } };
    case "bad_return":
      return { status: 400, body: { error: "bad_return", message: BAD_RETURN_LINE } };
    case "no_personal_report":
      return { status: 409, body: NO_PERSONAL_REPORT };
    case "already_subscribed":
      return { status: 409, body: { error: "already_subscribed", message: ALREADY_SUBSCRIBED_LINE } };
    case "unavailable":
      return { status: 503, body: { error: "checkout_unavailable", message: CHECKOUT_UNAVAILABLE_LINE } };
  }
}

export function portalAnswerOf(outcome: PortalOutcome): Answer {
  switch (outcome.kind) {
    case "opened":
      return { status: 200, body: { url: outcome.url } };
    case "bad_return":
      return { status: 400, body: { error: "bad_return", message: BAD_RETURN_LINE } };
    case "no_customer":
      return { status: 409, body: { error: "no_customer", message: NO_CUSTOMER_LINE } };
    case "unavailable":
      return { status: 503, body: { error: "checkout_unavailable", message: PORTAL_UNAVAILABLE_LINE } };
  }
}

function signedIn(message: string): RequestHandler {
  return (req, res, next) => {
    if (req.userId) return next();
    res.status(401).json({ error: "sign_in_required", message });
  };
}

/** Buying belongs to an account on every host (reading 1): ahead of its count, so a signed-out request takes none. */
export const signedInToBuy = signedIn(BUY_SIGN_IN_LINE);
export const signedInForPortal = signedIn(PORTAL_SIGN_IN_LINE);

/**
 * A Stripe error carries Stripe's whole reply, the objects it names and its headers, which can hold what the buyer typed,
 * so only its kind, code, parameter and request id are logged; any other error goes to the logger, which scrubs it.
 */
function failureOf(err: unknown): unknown {
  if (!(err instanceof Stripe.errors.StripeError)) return err;
  return { type: err.type, code: err.code, param: err.param, statusCode: err.statusCode, requestId: err.requestId };
}

/** The router on its live dependencies; a test passes its own Stripe and rows. */
export function paymentsRouter(over: Partial<CheckoutDeps> = {}): IRouter {
  const router: IRouter = Router();

  // Registered before /checkout/:purchaseId, which would otherwise read "options" as an id.
  router.get("/checkout/options", async (req, res) => {
    const query = GetCheckoutOptionsQueryParams.safeParse(req.query);
    // A slug that isn't a string names no campaign, so the prices stay full and the page still loads.
    const slug = query.success ? query.data.c?.trim() || null : null;
    try {
      return res.json(await checkoutOptions(slug, over));
    } catch (err) {
      req.log.error({ err }, "checkout options could not be read");
      return res.status(500).json({ error: "internal_error", message: "We couldn't load the prices. Try again in a minute." });
    }
  });

  router.post("/checkout", signedInToBuy, async (req, res) => {
    const userId = req.userId;
    if (!userId) return;
    const parsed = CreateCheckoutBody.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(validationFailure(parsed.error));
    try {
      const outcome = await startCheckout({ userId, sessionId: req.sessionId }, parsed.data, over);
      if (outcome.kind === "unavailable") req.log.warn({ reason: outcome.reason }, "checkout is not available");
      const { status, body } = checkoutAnswerOf(outcome);
      return res.status(status).json(body);
    } catch (err) {
      req.log.error({ err: failureOf(err) }, "checkout could not start");
      return res.status(500).json({ error: "internal_error", message: "We couldn't start checkout. Try again in a minute." });
    }
  });

  router.get("/checkout/:purchaseId", async (req, res) => {
    const params = GetCheckoutParams.safeParse(req.params);
    if (!params.success) return res.status(404).json({ error: "not_found", message: PURCHASE_NOT_FOUND_LINE });
    try {
      const state = await checkoutState({ userId: req.userId, sessionId: req.sessionId }, params.data.purchaseId, over);
      if (!state) return res.status(404).json({ error: "not_found", message: PURCHASE_NOT_FOUND_LINE });
      return res.json(state);
    } catch (err) {
      req.log.error({ err }, "a purchase could not be read");
      return res
        .status(500)
        .json({ error: "internal_error", message: "We couldn't check your payment. Try again in a minute." });
    }
  });

  router.post("/billing/portal", signedInForPortal, async (req, res) => {
    const userId = req.userId;
    if (!userId) return;
    const parsed = OpenBillingPortalBody.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(validationFailure(parsed.error));
    try {
      const outcome = await openPortal({ userId, sessionId: req.sessionId }, parsed.data, over);
      if (outcome.kind === "unavailable") req.log.warn({ reason: outcome.reason }, "the billing page is not available");
      const { status, body } = portalAnswerOf(outcome);
      return res.status(status).json(body);
    } catch (err) {
      req.log.error({ err: failureOf(err) }, "the billing page could not open");
      return res
        .status(500)
        .json({ error: "internal_error", message: "We couldn't open your billing page. Try again in a minute." });
    }
  });

  return router;
}

export default paymentsRouter();

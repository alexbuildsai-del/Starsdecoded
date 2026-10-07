import express, { Router, type IRouter } from "express";
import Stripe from "stripe";
import { handleStripeEvent, type EventOutcome, type FulfilmentDeps } from "../lib/fulfilment.js";
import { webhookSecret } from "../lib/stripe.js";

export interface WebhookDeps {
  secret: () => string | null;
  handle: (event: Stripe.Event, over: Partial<FulfilmentDeps>) => Promise<EventOutcome>;
}

/** The event Stripe signed, or null for anything else. */
function verified(body: unknown, signature: unknown, secret: string): Stripe.Event | null {
  if (typeof signature !== "string" || !Buffer.isBuffer(body)) return null;
  try {
    return Stripe.webhooks.constructEvent(body, signature, secret);
  } catch {
    // The SDK's error holds the payload and the header whole, so it goes unlogged.
    return null;
  }
}

// A failure by its class and its code, which name the fault and never what the payload held.
function failureOf(err: unknown): { failure: string; code?: string } {
  const failure = err instanceof Error ? err.name : typeof err;
  const cause = err instanceof Error ? (err.cause as { code?: unknown } | undefined) : undefined;
  const code = (err as { code?: unknown } | null)?.code ?? cause?.code;
  return typeof code === "string" && /^[\w.-]{1,40}$/.test(code) ? { failure, code } : { failure };
}

/**
 * POST /api/stripe/webhook, where Stripe sends its events (ADR-275). Mounted in app.ts as reading 13 says: ahead of the
 * origin guard, the parsers, the session and the prelaunch gate, since Stripe posts with no Origin and no cookie, and
 * on both hosts. The signature covers the body's bytes as sent, so the route reads them raw, up to 1 MB, and nothing
 * is written until it passes. A refused signature is a bare 400; an event that fails is a 500, which Stripe sends again.
 */
export function stripeWebhookRouter(over: Partial<WebhookDeps> = {}): IRouter {
  const { secret = () => webhookSecret(), handle = handleStripeEvent } = over;
  const router: IRouter = Router();

  router.post("/stripe/webhook", express.raw({ type: () => true, limit: "1mb" }), async (req, res) => {
    const signingSecret = secret();
    if (!signingSecret) {
      req.log.warn("stripe webhook: no signing secret on this host");
      return res.status(503).json({ error: "webhook_unavailable" });
    }
    const event = verified(req.body, req.headers["stripe-signature"], signingSecret);
    if (!event) {
      req.log.warn("stripe webhook: signature refused");
      return res.status(400).json({ error: "bad_signature" });
    }

    try {
      const outcome = await handle(event, { log: req.log });
      req.log.info({ event: event.id, type: event.type, outcome }, "stripe event");
      return res.json({ received: true });
    } catch (err) {
      req.log.error({ event: event.id, type: event.type, ...failureOf(err) }, "stripe event failed");
      return res.status(500).json({ error: "internal_error" });
    }
  });

  return router;
}

export default stripeWebhookRouter();

/**
 * Stripe's one seam (ADR-280): one client on one API version, made from the three keys Railway holds and nothing else,
 * so every Stripe key has one home. A key whose mode is wrong for the host is refused, keyed on APP_ENV and never on a
 * request: a live key off production would charge real cards for a test, and a test key on production would hand out
 * real credits for Stripe's test card.
 */
import Stripe from "stripe";
import { readAppEnv } from "./appEnv.js";

/**
 * The version staging's webhook destination was made with (2026-10-04), so the events Stripe sends have the shapes the
 * SDK's types describe. stripe@22.6.2 is built on it: an SDK on another version stops compiling where the client is
 * made, instead of reading payloads it was not written for.
 */
export const STRIPE_API_VERSION = "2026-08-26.dahlia";

// MB-114 provisional: no VAT registration yet, so every Price includes VAT and checkout leaves Stripe Tax off. A
// registration turns AUTOMATIC_TAX on; the inclusive Prices stay as they are.
export const AUTOMATIC_TAX = false;
export const TAX_BEHAVIOR = "inclusive";

/** sk_ is a full secret key and rk_ a restricted one, the kind Railway holds; both carry their mode. */
const SECRET_KEY = /^[sr]k_(test|live)_\S+$/;
const PUBLISHABLE_KEY = /^pk_(test|live)_\S+$/;
const WEBHOOK_SECRET = /^whsec_\S+$/;

function read(env: NodeJS.ProcessEnv, name: string): string | null {
  return env[name]?.trim() || null;
}

/** Why a key can't be used on this host, or null when it can: production takes live keys, other hosts test keys. */
function keyProblem(env: NodeJS.ProcessEnv, name: string, shape: RegExp, kind: string): string | null {
  const key = read(env, name);
  if (!key) return `${name} is not set`;
  const mode = shape.exec(key)?.[1];
  if (!mode) return `${name} is not a Stripe ${kind}`;
  const production = readAppEnv(env) === "production";
  if (production && mode !== "live") return `${name} is a test key, and production takes only live keys`;
  if (!production && mode !== "test") return `${name} is a live key, and only production takes one`;
  return null;
}

/** A signing secret names no mode: each webhook destination has its own. */
function webhookProblem(env: NodeJS.ProcessEnv): string | null {
  const secret = read(env, "STRIPE_WEBHOOK_SECRET");
  if (!secret) return "STRIPE_WEBHOOK_SECRET is not set";
  return WEBHOOK_SECRET.test(secret) ? null : "STRIPE_WEBHOOK_SECRET is not a webhook signing secret";
}

type StandIn = Pick<Stripe.StripeConfig, "host" | "port" | "protocol">;

/**
 * A local stand-in for Stripe's API, for the tests and the walks. Production never reads it, so no setting there can
 * send a real payment anywhere but Stripe.
 */
function standIn(env: NodeJS.ProcessEnv): StandIn | { problem: string } | null {
  if (readAppEnv(env) === "production") return null;
  const raw = read(env, "STRIPE_API_BASE");
  if (!raw) return null;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { problem: "STRIPE_API_BASE is not an address" };
  }
  if ((url.protocol !== "http:" && url.protocol !== "https:") || url.pathname !== "/" || url.search) {
    return { problem: "STRIPE_API_BASE is not an http or https origin" };
  }
  const protocol = url.protocol === "https:" ? "https" : "http";
  return { protocol, host: url.hostname.replace(/^\[|\]$/g, ""), port: url.port || (protocol === "https" ? 443 : 80) };
}

/** What the client is made from, or why this host can't have one. */
export function stripeSettings(
  env: NodeJS.ProcessEnv = process.env,
): { secret: string; config: Stripe.StripeConfig } | { problem: string } {
  const secret = read(env, "STRIPE_SECRET_KEY");
  const problem = keyProblem(env, "STRIPE_SECRET_KEY", SECRET_KEY, "secret key");
  if (problem || !secret) return { problem: problem ?? "STRIPE_SECRET_KEY is not set" };
  const base = standIn(env);
  if (base && "problem" in base) return base;
  return {
    secret,
    config: {
      apiVersion: STRIPE_API_VERSION,
      // A Stripe call runs inside a buyer's request, so each gives up long before the SDK's 80 s. The SDK retries it
      // twice, and every POST under an idempotency key of its own, so a retry never makes a second object (R-6.2).
      timeout: 20_000,
      ...base,
    },
  };
}

let made: { secret: string; config: string; client: Stripe } | null = null;

/**
 * The one client, or null when this host has no key it may use (stripeReady says why). A process's keys never change,
 * so this is one instance; a test that sets other keys gets a client of its own.
 */
export function stripe(env: NodeJS.ProcessEnv = process.env): Stripe | null {
  const settings = stripeSettings(env);
  if ("problem" in settings) return null;
  const config = JSON.stringify(settings.config);
  if (made?.secret !== settings.secret || made.config !== config) {
    made = { secret: settings.secret, config, client: new Stripe(settings.secret, settings.config) };
  }
  return made.client;
}

export type StripeReadiness = { ok: true; reason: null } | { ok: false; reason: string };

/**
 * Whether this host can take a payment: a secret key it may use, a publishable key of the same mode for the browser,
 * and the webhook's signing secret, without which a paid checkout would never grant its credits (ADR-275).
 */
export function stripeReady(env: NodeJS.ProcessEnv = process.env): StripeReadiness {
  const settings = stripeSettings(env);
  if ("problem" in settings) return { ok: false, reason: settings.problem };
  const reason = keyProblem(env, "STRIPE_PUBLISHABLE_KEY", PUBLISHABLE_KEY, "publishable key") ?? webhookProblem(env);
  return reason ? { ok: false, reason } : { ok: true, reason: null };
}

/**
 * The browser's key, served by GET /checkout/options so that a new key needs no web build; null when this host can't
 * use it.
 */
export function publishableKey(env: NodeJS.ProcessEnv = process.env): string | null {
  return keyProblem(env, "STRIPE_PUBLISHABLE_KEY", PUBLISHABLE_KEY, "publishable key")
    ? null
    : read(env, "STRIPE_PUBLISHABLE_KEY");
}

/** The secret the webhook checks each event's signature with; null when it is missing or isn't one. */
export function webhookSecret(env: NodeJS.ProcessEnv = process.env): string | null {
  return webhookProblem(env) ? null : read(env, "STRIPE_WEBHOOK_SECRET");
}

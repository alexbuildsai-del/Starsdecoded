import type { RequestHandler } from "express";
import { readAppEnv } from "../lib/appEnv.js";

/** Shown where each form shows its errors (reading 18). */
export const SIGN_IN_LINE = "Sign in to write a report.";

/**
 * Writing a report needs an account (ADR-140, R-3.4). On production a request without one is refused here, ahead of the
 * limits and the breaker, so it takes no count and the `write` limit counts accounts alone, which no dropped cookie or
 * forged address can renew. Staging keeps anonymous writes because the lab's anonymous campaigns run there (R13-20), and
 * its breaker bounds what they spend. The environment is read per request, as the prelaunch gate reads it.
 */
export function requireAccount(env: NodeJS.ProcessEnv = process.env): RequestHandler {
  return (req, res, next) => {
    if (req.userId || readAppEnv(env) !== "production") return next();
    res.status(401).json({ error: "sign_in_required", message: SIGN_IN_LINE });
  };
}

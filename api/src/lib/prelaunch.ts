import type { NextFunction, Request, Response } from "express";
import { readAppEnv } from "./appEnv.js";
import { labActor } from "./labGuard.js";
import { LAUNCHED } from "@workspace/launch";

/**
 * Before launch, production answers everyone but the admin with its health,
 * the waitlist's calls and nothing else (ADR-141). Anonymous visitors can otherwise
 * write reports for free (the MB-6 soft pass), so the gate is on the API and
 * not only on the page.
 */
export function isPrelaunch(env: NodeJS.ProcessEnv = process.env, launched: boolean = LAUNCHED): boolean {
  return !launched && readAppEnv(env) === "production";
}

// Health, the waitlist with its confirmation (ADR-145) and the CSP's reports
// (ADR-198) are mounted ahead of this gate; they are listed so a reordering of
// app.ts cannot take the smoke check, the form, the emailed link or
// production's violation counts down. The public pages call nothing else,
// since they compute in the browser and read build data. /admin carries its own
// guard, and /admin/me is how the admin's page learns who is signed in.
// /geocode is open because the public /sky page finds places through it since the zone moved to the server
// (ADR-246); it reads and writes nothing of ours, so ADR-167's gate on the product holds.
const OPEN_PATHS = [/^\/healthz(?:\/|$)/, /^\/waitlist(?:\/confirm)?\/?$/, /^\/csp-report\/?$/, /^\/admin(?:\/|$)/, /^\/geocode\/?$/];

export function prelaunchAllows(path: string, userId: string | null, env: NodeJS.ProcessEnv = process.env): boolean {
  return OPEN_PATHS.some((open) => open.test(path)) || labActor({ userId }, env) !== null;
}

export function prelaunchGate(req: Request, res: Response, next: NextFunction) {
  if (!isPrelaunch() || prelaunchAllows(req.path, req.userId ?? null)) return next();
  return res.status(403).json({ error: "prelaunch", message: "Stars Decoded hasn't launched yet." });
}

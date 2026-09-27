import type { NextFunction, Request, Response } from "express";
import { readPromptsReadOnly } from "./appEnv.js";

/**
 * Who may reach /api/admin/lab (ADR-86): the Clerk admin, and nobody else.
 * The bearer door of R07 is gone with the token that opened it: no secret
 * on GitHub, so nothing outside the panel needs a way in.
 */
export type LabActor = { kind: "admin"; userId: string };

/** Decides the actor for a request from the environment and its headers; null means refused. A bearer header opens nothing. */
export function labActor(input: { userId: string | null; authorization?: string | undefined }, env: NodeJS.ProcessEnv = process.env): LabActor | null {
  const adminUserId = env.ADMIN_USER_ID;
  if (adminUserId && input.userId && input.userId === adminUserId) return { kind: "admin", userId: input.userId };
  return null;
}

declare global {
  namespace Express {
    interface Request {
      labActor?: LabActor;
    }
  }
}

export function labGuard(req: Request, res: Response, next: NextFunction) {
  if (!process.env.ADMIN_USER_ID) {
    return res.status(503).json({ error: "admin_disabled", message: "ADMIN_USER_ID is not set; the lab routes are disabled." });
  }
  const actor = labActor({ userId: req.userId ?? null });
  if (!actor) return res.status(403).json({ error: "forbidden", message: "Admin access required." });
  req.labActor = actor;
  return next();
}

// Read once, like the prompt admin: the process restarts on every deploy.
const promptsReadOnly = readPromptsReadOnly();

/** Production never replays, spawns or releases: mutations answer 405 under PROMPTS_READ_ONLY. */
export function labReadOnlyGuard(req: Request, res: Response, next: NextFunction) {
  if (!promptsReadOnly || req.method === "GET" || req.method === "HEAD") return next();
  res.set("Allow", "GET");
  return res.status(405).json({ error: "lab_read_only", message: "The lab runs on staging only. This environment is read-only." });
}

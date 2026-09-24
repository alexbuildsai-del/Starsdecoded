import { createHash, timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { readPromptsReadOnly } from "./appEnv.js";

/**
 * Who may reach /api/admin/lab (annex scope 4): the Clerk admin, or the
 * script and the workflows carrying `Authorization: Bearer $LAB_TOKEN`,
 * placed once by the Owner on Railway staging and in the GitHub staging
 * environment (MB-69). Without LAB_TOKEN set, the bearer door is shut.
 */

/** Constant-time compare through a hash, so two secrets of different length take the same time to refuse. */
export function bearerMatches(header: string | undefined, token: string | undefined): boolean {
  if (!token || token.length < 16 || !header) return false;
  const m = /^Bearer\s+(.+)$/i.exec(header.trim());
  if (!m) return false;
  const a = createHash("sha256").update(m[1]).digest();
  const b = createHash("sha256").update(token).digest();
  return timingSafeEqual(a, b);
}

export type LabActor = { kind: "admin"; userId: string } | { kind: "token" };

/** Decides the actor for a request from the environment and its headers; null means refused. */
export function labActor(input: { userId: string | null; authorization: string | undefined }, env: NodeJS.ProcessEnv = process.env): LabActor | null {
  const adminUserId = env.ADMIN_USER_ID;
  if (adminUserId && input.userId && input.userId === adminUserId) return { kind: "admin", userId: input.userId };
  if (bearerMatches(input.authorization, env.LAB_TOKEN)) return { kind: "token" };
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
  if (!process.env.ADMIN_USER_ID && !process.env.LAB_TOKEN) {
    return res.status(503).json({ error: "admin_disabled", message: "Neither ADMIN_USER_ID nor LAB_TOKEN is set; the lab routes are disabled." });
  }
  const actor = labActor({ userId: req.userId ?? null, authorization: req.get("authorization") });
  if (!actor) return res.status(403).json({ error: "forbidden", message: "Admin access or the lab token required." });
  req.labActor = actor;
  return next();
}

// Read once, like the prompt admin: the process restarts on every deploy.
const promptsReadOnly = readPromptsReadOnly();

/** Production never replays or spawns: mutations answer 405 under PROMPTS_READ_ONLY (annex, out of scope). */
export function labReadOnlyGuard(req: Request, res: Response, next: NextFunction) {
  if (!promptsReadOnly || req.method === "GET" || req.method === "HEAD") return next();
  res.set("Allow", "GET");
  return res.status(405).json({ error: "lab_read_only", message: "The lab runs on staging only. This environment is read-only." });
}

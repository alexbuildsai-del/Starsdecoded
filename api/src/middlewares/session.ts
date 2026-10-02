import { randomUUID } from "node:crypto";
import type { CookieOptions, Request, Response, NextFunction } from "express";

declare global {
  namespace Express {
    interface Request {
      sessionId: string;
    }
  }
}

const COOKIE_NAME = "sd_session_id";
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

/**
 * The web calls /api on its own origin through Vercel's rewrites, so the cookie is first-party: Lax keeps it off every request
 * another site starts, and Secure keeps it off plain http, which only a laptop's dev server speaks (ADR-197).
 */
export function sessionCookie(env: NodeJS.ProcessEnv = process.env): CookieOptions {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV !== "development",
    maxAge: ONE_YEAR_MS,
    path: "/",
  };
}

/**
 * Issues an anonymous, stable session id on first visit and exposes it as
 * `req.sessionId` for downstream handlers. Used to scope profiles/reports
 * to the current browser before real auth lands.
 *
 * The cookie is httpOnly so the value never leaks to client JS.
 */
export function sessionMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  // cookie-parser populates req.cookies; fall back to manual parse so this
  // middleware is robust if cookie-parser is ever removed.
  const fromParser = (req as unknown as { cookies?: Record<string, string> }).cookies?.[COOKIE_NAME];
  const fromHeader = !fromParser ? parseCookieHeader(req.headers.cookie, COOKIE_NAME) : undefined;
  const sessionId = fromParser || fromHeader || randomUUID();

  // Re-issued on every request, so a cookie set as SameSite=None before ADR-197 turns Lax at its next visit; the year
  // therefore runs from the last visit.
  res.cookie(COOKIE_NAME, sessionId, sessionCookie());

  req.sessionId = sessionId;
  next();
}

function parseCookieHeader(header: string | undefined, name: string): string | undefined {
  if (!header) return undefined;
  const parts = header.split(/;\s*/);
  for (const part of parts) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    if (part.slice(0, eq) === name) {
      return decodeURIComponent(part.slice(eq + 1));
    }
  }
  return undefined;
}

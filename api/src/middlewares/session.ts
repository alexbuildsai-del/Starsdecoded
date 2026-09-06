import { randomUUID } from "node:crypto";
import type { Request, Response, NextFunction } from "express";

declare global {
  namespace Express {
    interface Request {
      sessionId: string;
    }
  }
}

const COOKIE_NAME = "astra_session_id";
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

/**
 * Issues an anonymous, stable session id on first visit and exposes it as
 * `req.sessionId` for downstream handlers. Used to scope profiles/reports
 * to the current browser before real auth lands.
 *
 * The cookie is httpOnly so the value never leaks to client JS; the client
 * just needs `credentials: "include"` on every fetch.
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
  let sessionId = fromParser ?? fromHeader;

  if (!sessionId) {
    sessionId = randomUUID();
    res.cookie(COOKIE_NAME, sessionId, {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      maxAge: ONE_YEAR_MS,
      path: "/",
    });
  }

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

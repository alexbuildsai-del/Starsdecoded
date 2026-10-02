import express, { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, cspViolationsTable } from "@workspace/db";
import { webOrigins } from "../middlewares/origin.js";
import { RateLimiter, clientKey } from "../lib/waitlist.js";
import { logger } from "../lib/logger.js";
import { CSP_REPORT_TYPES, cspCounts, cspKey, foldCounts, parseCspReports, utcDay, type CspCount } from "../lib/csp.js";

export interface CspStore {
  /** The day's rows, as `cspKey` names them, so a new host can be told from one that already counts. */
  keys(day: string): Promise<string[]>;
  add(day: string, counts: CspCount[], at: Date): Promise<void>;
}

export const dbCspStore: CspStore = {
  async keys(day) {
    const rows = await db
      .select({ directive: cspViolationsTable.directive, blocked: cspViolationsTable.blocked })
      .from(cspViolationsTable)
      .where(eq(cspViolationsTable.day, day));
    return rows.map((row) => cspKey(row.directive, row.blocked));
  },
  async add(day, counts, at) {
    await db
      .insert(cspViolationsTable)
      .values(counts.map(({ directive, blocked, count }) => ({ day, directive, blocked, count, lastSeen: at })))
      .onConflictDoUpdate({
        target: [cspViolationsTable.day, cspViolationsTable.directive, cspViolationsTable.blocked],
        set: { count: sql`${cspViolationsTable.count} + excluded.count`, lastSeen: sql`excluded.last_seen` },
      });
  },
};

/**
 * POST /api/csp-report, where browsers send what the CSP would block (ADR-198). Mounted in app.ts ahead of the origin
 * guard and the session: a browser may post a report with no Origin, or `null`, and never with a cookie. A forged report
 * can only add a count to a page of ours, so the limit per client is what bounds it. No browser reads the answer's body,
 * so a refusal is a bare status.
 */
export function cspReportRouter(store: CspStore = dbCspStore, origins: Array<string | RegExp> = webOrigins()): IRouter {
  const router: IRouter = Router();
  const perClient = new RateLimiter(60, 60_000);
  const parse = express.json({ type: CSP_REPORT_TYPES, limit: "8kb" });

  router.post(
    "/csp-report",
    (req, res, next) => {
      if (!perClient.take(clientKey(req.headers, req.ip))) {
        res.set("Retry-After", "60").status(429).end();
        return;
      }
      parse(req, res, (err?: unknown) => {
        if (!err) return next();
        const status = (err as { status?: unknown }).status;
        res.status(typeof status === "number" && status >= 400 && status < 500 ? status : 400).end();
      });
    },
    async (req, res) => {
      const counts = cspCounts(parseCspReports(req.headers["content-type"], req.body), origins);
      if (counts.length > 0) {
        const at = new Date();
        const day = utcDay(at);
        try {
          await store.add(day, foldCounts(counts, new Set(await store.keys(day))), at);
        } catch (err) {
          logger.warn({ err }, "csp report not counted");
        }
      }
      res.status(204).end();
    },
  );
  return router;
}

export default cspReportRouter();

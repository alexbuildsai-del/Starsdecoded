import { Router } from "express";
import { GetHomeQueryParams } from "@workspace/api-zod";
import type { Viewer } from "../lib/access.js";
import { loadHome } from "../lib/home.js";
import { timelineAccess } from "../lib/timelineAccess.js";

const router = Router();

// One read for the whole dashboard (ADR-174), so no card opens a report to draw itself.
router.get("/home", async (req, res) => {
  const viewer: Viewer = { userId: req.userId, sessionId: req.sessionId };
  // Your week's days are the reader's (reading 4); a zone the server cannot read falls back to the birth place's.
  const tz = GetHomeQueryParams.safeParse(req.query).data?.tz;
  // A check that cannot be read shows neither of Timeline's sections, and the rest of the dashboard still opens.
  const access = await timelineAccess(viewer).then(
    (answer) => answer.access,
    (err: unknown) => {
      req.log.error({ err }, "Timeline access could not be read for the home");
      return null;
    },
  );
  try {
    res.json(await loadHome(viewer, { tz, access }));
  } catch (err) {
    req.log.error({ err }, "Failed to read the home");
    res.status(500).json({ error: "internal_error", message: "Failed to read the home" });
  }
});

export default router;

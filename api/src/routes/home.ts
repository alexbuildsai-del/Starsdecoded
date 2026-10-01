import { Router } from "express";
import { loadHome } from "../lib/home.js";

const router = Router();

// One read for the whole dashboard (ADR-174), so no card opens a report to draw itself.
router.get("/home", async (req, res) => {
  try {
    res.json(await loadHome({ userId: req.userId, sessionId: req.sessionId }));
  } catch (err) {
    req.log.error({ err }, "Failed to read the home");
    res.status(500).json({ error: "internal_error", message: "Failed to read the home" });
  }
});

export default router;

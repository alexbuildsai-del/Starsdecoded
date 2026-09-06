import { Router } from "express";
import { getCredits } from "../lib/credits.js";

const router = Router();

router.get("/credits", async (req, res) => {
  if (!req.userId) {
    return res.json({
      natal: { available: 0, used: 0 },
      couple: { available: 0, used: 0 },
      parent_child: { available: 0, used: 0 },
    });
  }

  try {
    const credits = await getCredits(req.userId);
    return res.json(credits);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch credits");
    return res.status(500).json({ error: "internal_error", message: "Failed to fetch credits" });
  }
});

export default router;

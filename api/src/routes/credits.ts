import { Router, type Request } from "express";
import { creditHistory, getCredits, returnExpiredHolds } from "../lib/credits.js";

const router = Router();

// A lapsed gift's credit reads as the giver's again the moment they look
// (reading 8). A sweep that fails leaves the hold for the next read and must
// not keep the balance from showing.
async function settleHolds(req: Request): Promise<void> {
  await returnExpiredHolds().catch((err: unknown) => req.log.warn({ err }, "gift holds were not settled"));
}

router.get("/credits", async (req, res) => {
  if (!req.userId) {
    return res.json({ available: 0, used: 0, held: 0, lastBundle: null });
  }

  try {
    await settleHolds(req);
    const credits = await getCredits(req.userId);
    return res.json(credits);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch credits");
    return res.status(500).json({ error: "internal_error", message: "We couldn't load your credits. Try again in a few minutes." });
  }
});

router.get("/credits/history", async (req, res) => {
  if (!req.userId) return res.json([]);

  try {
    await settleHolds(req);
    return res.json(await creditHistory(req.userId));
  } catch (err) {
    req.log.error({ err }, "Failed to fetch credit history");
    return res
      .status(500)
      .json({ error: "internal_error", message: "We couldn't load your credit history. Try again in a few minutes." });
  }
});

export default router;

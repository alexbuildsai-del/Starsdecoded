import { Router, type IRouter } from "express";
import { desc, eq } from "drizzle-orm";
import { db, waitlistSignupsTable } from "@workspace/db";
import { labGuard } from "../lib/labGuard.js";

const router: IRouter = Router();

// The admin's guard without the read-only one: the list that matters lives on
// production, and a request to delete an address has to work there (R-3.5).
router.use("/admin/waitlist", labGuard);

router.get("/admin/waitlist", async (req, res) => {
  try {
    const rows = await db.select().from(waitlistSignupsTable).orderBy(desc(waitlistSignupsTable.createdAt));
    res.json({
      total: rows.length,
      signups: rows.map((r) => ({
        id: r.id,
        email: r.email,
        consent: r.consent,
        source: r.source,
        utmSource: r.utmSource,
        utmMedium: r.utmMedium,
        utmCampaign: r.utmCampaign,
        createdAt: r.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    req.log.error({ err }, "waitlist list failed");
    res.status(500).json({ error: "server_error", message: "The waitlist could not be read." });
  }
});

router.delete("/admin/waitlist/:id", async (req, res) => {
  try {
    const gone = await db
      .delete(waitlistSignupsTable)
      .where(eq(waitlistSignupsTable.id, req.params.id))
      .returning({ id: waitlistSignupsTable.id });
    if (gone.length === 0) return res.status(404).json({ error: "not_found", message: "That address is not on the list." });
    return res.status(204).end();
  } catch (err) {
    req.log.error({ err }, "waitlist delete failed");
    return res.status(500).json({ error: "server_error", message: "The address could not be removed." });
  }
});

export default router;

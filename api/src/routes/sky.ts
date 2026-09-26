import { Router, type IRouter } from "express";
import { GetSkyNowQueryParams } from "@workspace/api-zod";
import { skyNow } from "../lib/skyNow.js";

// Mounted in app.ts beside the waitlist, ahead of the session and sign-in
// middleware: the page's wheel sets no cookie and reads no account (ADR-141).
const router: IRouter = Router();

router.get("/sky", (req, res) => {
  res.set("Cache-Control", "no-store");
  const parsed = GetSkyNowQueryParams.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: "validation_error", message: "zone must be a time zone name, such as Europe/Brussels." });
  }
  const sky = skyNow(parsed.data.zone);
  return res.json({
    city: sky.place.city,
    zone: sky.place.zone,
    latitude: sky.place.lat,
    longitude: sky.place.lon,
    at: sky.at.toISOString(),
    ephemeris: sky.ephemeris,
    chart: sky.chart,
  });
});

export default router;

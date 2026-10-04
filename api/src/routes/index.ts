import { Router, type IRouter } from "express";
import reportsRouter from "./reports";
import profilesRouter from "./profiles";
import invitesRouter from "./invites";
import sharesRouter from "./shares";
import giftsRouter from "./gifts";
import adminPromptsRouter from "./adminPrompts";
import creditsRouter from "./credits";
import checkoutRouter from "./checkout";
import horizonRouter from "./horizon";
import compatibilityRouter from "./compatibility";
import adminLabRouter from "./adminLab";
import adminLabSessionsRouter from "./adminLabSessions";
import adminReleaseRouter from "./adminRelease";
import adminWaitlistRouter from "./adminWaitlist";
import homeRouter from "./home";
import timelineRouter, { startsAReading } from "./timeline";
import askRouter from "./ask";
import {
  anonWriteLimit, askLimit, checkoutLimit, generationLimits, previewLimit, sendLimit, timelineReadingLimit,
} from "../lib/limits";
import { spendGate } from "../lib/spendCap";
import { requireTimelineAccess } from "../lib/timelineAccess";
import { requireAccount } from "../middlewares/requireAccount";

// health is mounted directly in app.ts, ahead of auth
const router: IRouter = Router();

// Every route that spends or sends meets its limit here, ahead of the router that answers it, so the routes a limit guards
// read as one list (ADR-199). Writing first needs an account on production (ADR-140), so a signed-out request takes no
// count there. Elsewhere a signed-out write takes one from the count they all share (S1), then each caller's own limits;
// none of these costs a query. Then the day's spend breaker. Exported so the limits' test can stand this very chain ahead
// of a stub route.
export const writing = [requireAccount(), ...anonWriteLimit, ...generationLimits, spendGate()];
router.post("/reports", writing);
router.post("/reports/:id/regenerate", writing);
router.post("/compatibility", writing);
router.patch("/profiles/:id/birth-time", writing);
// The preview's own pace, decided as built (ADR-231, MB-146).
router.post("/horizon/preview", previewLimit);
router.post("/invites", sendLimit);
router.post("/compatibility/:id/send", sendLimit);
// A share of the reader's own report goes by email and claim like a send, so it counts with the sends (ADR-235).
router.post("/shares", sendLimit);
router.post("/gifts", sendLimit);
// A reminder sends our mail too, so it counts with the sends; its own once-a-day refusal keeps ADR-127's wording.
router.post("/gifts/:id/remind", sendLimit);
// A new address gets a new email, so Change address counts with the sends too (ADR-237).
router.post("/invites/:id/change-address", sendLimit);
router.post("/gifts/:id/change-address", sendLimit);
router.post("/checkout/test", checkoutLimit);
// A new Timeline reading and an Ask message each call the model, so each meets its own count and the breaker. Both stand
// after the access check: a reader without Timeline hears 403 before anything is counted (ADR-262). An open whose reading
// is kept or being written skips both, since the sheet asks again every few seconds while one is written and a kept
// reading opens on a paused day.
export const openingReading = [requireTimelineAccess, startsAReading, ...timelineReadingLimit, spendGate()];
export const asking = [requireTimelineAccess, ...askLimit, spendGate()];
router.post("/timeline/readings/:key", openingReading);
router.post("/ask", asking);

// The legacy pair report gave way to Compatibility (MB-58). Its routes read a pair past `pairReadable`, so after Stop
// sharing they still named the other person and showed their placements. They answer 410, so an old client learns the
// route is gone rather than that a pair is missing.
router.all(["/synastry{/*rest}", "/relationships{/*rest}"], (_req, res) => {
  res.status(410).json({ error: "gone" });
});

router.use(reportsRouter);
router.use(profilesRouter);
router.use(invitesRouter);
router.use(sharesRouter);
// A gift seats no one in anyone's circle: /home seats only a Personal report the reader can read (ADR-139, ADR-182).
router.use(homeRouter);
router.use(timelineRouter);
router.use(askRouter);
router.use(giftsRouter);
router.use(adminPromptsRouter);
router.use(creditsRouter);
router.use(checkoutRouter);
router.use(horizonRouter);
router.use(compatibilityRouter);
router.use(adminLabRouter);
router.use(adminLabSessionsRouter);
router.use(adminReleaseRouter);
router.use(adminWaitlistRouter);

export default router;

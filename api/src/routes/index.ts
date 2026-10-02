import { Router, type IRouter } from "express";
import reportsRouter from "./reports";
import geocodeRouter from "./geocode";
import profilesRouter from "./profiles";
import invitesRouter from "./invites";
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
import { anonWriteLimit, checkoutLimit, generationLimits, geocodeLimit, previewLimit, sendLimit } from "../lib/limits";
import { spendGate } from "../lib/spendCap";
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
router.get("/geocode", geocodeLimit);
// MB-146 provisional
router.post("/horizon/preview", previewLimit);
router.post("/invites", sendLimit);
router.post("/compatibility/:id/send", sendLimit);
router.post("/gifts", sendLimit);
router.post("/checkout/test", checkoutLimit);

// The legacy pair report gave way to Compatibility (MB-58). Its routes read a pair past `pairReadable`, so after Stop
// sharing they still named the other person and showed their placements. They answer 410, so an old client learns the
// route is gone rather than that a pair is missing.
router.all(["/synastry{/*rest}", "/relationships{/*rest}"], (_req, res) => {
  res.status(410).json({ error: "gone" });
});

router.use(reportsRouter);
router.use(geocodeRouter);
router.use(profilesRouter);
router.use(invitesRouter);
// A gift seats no one in anyone's circle: /home seats only a Personal report the reader can read (ADR-139, ADR-182).
router.use(homeRouter);
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

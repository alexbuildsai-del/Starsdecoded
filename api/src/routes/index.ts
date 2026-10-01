import { Router, type IRouter } from "express";
import reportsRouter from "./reports";
import geocodeRouter from "./geocode";
import profilesRouter from "./profiles";
import synastryRouter from "./synastry";
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

// health is mounted directly in app.ts, ahead of auth
const router: IRouter = Router();

router.use(reportsRouter);
router.use(geocodeRouter);
router.use(profilesRouter);
router.use(synastryRouter);
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

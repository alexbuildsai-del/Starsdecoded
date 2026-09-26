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

// health is mounted directly in app.ts, ahead of auth
const router: IRouter = Router();

router.use(reportsRouter);
router.use(geocodeRouter);
router.use(profilesRouter);
router.use(synastryRouter);
router.use(invitesRouter);
// No router lists orbit members: a gift puts no one on anyone's orbit (ADR-139).
router.use(giftsRouter);
router.use(adminPromptsRouter);
router.use(creditsRouter);
router.use(checkoutRouter);
router.use(horizonRouter);
router.use(compatibilityRouter);
router.use(adminLabRouter);
router.use(adminLabSessionsRouter);
router.use(adminReleaseRouter);

export default router;

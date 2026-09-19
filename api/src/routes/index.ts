import { Router, type IRouter } from "express";
import reportsRouter from "./reports";
import geocodeRouter from "./geocode";
import profilesRouter from "./profiles";
import synastryRouter from "./synastry";
import invitesRouter from "./invites";
import adminPromptsRouter from "./adminPrompts";
import creditsRouter from "./credits";
import horizonRouter from "./horizon";

// health is mounted directly in app.ts, ahead of auth
const router: IRouter = Router();

router.use(reportsRouter);
router.use(geocodeRouter);
router.use(profilesRouter);
router.use(synastryRouter);
router.use(invitesRouter);
router.use(adminPromptsRouter);
router.use(creditsRouter);
router.use(horizonRouter);

export default router;

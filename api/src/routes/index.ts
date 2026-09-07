import { Router, type IRouter } from "express";
import healthRouter from "./health";
import reportsRouter from "./reports";
import geocodeRouter from "./geocode";
import profilesRouter from "./profiles";
import synastryRouter from "./synastry";
import invitesRouter from "./invites";
import adminPromptsRouter from "./adminPrompts";
import creditsRouter from "./credits";

const router: IRouter = Router();

router.use(healthRouter);
router.use(reportsRouter);
router.use(geocodeRouter);
router.use(profilesRouter);
router.use(synastryRouter);
router.use(invitesRouter);
router.use(adminPromptsRouter);
router.use(creditsRouter);

export default router;

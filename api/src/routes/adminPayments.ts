/**
 * The admin's Sales page (ADR-315): campaigns and testers under /api/admin, behind the Clerk admin gate. Each host
 * keeps its own lists, so production takes these writes too: the admin's guard without the lab's read-only one, as
 * the waitlist has. No route here runs Stripe's sync (ADR-315), and none takes a grant's amount: a grant is 1, 3 or 5
 * credits, a bundle's size. The QA pair is never added, granted or removed here (ADR-314).
 */
import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod/v4";
import { CAMPAIGN_AUDIENCES } from "@workspace/db";
import { labGuard } from "../lib/labGuard.js";
import { CampaignRefused, endCampaign, listCampaigns, saveCampaign, type Campaign } from "../lib/campaigns.js";
import {
  TESTER_LINES,
  TesterRefused,
  addTester,
  grantTester,
  isGrantCount,
  listTesters,
  removeTester,
  type Tester,
} from "../lib/testers.js";
import { VALIDATION_LINE } from "../lib/validation.js";

const router: IRouter = Router();
router.use("/admin/campaigns", labGuard);
router.use("/admin/testers", labGuard);

function campaignJson(campaign: Campaign) {
  return {
    id: campaign.id,
    name: campaign.name,
    audience: campaign.audience,
    slug: campaign.slug,
    startsOn: campaign.startsOn,
    endsOn: campaign.endsOn,
    prices: campaign.prices,
    endedAt: campaign.endedAt?.toISOString() ?? null,
    createdAt: campaign.createdAt.toISOString(),
  };
}

function testerJson(tester: Tester) {
  return {
    userId: tester.userId,
    email: tester.email,
    qa: tester.qa,
    granted: tester.granted,
    used: tester.used,
    addedAt: tester.addedAt.toISOString(),
  };
}

const invalid = (res: Response) => res.status(400).json({ error: "validation_error", message: VALIDATION_LINE });

/** A refusal's own status and line, which the Sales page shows in place; anything else is a 500 with a plain line. */
function failed(req: Request, res: Response, err: unknown, what: string, line: string) {
  if (err instanceof CampaignRefused || err instanceof TesterRefused) {
    return res.status(err.status).json({ error: err.code, message: err.message });
  }
  req.log.error({ err }, `${what} failed`);
  return res.status(500).json({ error: "server_error", message: line });
}

// The guard set the admin before any handler runs; a write never goes in under no one's name.
const adminOf = (req: Request): string | null => req.labActor?.userId ?? null;
const noAdmin = (res: Response) => res.status(403).json({ error: "forbidden", message: "Admin access required." });

router.get("/admin/campaigns", async (req, res) => {
  try {
    return res.json({ campaigns: (await listCampaigns()).map(campaignJson) });
  } catch (err) {
    return failed(req, res, err, "campaign list", "The campaigns could not be read.");
  }
});

// Only the shapes are checked here; every rule is checkCampaign's, so each refusal reads its own line.
const CampaignBody = z.object({
  name: z.string(),
  audience: z.enum(CAMPAIGN_AUDIENCES),
  slug: z.string().nullish(),
  startsOn: z.string(),
  endsOn: z.string(),
  prices: z.record(z.string(), z.number()),
});

router.post("/admin/campaigns", async (req, res) => {
  const parsed = CampaignBody.safeParse(req.body);
  if (!parsed.success) return invalid(res);
  const by = adminOf(req);
  if (!by) return noAdmin(res);
  try {
    return res.status(201).json({ campaign: campaignJson(await saveCampaign(parsed.data, by)) });
  } catch (err) {
    return failed(req, res, err, "campaign save", "The campaign could not be saved.");
  }
});

router.post("/admin/campaigns/:id/end", async (req, res) => {
  try {
    return res.json({ campaign: campaignJson(await endCampaign(req.params.id)) });
  } catch (err) {
    return failed(req, res, err, "campaign end", "The campaign could not be ended.");
  }
});

router.get("/admin/testers", async (req, res) => {
  try {
    return res.json({ testers: (await listTesters()).map(testerJson) });
  } catch (err) {
    return failed(req, res, err, "tester list", "The testers could not be read.");
  }
});

const TesterBody = z.object({ email: z.string() });

router.post("/admin/testers", async (req, res) => {
  const parsed = TesterBody.safeParse(req.body);
  if (!parsed.success) return invalid(res);
  const by = adminOf(req);
  if (!by) return noAdmin(res);
  try {
    return res.status(201).json({ tester: testerJson(await addTester(parsed.data.email, by)) });
  } catch (err) {
    return failed(req, res, err, "tester add", "The tester could not be added.");
  }
});

// The count is the whole body: no amount is read, so a grant is only ever a bundle's size.
const GrantBody = z.object({ count: z.number() });

router.post("/admin/testers/:userId/grant", async (req, res) => {
  const parsed = GrantBody.safeParse(req.body);
  if (!parsed.success) return invalid(res);
  const { count } = parsed.data;
  if (!isGrantCount(count)) return res.status(400).json({ error: "bad_count", message: TESTER_LINES.badCount });
  const by = adminOf(req);
  if (!by) return noAdmin(res);
  try {
    return res.json({ tester: testerJson(await grantTester(req.params.userId, count, by)) });
  } catch (err) {
    return failed(req, res, err, "tester grant", "The credits could not be granted.");
  }
});

router.delete("/admin/testers/:userId", async (req, res) => {
  try {
    await removeTester(req.params.userId);
    return res.status(204).end();
  } catch (err) {
    return failed(req, res, err, "tester remove", "The tester could not be removed.");
  }
});

export default router;

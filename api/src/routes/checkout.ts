import { Router } from "express";
import { TestCheckoutBody } from "@workspace/api-zod";
import type { BundleKind } from "@workspace/db";
import { BUNDLE_DEFINITIONS, grantBundle, getCredits } from "../lib/credits.js";
import { readAppEnv } from "../lib/appEnv.js";

const router = Router();

// The inverse of BUNDLE_DEFINITIONS: a test count buys the bundle kind a real
// purchase of that size would, so every credit state can be walked honestly.
export function bundleKindForCount(count: number): BundleKind | undefined {
  return (Object.keys(BUNDLE_DEFINITIONS) as BundleKind[]).find(
    (kind) => BUNDLE_DEFINITIONS[kind] === count,
  );
}

// POST /checkout/test — free credits off production, so every credit state,
// Send and Gift can be walked with two accounts before real checkout exists
// (ADR-138). MB-6 provisional: stands in for the soft pass until payments go
// live, at which point this route retires with it.
router.post("/checkout/test", async (req, res) => {
  // Refused on production whatever the web shows: the gate lives here, not
  // in the client (ADR-138).
  if (readAppEnv() === "production") {
    return res.status(403).json({
      error: "forbidden",
      message: "Test credits are not available on production.",
    });
  }
  if (!req.userId) {
    return res.status(401).json({ error: "unauthorized", message: "Sign in to get test credits." });
  }

  const parsed = TestCheckoutBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "validation_error", message: parsed.error.message });
  }

  const bundleKind = bundleKindForCount(parsed.data.count);
  if (!bundleKind) {
    return res.status(400).json({ error: "validation_error", message: "count must be 1, 3 or 5" });
  }

  try {
    await grantBundle(req.userId, bundleKind, { test: true });
    const credits = await getCredits(req.userId);
    return res.status(201).json(credits);
  } catch (err) {
    req.log.error({ err }, "Failed to grant test credits");
    return res.status(500).json({ error: "internal_error", message: "Failed to grant test credits" });
  }
});

export default router;

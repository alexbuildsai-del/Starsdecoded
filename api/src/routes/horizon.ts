import { Router } from "express";
import { PreviewHorizonBody } from "@workspace/api-zod";
import { previewHorizon, validatePreviewInput } from "../lib/horizonPreview.js";

const router = Router();

// Unauthenticated like the geocode path and rate-limited by the session
// middleware ahead of it. Reads no profile, stores nothing, calls no model.
router.post("/horizon/preview", (req, res) => {
  const parsed = PreviewHorizonBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "validation_error", message: parsed.error.message });
  }
  const problem = validatePreviewInput(parsed.data);
  if (problem) {
    return res.status(400).json({ error: "validation_error", message: problem });
  }
  try {
    return res.json(previewHorizon(parsed.data));
  } catch (err) {
    req.log.error({ err }, "Failed to preview the horizon");
    return res.status(500).json({ error: "internal_error", message: "Failed to preview the horizon" });
  }
});

export default router;

import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { readAppEnv, readCommitSha } from "../lib/appEnv.js";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const commit = readCommitSha();
  const data = HealthCheckResponse.parse({
    status: "ok",
    env: readAppEnv(),
    ...(commit ? { commit } : {}),
  });
  res.json(data);
});

export default router;

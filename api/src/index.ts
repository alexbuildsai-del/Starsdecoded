import app from "./app";
import { indexNowOnStart } from "./lib/indexNow";
import { logger } from "./lib/logger";
import { repairStalePromptOverrides } from "./lib/promptLoader";
import { syncProductsOnStart } from "./lib/stripeSync";
import { qaAfterDeploy } from "./routes/qa";

// Railway injects PORT; 8080 keeps local runs and the e2e suite working
// without one being set.
const rawPort = process.env["PORT"] ?? "8080";

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

repairStalePromptOverrides().catch((err) => {
  logger.warn({ err }, "repairStalePromptOverrides failed at startup");
});

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");

  // After the listen and unawaited: production's IndexNow ping waits on the web deploy for up to twenty minutes and
  // must never fail or delay the start. It does not reject, so this catch is only the last net for an unhandled rejection.
  indexNowOnStart().catch((err) => {
    logger.warn({ err }, "indexNowOnStart failed");
  });

  // The same footing for Stripe's Products and Prices, made from the catalogue at each start and from nowhere else
  // (ADR-315): a Stripe that is slow or down leaves checkout not ready until the next start, never the API down.
  syncProductsOnStart().catch((err) => {
    logger.warn({ err }, "syncProductsOnStart failed");
  });

  // Staging's walk of the buyer's flow, on the same footing (ADR-315): it waits for the web to serve this commit, then
  // walks at no cost, so a slow site or a broken walk is a verdict, never a held or failed start.
  qaAfterDeploy().catch((err) => {
    logger.warn({ err }, "qaAfterDeploy failed");
  });
});

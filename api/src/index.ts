import app from "./app";
import { indexNowOnStart } from "./lib/indexNow";
import { logger } from "./lib/logger";
import { repairStalePromptOverrides } from "./lib/promptLoader";

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
});

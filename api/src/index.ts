import { createServer, type ServerResponse } from "node:http";
import app from "./app";
import { indexNowOnStart } from "./lib/indexNow";
import { startWorker, stopWorker } from "./lib/jobs";
import { logger } from "./lib/logger";
import { repairStalePromptOverrides } from "./lib/promptLoader";
import { banQaPairAtStop, banQaPairUnlessWalking } from "./lib/qaPair";
import { syncProductsOnStart } from "./lib/stripeSync";
import { qaAfterDeploy } from "./routes/qa";

// Railway injects PORT; 8080 keeps local runs and the e2e suite working
// without one being set.
const rawPort = process.env["PORT"] ?? "8080";

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

/**
 * What open requests and running jobs get once SIGTERM comes (B-48). railway.json's drainingSeconds (60) is the time
 * from SIGTERM to SIGKILL; the rest is for the worker to hand back the jobs it aborts.
 */
const DRAIN_MS = 45_000;
/** The last net, short of the kill: a hand-back that hangs leaves its job to the lease (ADR-357), and the exit is clean. */
const EXIT_MS = 55_000;
/**
 * The QA pair's bans at the stop are one call to Clerk each: the exit waits this long for them at most, even when the
 * drain ends sooner.
 */
const PAIR_MS = 10_000;

const CODE = /^[\w.:-]{1,64}$/;

/** An error's own code, else its class: never its message, which can carry an account's address or id. */
function codeOf(err: unknown): string {
  const { code, name } = (err ?? {}) as { code?: unknown; name?: unknown };
  if (typeof code === "string" && CODE.test(code)) return code;
  return typeof name === "string" && CODE.test(name) ? name : "unknown";
}

let stopping = false;
let refused = 0;
const open = new Set<ServerResponse>();

const server = createServer((req, res) => {
  if (stopping) {
    // By SIGTERM the new deploy has answered its health check: a request that still reaches this one is told to ask
    // again, on a new connection, and the done page counts a 503 as "not yet".
    refused += 1;
    res.writeHead(503, {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      Connection: "close",
    });
    res.end(JSON.stringify({ error: "restarting" }));
    return;
  }
  open.add(res);
  res.once("close", () => {
    open.delete(res);
    // server.close() shuts only the connections idle at the time; each one left is shut as its request ends, so the
    // drain lasts as long as the slowest request and no longer.
    if (stopping) server.closeIdleConnections();
  });
  app(req, res);
});

// The exit is 0 even when the drain runs out: the stop was asked for, and railway.json's ON_FAILURE policy reads any
// other code as a crash.
process.on("SIGTERM", () => {
  if (stopping) return;
  stopping = true;
  // Ahead of the drain: a walk this process runs holds the QA pair open, and the next start bans them only once it has
  // booted. From here no walk opens them.
  const pair = banQaPairAtStop(PAIR_MS).catch((err: unknown) => {
    logger.warn({ code: codeOf(err) }, "banQaPairAtStop failed");
  });
  logger.info({ open: open.size, drainMs: DRAIN_MS }, "SIGTERM: draining");
  // An answer still to come says its connection closes after it, so the edge sends its next request to the new deploy
  // instead of racing this one's close.
  for (const res of open) if (!res.headersSent) res.setHeader("Connection", "close");
  let cut = 0;
  const requests = new Promise<void>((done) => server.close(() => done()));
  const jobs = stopWorker(DRAIN_MS).catch((err: unknown) => {
    logger.warn({ code: codeOf(err) }, "stopWorker failed");
  });
  const late = setTimeout(() => {
    cut = open.size;
    server.closeAllConnections();
  }, DRAIN_MS);
  const last = new Promise<void>((done) => setTimeout(done, EXIT_MS));
  void Promise.race([Promise.all([requests, jobs, pair]), last]).then(() => {
    clearTimeout(late);
    logger.info({ cut, refused }, "drained, exiting");
    process.exit(0);
  });
});

repairStalePromptOverrides().catch((err) => {
  logger.warn({ err }, "repairStalePromptOverrides failed at startup");
});

server.once("error", (err) => {
  logger.error({ err }, "Error listening on port");
  process.exit(1);
});

server.listen(port, () => {
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

  // The same footing again, ahead of the walk below, which waits minutes for the web before it starts. The line keeps
  // the error's code alone: its message can name one of the pair's accounts.
  banQaPairUnlessWalking().catch((err: unknown) => {
    logger.warn({ code: codeOf(err) }, "banQaPairUnlessWalking failed");
  });

  // Staging's walk of the buyer's flow, on the same footing (ADR-315): it waits for the web to serve this commit, then
  // walks at no cost, so a slow site or a broken walk is a verdict, never a held or failed start.
  qaAfterDeploy().catch((err) => {
    logger.warn({ err }, "qaAfterDeploy failed");
  });

  // The queue polls on its own timer (ADR-357, reading 7): a database that is slow or down leaves the jobs waiting, never
  // the start. Wrapped, so a throw or a rejection alike is a log line.
  Promise.resolve()
    .then(() => startWorker())
    .catch((err: unknown) => {
      logger.warn({ code: codeOf(err) }, "startWorker failed");
    });
});

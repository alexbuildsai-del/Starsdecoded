import express, { type ErrorRequestHandler, type Express, type RequestHandler } from "express";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import router from "./routes";
import healthRouter from "./routes/health";
import cspReportRouter from "./routes/cspReport";
import waitlistRouter from "./routes/waitlist";
import geocodeRouter from "./routes/geocode";
import { geocodeLimit } from "./lib/limits";
import { httpSerializers, logger } from "./lib/logger";
import { sessionMiddleware } from "./middlewares/session";
import { authMiddleware } from "./middlewares/auth";
import { apiHeaders, originGuard } from "./middlewares/origin";
import { prelaunchGate } from "./lib/prelaunch";

/**
 * Last in the stack, so no body-parser error reaches Express's default handler, which prints the error to stderr with
 * a few characters of the body in its message (ADR-201). The line keeps the error's type and status and nothing else:
 * `err.body` and the raw message of a parse error are the person's own words.
 */
export const requestErrorHandler: ErrorRequestHandler = (err: unknown, req, res, _next) => {
  const { type, status } = (err ?? {}) as { type?: unknown; status?: unknown };
  const kind = typeof type === "string" ? type : "unknown";
  const [code, error] =
    kind === "entity.parse.failed" ? [400, "bad_request"]
    : kind === "entity.too.large" ? [413, "too_large"]
    : [500, "internal_error"];
  req.log.warn({ type: kind, status: typeof status === "number" ? status : code }, "request refused");
  if (res.headersSent) {
    res.destroy();
    return;
  }
  res.status(code).json({ error });
};

/**
 * Express's own 404 is an HTML page; every other refusal here is JSON, so a mistyped or probed path under /api gets the same
 * shape and a client never has to parse markup.
 */
export const apiNotFound: RequestHandler = (_req, res) => {
  res.status(404).json({ error: "not_found" });
};

const PROMPT_SAVE = /^\/api\/admin\/prompts\/[^/]+\/?$/;
const PROMPT_PREVIEW = /^\/api\/admin\/prompts\/preview\/?$/;
const json = express.json({ limit: "32kb" });

/**
 * ADR-202's 32 kB for every JSON body but the prompt editor's save and Preview, which hold a whole prompt: a pair system
 * prompt was 31 kB on 2026-10-01. adminPrompts.ts reads those two requests itself, up to 256 kB, once the admin's guard
 * has let them through, so no one else can have more than 32 kB parsed.
 */
export const jsonBody: RequestHandler = (req, res, next) =>
  (req.method === "PUT" && PROMPT_SAVE.test(req.path)) || (req.method === "POST" && PROMPT_PREVIEW.test(req.path))
    ? next()
    : json(req, res, next);

const app: Express = express();

// Railway terminates TLS in front of this process, so without this Express
// sees plain http: req.protocol and req.secure would be wrong, and Secure
// cookies would not be recognised as sent over HTTPS.
app.set("trust proxy", 1);

// Never emit ETags for API responses. Express generates a weak ETag for every
// JSON body and answers a matching If-None-Match with a 304 that has no body.
// The api-client treats 304 as "no content" and resolves with null, which
// crashed the birth form (profiles.some on null) and blanked the dashboard.
app.set("etag", false);

// The header names the framework to anyone probing for a version with a known hole.
app.disable("x-powered-by");

// First, so health and every refusal below carry them too.
app.use(apiHeaders());

// The request line holds the route and the request id, never a token in the path (ADR-201); the error serializer is
// passed again because pino-http would otherwise put pino's own back in front of every req.log.
app.use(pinoHttp({ logger, serializers: httpSerializers }));

// Health sits ahead of every other middleware deliberately. Both Clerk's
// middleware and authMiddleware can throw — on a malformed key, or on an
// unreachable database, since authMiddleware reads and writes the users
// table. Behind them, this probe fails whenever a dependency does, and
// Railway reports "deploy failed" for a process that started perfectly
// well, hiding the real error one layer down. A liveness probe answers
// for the process itself and nothing else.
app.use("/api", healthRouter);

// Ahead of the origin guard and the session (ADR-198): a browser posts its CSP report with no Origin, or `null`, and no
// cookie. The route reads its own body, at most 8 kB, and counts only reports from a page of ours.
app.use("/api", cspReportRouter);

// Ahead of the parsers, so a foreign page's write is refused before its body is read or a session is touched.
app.use(originGuard());
app.use(cookieParser());
app.use(jsonBody);
app.use(express.urlencoded({ extended: true, limit: "32kb" }));
// Ahead of the session: the waitlist's two calls, joining and confirming, set no cookie (ADR-141, 145).
app.use("/api", waitlistRouter);
// A place search too: home and /sky make one, and a public page sets no cookie. Its limit counts by address, which needs
// no session; ahead of the prelaunch gate it is open to everyone, as the gate already lists it (ADR-246).
app.get("/api/geocode", geocodeLimit);
app.use("/api", geocodeRouter);
app.use(sessionMiddleware);

app.use(
  clerkMiddleware({ publishableKey: process.env.CLERK_PUBLISHABLE_KEY }),
);

app.use(authMiddleware);

// Belt and braces with etag=false above: tell browsers not to cache API
// responses at all so they never send a conditional request in the first place.
app.use("/api", (_req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});
// Before launch, production serves the rest of the API to the admin only (ADR-141).
app.use("/api", prelaunchGate);
app.use("/api", router);
app.use("/api", apiNotFound);
app.use(requestErrorHandler);

export default app;

import express, { type Express } from "express";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import router from "./routes";
import healthRouter from "./routes/health";
import waitlistRouter from "./routes/waitlist";
import { logger } from "./lib/logger";
import { sessionMiddleware } from "./middlewares/session";
import { authMiddleware } from "./middlewares/auth";
import { apiHeaders, originGuard } from "./middlewares/origin";
import { prelaunchGate } from "./lib/prelaunch";

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

// First, so health and every refusal below carry them too.
app.use(apiHeaders());

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

// Health sits ahead of every other middleware deliberately. Both Clerk's
// middleware and authMiddleware can throw — on a malformed key, or on an
// unreachable database, since authMiddleware reads and writes the users
// table. Behind them, this probe fails whenever a dependency does, and
// Railway reports "deploy failed" for a process that started perfectly
// well, hiding the real error one layer down. A liveness probe answers
// for the process itself and nothing else.
app.use("/api", healthRouter);

// Ahead of the parsers, so a foreign page's write is refused before its body is read or a session is touched.
app.use(originGuard());
app.use(cookieParser());
// ADR-202's cap sits close to the largest body the web sends, a pair system prompt from the admin's prompt editor (31 kB on
// 2026-10-01): a prompt edited past 32 kB answers 413 and cannot be saved.
app.use(express.json({ limit: "32kb" }));
app.use(express.urlencoded({ extended: true, limit: "32kb" }));
// Ahead of the session: the waitlist's two calls, joining and confirming, set no cookie (ADR-141, 145).
app.use("/api", waitlistRouter);
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

export default app;

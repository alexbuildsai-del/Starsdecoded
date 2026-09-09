import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import router from "./routes";
import healthRouter from "./routes/health";
import { logger } from "./lib/logger";
import { sessionMiddleware } from "./middlewares/session";
import { authMiddleware } from "./middlewares/auth";

const app: Express = express();

// Railway terminates TLS in front of this process, so without this Express
// sees plain http: req.protocol and req.secure would be wrong, and Secure
// cookies would not be recognised as sent over HTTPS.
app.set("trust proxy", 1);

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

app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(sessionMiddleware);

app.use(
  clerkMiddleware({ publishableKey: process.env.CLERK_PUBLISHABLE_KEY }),
);

app.use(authMiddleware);

app.use("/api", router);

export default app;

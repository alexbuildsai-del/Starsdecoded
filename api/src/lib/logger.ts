import pino, { type DestinationStream, type Logger, type LoggerOptions } from "pino";

/**
 * Logs keep the ids of reports, profiles and requests, and lose whatever names a person or opens what is theirs
 * (R-3.5, ADR-201; security scope 6): birth data under the API's names and the database's, an address, a name or note
 * someone typed, a Clerk id, a session or invite token, a cookie, an IP. Each key is censored at the top of a line and
 * one level down, so a body, a row or headers logged whole keep their keys and lose these values.
 */
const PERSONAL_KEYS = [
  "birthDate", "birth_date", "birthTime", "birth_time", "birthPlace", "birth_place",
  "latitude", "longitude", "lat", "lon", "lng", "timezone", "city", "country", "display_name",
  "email", "emailAddress", "to", "cc", "bcc",
  "name", "firstName", "lastName", "recipientName", "recipient_name", "subjectName", "subject_name",
  "giverName", "inviterName", "claimedByName", "profileName", "note",
  "userId", "user_id", "claimedByUserId", "claimed_by_user_id", "createdByUserId", "created_by_user_id", "user",
  "sessionId", "session_id", "token", "cookie", "authorization", "set-cookie", "x-forwarded-for", "x-real-ip",
];

// pino tells a censor which top-level key it is under only for keys a path names outright, never for "*", so these
// two are named here; the censor then keeps an error's name, which is its class or a provider's code.
const ERROR_KEYS = ["err", "error"];

const CENSOR = "[Redacted]";

const REDACT_PATHS = [
  ...PERSONAL_KEYS.map((key) => `["${key}"]`),
  ...PERSONAL_KEYS.map((key) => `*["${key}"]`),
  ...ERROR_KEYS.map((key) => `${key}.name`),
  "req.headers.authorization",
  "req.headers.cookie",
  "res.headers['set-cookie']",
];

function censor(value: unknown, path: string[]): unknown {
  return path.length === 2 && ERROR_KEYS.includes(path[0]) && path[1] === "name" ? value : CENSOR;
}

// Free text no key can censor. drizzle-orm's DrizzleQueryError ends its message, and so its stack, with the query's
// parameters: a profile's birth data, an address, a whole report; the SQL before them stays, so the line still says
// which statement failed. An address turns up in a provider's or a database's own words.
const PARAMS = "\nparams: ";
const EMAIL = /[\w.%+-]+@[a-z\d-]+(?:\.[a-z\d-]+)*\.[a-z]{2,}/gi;

function scrub(text: string): string {
  const at = text.indexOf(PARAMS);
  const kept = at < 0 ? text : text.slice(0, at);
  return kept.includes("@") ? kept.replace(EMAIL, "[email]") : kept;
}

// Strings at the top of a line and one level down, as deep as the keys reach. Only plain objects are copied: an
// error or a request keeps its class for its serializer.
function scrubLeaves(value: unknown): unknown {
  if (typeof value === "string") return scrub(value);
  if (value === null || typeof value !== "object" || Object.getPrototypeOf(value) !== Object.prototype) return value;
  return Object.fromEntries(Object.entries(value).map(([key, leaf]) => [key, typeof leaf === "string" ? scrub(leaf) : leaf]));
}

/** Every `params: …` tail a failed query wrote into an error or one of its causes, as drizzle-orm wrote it. */
function paramTails(err: unknown): string[] {
  const tails: string[] = [];
  let at = err as { params?: unknown; cause?: unknown } | null | undefined;
  for (let depth = 0; at && typeof at === "object" && depth < 8; depth += 1, at = at.cause as typeof at) {
    if (Array.isArray(at.params)) tails.push(`${PARAMS}${at.params}`);
  }
  return tails;
}

/**
 * pino's own serializer, less a failed query's parameters and any address in the text. pino-http hands its error
 * serializer pino's output rather than the error, and that output keeps the error as `raw`.
 */
function errSerializer(input: unknown): unknown {
  const serialized = input !== null && typeof input === "object" && !(input instanceof Error) && (input as { raw?: unknown }).raw instanceof Error;
  const raw = serialized ? (input as { raw: Error }).raw : input;
  const out: unknown = serialized ? input : pino.stdSerializers.err(input as Error);
  if (typeof out === "string") return scrub(out);
  if (out === null || typeof out !== "object") return out;
  const tails = paramTails(raw);
  const clean: Record<string, unknown> = { ...(out as Record<string, unknown>) };
  delete clean.params;
  // The exact tails keep a cause's message and the stack's frames; a tail that no longer matches is cut to the end.
  for (const key of ["message", "stack"]) {
    const text = clean[key];
    if (typeof text === "string") clean[key] = scrub(tails.reduce((s, tail) => s.split(tail).join(""), text));
  }
  return clean;
}

/** A path that carries a token opens what the token opens, so the request line names the route's parameter instead. */
const TOKEN_ROUTES = [/^(\/api\/invites\/)[^/]+/i];
// A segment shaped like a minted token (base64url pieces joined by dots: an invite's nonce and signature, a JWT) is one
// wherever it stands, so a mistyped or future route cannot log it either.
const TOKEN_SEGMENT = /(?<=\/)[\w-]{16,}(?:\.[\w-]{16,})+(?=\/|$)/g;

export function logPath(url: string | undefined): string | undefined {
  if (url === undefined) return undefined;
  const path = TOKEN_ROUTES.reduce((p, route) => p.replace(route, "$1:token"), url.split(/[?#]/, 1)[0]);
  return path.replace(TOKEN_SEGMENT, ":token");
}

/**
 * pino-http's: only the route and the request id, since headers, the query and the body are where a person and their
 * tokens travel. pino-http wraps these around its own, so `req.url` is already the original URL.
 */
export const httpSerializers = {
  req: (req: { id?: unknown; method?: string; url?: string }) => ({ id: req.id, method: req.method, url: logPath(req.url) }),
  res: (res: { statusCode?: number }) => ({ statusCode: res.statusCode }),
  err: errSerializer,
};

function loggerOptions(env: NodeJS.ProcessEnv): LoggerOptions {
  return {
    level: env.LOG_LEVEL ?? "info",
    redact: { paths: REDACT_PATHS, censor },
    // pino makes an error's raw message the line's msg when a call gives none.
    serializers: { err: errSerializer, msg: (msg: unknown) => (typeof msg === "string" ? scrub(msg) : msg) },
    formatters: {
      log: (fields) => Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, scrubLeaves(value)])),
    },
  };
}

/** A destination skips the pretty transport, so a test can read what production would write. */
export function createLogger(env: NodeJS.ProcessEnv = process.env, destination?: DestinationStream): Logger {
  if (destination) return pino(loggerOptions(env), destination);
  return pino({
    ...loggerOptions(env),
    ...(env.NODE_ENV === "production"
      ? {}
      : {
          transport: {
            target: "pino-pretty",
            options: { colorize: true },
          },
        }),
  });
}

export const logger = createLogger();

import pino, { type DestinationStream, type Logger, type LoggerOptions } from "pino";

/**
 * Logs keep the ids of reports, profiles and requests, and lose whatever names a person or opens what is theirs
 * (R-3.5, ADR-201; security scope 6): birth data under the API's names and the database's, an address, a name or note
 * someone typed, a Clerk id, a session or invite token, a cookie, an IP, and the edge's secret, which would let anyone
 * name their own address to the limits (ADR-224). Each key is censored at the top of a line and one level down, so a
 * body, a row or headers logged whole keep their keys and lose these values.
 */
const PERSONAL_KEYS = [
  "birthDate", "birth_date", "birthTime", "birth_time", "birthPlace", "birth_place",
  "latitude", "longitude", "lat", "lon", "lng", "timezone", "city", "country", "display_name",
  "email", "emailAddress", "to", "cc", "bcc",
  "name", "firstName", "lastName", "recipientName", "recipient_name", "subjectName", "subject_name",
  "giverName", "inviterName", "claimedByName", "profileName", "note",
  "userId", "user_id", "claimedByUserId", "claimed_by_user_id", "createdByUserId", "created_by_user_id", "user",
  "sessionId", "session_id", "token", "cookie", "authorization", "set-cookie", "x-forwarded-for", "x-real-ip",
  "x-vercel-forwarded-for", "x-edge-proxy-secret",
  // Vercel's guess at where the visitor is; the edge's middleware passes on every header it saw, these among them.
  "x-vercel-ip-city", "x-vercel-ip-country", "x-vercel-ip-country-region", "x-vercel-ip-postal-code",
  "x-vercel-ip-latitude", "x-vercel-ip-longitude",
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
  "req.headers['x-edge-proxy-secret']",
  "res.headers['set-cookie']",
];

function censor(value: unknown, path: string[]): unknown {
  return path.length === 2 && ERROR_KEYS.includes(path[0]) && path[1] === "name" ? value : CENSOR;
}

// Free text no key can censor. drizzle-orm's DrizzleQueryError ends its message, and so its stack, with the query's
// parameters: a profile's birth data, an address, a whole report; the SQL before them stays, so the line still says
// which statement failed. A refusal is the model's own words, which can repeat the brief: everything after its prefix
// goes, as it does from the failure log's rows (S7), and the section named before it stays. An address turns up in a
// provider's or a database's own words.
const PARAMS = "\nparams: ";
const REFUSAL = /(model refused:)[\s\S]*/;
const EMAIL = /[\w.%+-]+@[a-z\d-]+(?:\.[a-z\d-]+)*\.[a-z]{2,}/gi;

function scrub(text: string): string {
  const at = text.indexOf(PARAMS);
  const kept = (at < 0 ? text : text.slice(0, at)).replace(REFUSAL, "$1 …");
  return kept.includes("@") ? kept.replace(EMAIL, "[email]") : kept;
}

// Strings at the top of a line and one level down, as deep as the keys reach. Only plain objects are copied: an
// error or a request keeps its class for its serializer.
function scrubLeaves(value: unknown): unknown {
  if (typeof value === "string") return scrub(value);
  if (value === null || typeof value !== "object" || Object.getPrototypeOf(value) !== Object.prototype) return value;
  return Object.fromEntries(Object.entries(value).map(([key, leaf]) => [key, typeof leaf === "string" ? scrub(leaf) : leaf]));
}

// The edge's header in any case: Node lowercases a request's headers, but rawHeaders and a block built by hand keep the
// case they were sent in.
const EDGE_HEADER = "x-edge-proxy-secret";
const NAMES_EDGE = /x-edge-proxy-secret/i;

function isEdgeName(value: unknown): boolean {
  return typeof value === "string" && value.toLowerCase() === EDGE_HEADER;
}

/**
 * The edge's secret is in no line (reading 14), and the key paths reach only the depths they name: a header block in an
 * error's own fields, in a list or deeper, a raw header list (a name, then its value) and the value itself in free text
 * all get past them. So the finished line is read last, on its way to the stream, the one place that sees all pino
 * prints: a child's bindings, the message, every serializer's output, pino-http's lines. A line that names the header or
 * holds the value as JSON writes it is parsed and written again with every value under that name, every entry after it
 * in a list and the value itself in any string or key censored; the rest of the line stays. Any other line goes out as
 * pino wrote it, after a substring scan or two. The value is EDGE_PROXY_SECRET as the middleware sends it, trimmed, and
 * blank is unset: then only the name is looked for.
 */
function edgeCensor(configured: string | undefined): (line: string) => string {
  const secret = configured?.trim() || undefined;
  const written = secret === undefined ? undefined : JSON.stringify(secret).slice(1, -1);
  const text = (value: string) => (secret === undefined ? value : value.split(secret).join(CENSOR));
  const clean = (node: unknown): unknown => {
    if (typeof node === "string") return text(node);
    if (Array.isArray(node)) return node.map((item, i) => (i > 0 && isEdgeName(node[i - 1]) ? CENSOR : clean(item)));
    if (node === null || typeof node !== "object") return node;
    const entries = Object.entries(node).map(([key, value]) => [text(key), isEdgeName(key) ? CENSOR : clean(value)]);
    return Object.fromEntries(entries);
  };
  return (line) => {
    if (!NAMES_EDGE.test(line) && (written === undefined || !line.includes(written))) return line;
    // This runs inside every log call, so it must not throw into a route; a line that will not parse or walk still
    // loses the value, if not its shape.
    try {
      return JSON.stringify(clean(JSON.parse(line))) + line.slice(line.trimEnd().length);
    } catch {
      return written === undefined ? line : line.split(written).join(CENSOR);
    }
  };
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
 * pino's own serializer, less a failed query's parameters, a refusal's words, a section's last reply and any address in
 * the text. pino-http hands its error serializer pino's output rather than the error, and that output keeps the error as
 * `raw`.
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
  // A SectionError carries the model's last reply whole, for the round alone to start from; no line needs it.
  delete clean.lastReply;
  // The exact tails keep a cause's message and the stack's frames; a tail that no longer matches is cut to the end.
  for (const key of ["message", "stack"]) {
    const text = clean[key];
    if (typeof text === "string") clean[key] = scrub(tails.reduce((s, tail) => s.split(tail).join(""), text));
  }
  // A SectionError's errors are its attempts' check messages, the refusal among them, and pino copies them twice.
  for (const key of ["errors", "aggregateErrors"]) {
    const list = clean[key];
    if (Array.isArray(list)) clean[key] = list.map((item: unknown) => (typeof item === "string" ? scrub(item) : item));
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
    // Read once, here, as LOG_LEVEL is: the variable is set before the process starts, and every child, pino-http's
    // among them, inherits the hook.
    hooks: { streamWrite: edgeCensor(env.EDGE_PROXY_SECRET) },
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

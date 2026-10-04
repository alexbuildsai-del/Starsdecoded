import type { RequestHandler, Response } from "express";

// Anyone can name a Vercel project starsdecoded-something, so a preview is ours only by the team slug Vercel ends its host
// with (MB-154): `<project>-<9-character hash>-<team>` or `<project>-git-<branch>-<team>`. A team whose own slug ends in
// -stars-decoded can still make a host of this shape, and no rule on the name alone tells the two apart.
const OUR_PREVIEWS = /^https:\/\/starsdecoded-(?:[a-z0-9]{9}|git-[a-z0-9-]+)-stars-decoded\.vercel\.app$/;

// Public hosts, so the code holds them and no deploy waits on a dashboard edit; WEB_ORIGINS replaces them (ADR-197).
const OUR_ORIGINS: Array<string | RegExp> = [
  "https://mystarsdecoded.com",
  "https://www.mystarsdecoded.com",
  "https://starsdecoded-staging.vercel.app",
  OUR_PREVIEWS,
];

// The dev server is local and runs on any port, and no localhost belongs in shipped code.
const ANY_ORIGIN = /^/;

const READS = new Set(["GET", "HEAD", "OPTIONS"]);

const NO_FRAMING = "frame-ancestors 'none'";

export function webOrigins(env: NodeJS.ProcessEnv = process.env): Array<string | RegExp> {
  const listed = (env.WEB_ORIGINS ?? "").split(/[\s,]+/).filter(Boolean).map(toAllowed);
  if (listed.length > 0) return listed;
  return env.NODE_ENV === "development" ? [ANY_ORIGIN] : [...OUR_ORIGINS];
}

// A browser serialises an origin in lower case with no trailing slash, so a pasted value is brought to that form.
function toAllowed(entry: string): string | RegExp {
  const origin = entry.toLowerCase().replace(/\/+$/, "");
  if (!origin.includes("*")) return origin;
  // A wildcard spans one label, so it cannot stretch across a dot into a domain that is not ours.
  return new RegExp(`^${origin.split("*").map(escapeRegExp).join("[a-z0-9-]+")}$`);
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function originAllowed(origin: string, origins: Array<string | RegExp>): boolean {
  // An opaque origin (a sandboxed frame, a file, a redirect from another site) is never one of our pages.
  if (origin === "null") return false;
  return origins.some((allowed) => (typeof allowed === "string" ? allowed === origin : allowed.test(origin)));
}

/**
 * The web reaches /api on its own origin through Vercel's rewrites, so the API sends no CORS headers and a page on any other
 * site has no business writing here (ADR-197). A browser sends Origin with every write it makes; a request without one is a
 * server, a script or a webhook, which a forged page cannot be.
 */
export function originGuard(origins: Array<string | RegExp> = webOrigins()): RequestHandler {
  return (req, res, next) => {
    const origin = req.headers.origin;
    if (origin === undefined || READS.has(req.method) || originAllowed(origin, origins)) return next();
    res.status(403).json({ error: "forbidden_origin", message: "This request has to come from the Stars Decoded website." });
  };
}

/**
 * No API answer may be sniffed into another type, framed by any page, ours included, or read across origins (ADR-197, 198).
 * The last two are settled as the head is written: Express's own 404 and error pages set "default-src 'none'" over our policy,
 * and frame-ancestors never falls back to default-src; Clerk's handshake adds `Access-Control-Allow-Origin: null` with
 * credentials of its own.
 */
export function apiHeaders(): RequestHandler {
  return (_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Content-Security-Policy", NO_FRAMING);
    const writeHead = res.writeHead as (this: Response, ...args: unknown[]) => Response;
    res.writeHead = function (this: Response, ...args: unknown[]) {
      const policy = this.getHeader("Content-Security-Policy");
      if (typeof policy !== "string" || !policy.includes("frame-ancestors")) {
        this.setHeader("Content-Security-Policy", typeof policy === "string" && policy ? `${policy}; ${NO_FRAMING}` : NO_FRAMING);
      }
      for (const name of this.getHeaderNames()) {
        if (name.startsWith("access-control-")) this.removeHeader(name);
      }
      return writeHead.apply(this, args);
    } as Response["writeHead"];
    next();
  };
}

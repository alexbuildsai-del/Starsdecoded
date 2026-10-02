import { next } from "@vercel/functions/middleware";

// Vercel's edge runtime hands middleware the project's variables on process.env. Node's types are not loaded for this
// file (tsconfig.middleware.json), so a Node-only import fails the type gate before it can reach the edge bundle.
declare const process: { env: Record<string, string | undefined> };

/**
 * Every call to /api leaves here for Railway carrying EDGE_PROXY_SECRET, so the API can tell a call that came through
 * our edge, whose forwarded address Vercel set, from a direct one that names any address it likes (ADR-224, MB-150).
 * The secret goes only into `request.headers`, which Vercel applies to the call upstream; `next()`'s own `headers` are
 * sent to the visitor, so they are never used. Unset, nothing is added and the API keys every limit on the address
 * Railway saw.
 */
export default function middleware(request: Request): Response {
  const secret = process.env.EDGE_PROXY_SECRET;
  if (!secret) return next();
  // The list replaces the upstream call's headers whole, so it starts from the visitor's; `set` also drops a value a
  // visitor sent under the same name.
  const headers = new Headers(request.headers);
  headers.set("x-edge-proxy-secret", secret);
  // MB-167 provisional: that Vercel carries these through vercel.json's rewrite to Railway shows only on a deploy; if
  // staging's healthz never says edge, this becomes a rewrite to Railway made here.
  return next({ request: { headers } });
}

export const config = { matcher: "/api/:path*" };

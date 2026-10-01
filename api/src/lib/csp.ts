import { originAllowed, webOrigins } from "../middlewares/origin.js";

/**
 * A browser's Content-Security-Policy report, brought down to what the admin's
 * count needs (ADR-198): the directive, and the blocked host or one of a few
 * keywords. A URL's path and query never leave this module, and the page's own
 * host is used only to decide whether the page is ours (R-3.5).
 */
export type CspReport = { directive: string; blocked: string; documentHost: string };

export type CspCount = { directive: string; blocked: string; count: number };

/** `report-uri` posts the first, `report-to` through the Reporting API the second. */
export const CSP_REPORT_TYPES = ["application/csp-report", "application/reports+json"];

export const CSP_WINDOW_DAYS = 7;

// CSP Level 3's directives. A closed list, so a forged report cannot write an arbitrary word into the admin's table.
const DIRECTIVES = new Set([
  "default-src", "script-src", "script-src-elem", "script-src-attr", "style-src", "style-src-elem", "style-src-attr",
  "img-src", "font-src", "connect-src", "media-src", "object-src", "frame-src", "child-src", "worker-src", "manifest-src",
  "prefetch-src", "fenced-frame-src", "base-uri", "form-action", "frame-ancestors", "navigate-to", "sandbox",
  "require-trusted-types-for", "trusted-types", "upgrade-insecure-requests", "block-all-mixed-content", "plugin-types",
  "webrtc",
]);

// CSP2 reports an inline violation as the empty string and early Firefox as "self"; WebAssembly's eval is still an eval.
const KEYWORDS = new Map([["", "inline"], ["self", "inline"], ["inline", "inline"], ["eval", "eval"], ["wasm-eval", "eval"]]);

const SCHEME_ONLY = new Map([["data", "data"], ["blob", "blob"]]);

const HOST_SCHEMES = new Set(["http:", "https:", "ws:", "wss:"]);

// A srcdoc frame's or an extension's page can carry our policy, but only a page on the web can be one of ours.
const PAGE_SCHEMES = new Set(["http:", "https:"]);

// A DNS name is at most 253 characters and a port adds six; anything longer is not a host.
const MAX_HOST = 260;

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function text(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function mediaType(contentType: string | undefined): string {
  return (contentType ?? "").split(";")[0]!.trim().toLowerCase();
}

// CSP2 browsers put the whole directive, sources included, in violated-directive.
function directiveOf(effective: string | undefined, violated: string | undefined): string | null {
  const name = (effective || violated || "").trim().split(/\s+/)[0]!.toLowerCase();
  return DIRECTIVES.has(name) ? name : null;
}

/**
 * A browser reports a blocked URL whole, an origin, or for anything without one a word or a bare scheme. Each becomes a
 * host or one of inline, eval, data, blob and extension; any other value is not counted, since it could only be a string a
 * forger chose.
 */
export function blockedOf(raw: string | undefined): string | null {
  const value = (raw ?? "").trim().toLowerCase();
  const keyword = KEYWORDS.get(value);
  if (keyword) return keyword;
  const scheme = /^([a-z][a-z0-9+.-]*)(?::|$)/.exec(value)?.[1] ?? "";
  const schemeOnly = SCHEME_ONLY.get(scheme);
  if (schemeOnly) return schemeOnly;
  // Safari masks an extension's own URLs behind webkit-masked-url; the others carry the extension's id, never a host.
  if (scheme.endsWith("-extension") || scheme === "webkit-masked-url") return "extension";
  return hostOf(value, HOST_SCHEMES);
}

function hostOf(value: string | undefined, schemes: Set<string>): string | null {
  if (!value) return null;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (!schemes.has(url.protocol) || !url.hostname || url.host.length > MAX_HOST) return null;
  return url.host;
}

/**
 * One report: the body `report-uri` posts, or one entry of the Reporting API's batch. Null when it is not a CSP violation
 * or cannot be reduced to a known directive, a blocked host or keyword, and the page's host.
 */
export function parseCspReport(contentType: string | undefined, body: unknown): CspReport | null {
  const type = mediaType(contentType);
  let directive: string | null;
  let blocked: string | null;
  let documentHost: string | null;
  if (type === "application/csp-report") {
    const report = record(record(body)?.["csp-report"]);
    if (!report) return null;
    directive = directiveOf(text(report["effective-directive"]), text(report["violated-directive"]));
    blocked = blockedOf(text(report["blocked-uri"]));
    documentHost = hostOf(text(report["document-uri"]), PAGE_SCHEMES);
  } else if (type === "application/reports+json") {
    const entry = record(body);
    const report = record(entry?.body);
    if (!entry || !report || entry.type !== "csp-violation") return null;
    directive = directiveOf(text(report.effectiveDirective), text(report.violatedDirective));
    blocked = blockedOf(text(report.blockedURL));
    documentHost = hostOf(text(report.documentURL) ?? text(entry.url), PAGE_SCHEMES);
  } else {
    return null;
  }
  if (!directive || !blocked || !documentHost) return null;
  return { directive, blocked, documentHost };
}

/** Every report in a request: the Reporting API batches them, and a batch may carry other kinds of report too. */
export function parseCspReports(contentType: string | undefined, body: unknown): CspReport[] {
  const entries = mediaType(contentType) === "application/reports+json" && Array.isArray(body) ? body : [body];
  return entries.map((entry) => parseCspReport(contentType, entry)).filter((report): report is CspReport => report !== null);
}

/** Our pages are the hosts the origin guard lets write (ADR-197); a page served over plain http is ours only where listed. */
export function ourPage(documentHost: string, origins: Array<string | RegExp> = webOrigins()): boolean {
  return originAllowed(`https://${documentHost}`, origins) || originAllowed(`http://${documentHost}`, origins);
}

/** What one request adds to the table: our pages' violations, one count per directive and blocked host or keyword. */
export function cspCounts(reports: CspReport[], origins: Array<string | RegExp> = webOrigins()): CspCount[] {
  const counts = new Map<string, CspCount>();
  for (const { directive, blocked, documentHost } of reports) {
    if (!ourPage(documentHost, origins)) continue;
    const key = `${directive} ${blocked}`;
    const seen = counts.get(key);
    if (seen) seen.count += 1;
    else counts.set(key, { directive, blocked, count: 1 });
  }
  return [...counts.values()];
}

/** Counts are kept per UTC day, so a day reads the same wherever the admin is. */
export function utcDay(at: Date | number = Date.now()): string {
  return new Date(at).toISOString().slice(0, 10);
}

/** The first day the admin's view covers: today and the six before it. */
export function cspWindowStart(now: Date | number = Date.now()): string {
  return utcDay(new Date(now).getTime() - (CSP_WINDOW_DAYS - 1) * 86_400_000);
}

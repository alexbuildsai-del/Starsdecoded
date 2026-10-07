/**
 * The web's Content-Security-Policy (ADR-198), report-only until seven days pass with no violation from our own pages
 * (MB-147). Every source it allows is listed here and nowhere else; vercel.json carries what this file writes, once for
 * production's hosts and once for the preview hosts, where Vercel adds its toolbar to every page.
 *
 *   node scripts/csp.mjs --check   the build's last step: fails when vercel.json is behind this file or the pages
 *   node scripts/csp.mjs --write   csp:write, rewrites both variants from the pages the build just wrote
 */
import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const web = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.resolve(web, "..", "dist");
const vercelFile = path.resolve(web, "..", "vercel.json");

const WRITE = "pnpm --filter @workspace/web run csp:write";
const CSP = "Content-Security-Policy-Report-Only";
const ENDPOINTS = "Reporting-Endpoints";
/** Relative, so each host's reports reach its own /api, which vercel.json sends to that environment's API. */
const REPORTS = { group: "csp", path: "/api/csp-report" };
const ENDPOINTS_VALUE = `${REPORTS.group}="${REPORTS.path}"`;

/** Clerk's Frontend API, read off the publishable key in staging's bundle: one Clerk application serves both sites. */
const CLERK = "https://well-dory-9343.clerk.accounts.dev";
/** Clerk's bot check on sign-up is Cloudflare Turnstile, a script that opens a frame. */
const CHALLENGE = "https://challenges.cloudflare.com";
/**
 * /checkout's Stripe.js, which Stripe requires from its own host, and the frames it draws the fields and wallets in
 * (ADR-274); Stripe's CSP guide lists its subdomains beside it.
 */
const STRIPE_JS = ["https://js.stripe.com", "https://*.js.stripe.com"];
/** A card's 3D Secure check and other confirmations open in a frame from here. */
const STRIPE_HOOKS = "https://hooks.stripe.com";
/** Stripe.js calls Stripe's API from our page, and sends its fraud signals to m.stripe.network. */
const STRIPE_CONNECT = ["https://api.stripe.com", "https://m.stripe.network"];

const POLICY = {
  "default-src": ["'self'"],
  "script-src": ["'self'", CLERK, CHALLENGE, ...STRIPE_JS],
  // Clerk writes style elements at run time, and the prerendered pages carry style attributes.
  "style-src": ["'self'", "'unsafe-inline'"],
  "img-src": ["'self'", "data:", "blob:", "https://img.clerk.com"],
  "font-src": ["'self'"],
  "connect-src": [
    "'self'",
    CLERK,
    // A development instance, which staging's key names, sends Clerk its telemetry; a production instance sends none.
    "https://clerk-telemetry.com",
    ...STRIPE_CONNECT,
  ],
  "frame-src": [CHALLENGE, ...STRIPE_JS, STRIPE_HOOKS],
  // Clerk runs its session timers in a worker it builds from a blob.
  "worker-src": ["'self'", "blob:"],
  "frame-ancestors": ["'none'"],
  "base-uri": ["'none'"],
  "form-action": ["'none'"],
  "object-src": ["'none'"],
};

/** The sources Vercel's CSP guide gives its toolbar, which a preview's pages load whoever visits. */
const TOOLBAR = {
  "script-src": ["https://vercel.live"],
  "style-src": ["https://vercel.live"],
  "img-src": ["https://vercel.live", "https://vercel.com"],
  "font-src": ["https://vercel.live", "https://assets.vercel.com"],
  "connect-src": ["https://vercel.live", "wss://ws-us3.pusher.com"],
  "frame-src": ["https://vercel.live"],
};

function fail(lines) {
  console.error(["csp.mjs:", ...lines].join("\n  "));
  process.exit(1);
}

/** A directive the base leaves out starts from default-src, as a browser would read it. */
function policy(hashes, extra = {}) {
  const directives = { ...POLICY };
  for (const [name, sources] of Object.entries(extra)) {
    directives[name] = [...(POLICY[name] ?? POLICY["default-src"]), ...sources];
  }
  directives["script-src"] = [...directives["script-src"], ...hashes];
  return [
    ...Object.entries(directives).map(([name, sources]) => [name, ...sources].join(" ")),
    `report-uri ${REPORTS.path}`,
    `report-to ${REPORTS.group}`,
  ].join("; ");
}

const pageOf = (file) => `/${file.split(path.sep).join("/").replace(/\.html$/, "").replace(/(^|\/)index$/, "")}`;
const sha256 = (text) => `'sha256-${createHash("sha256").update(text, "utf8").digest("base64")}'`;

/**
 * Every inline script of every built page, hashed as a browser hashes it. Today they are the JSON-LD blocks, which CSP
 * never runs, but the policy names them (security scope 3) so that an enforced one cannot drift from the pages.
 */
async function pageScripts() {
  const files = await readdir(dist, { recursive: true }).catch(() => []);
  const pages = files.filter((file) => file.endsWith(".html")).sort();
  if (pages.length === 0) fail(["dist/ holds no built page; run `pnpm run build:web` first."]);
  return Promise.all(
    pages.map(async (file) => {
      const html = await readFile(path.join(dist, file), "utf8");
      const inline = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)].filter(
        ([, attributes]) => !/\bsrc\s*=/i.test(attributes),
      );
      return { page: pageOf(file), hashes: inline.map(([, , text]) => sha256(text)) };
    }),
  );
}

const hostsOf = (conditions = []) =>
  conditions
    .filter((condition) => condition.type === "host")
    .map((condition) => condition.value)
    .sort();

/**
 * The rules that carry the policy, in file order. A rule that has a host is a preview's; production's is the one rule
 * missing exactly those hosts, so every host gets one policy and none gets two.
 */
function cspRules(config) {
  const rules = (config.headers ?? []).filter((rule) => rule.headers.some((header) => header.key === CSP));
  const preview = rules.filter((rule) => hostsOf(rule.has).length > 0);
  const production = rules.filter((rule) => hostsOf(rule.has).length === 0);
  if (preview.length === 0 || production.length !== 1) {
    fail([`vercel.json needs one ${CSP} rule for production and one for each preview host.`]);
  }
  const previewHosts = preview.flatMap((rule) => hostsOf(rule.has)).sort();
  if (JSON.stringify(hostsOf(production[0].missing)) !== JSON.stringify(previewHosts)) {
    fail([`vercel.json's production ${CSP} rule must be \`missing\` exactly the preview hosts:`, ...previewHosts]);
  }
  return rules.map((rule) => ({ rule, variant: preview.includes(rule) ? "preview" : "production" }));
}

const valueOf = (rule, key) => rule.headers.find((header) => header.key === key)?.value;
const listedHashes = (value = "") =>
  (value.split(";").find((directive) => directive.trim().startsWith("script-src ")) ?? "")
    .trim()
    .split(/\s+/)
    .filter((source) => source.startsWith("'sha256-"));

const mode = process.argv[2];
if (mode !== "--check" && mode !== "--write") fail(["usage: node scripts/csp.mjs --check | --write"]);

const scripts = await pageScripts();
const hashes = [...new Set(scripts.flatMap((page) => page.hashes))].sort();
const expected = { production: policy(hashes), preview: policy(hashes, TOOLBAR) };
const text = await readFile(vercelFile, "utf8");
const rules = cspRules(JSON.parse(text));
const behind = (config) =>
  cspRules(config).filter(
    ({ rule, variant }) => valueOf(rule, CSP) !== expected[variant] || valueOf(rule, ENDPOINTS) !== ENDPOINTS_VALUE,
  );

if (mode === "--write") {
  // Only the values change, so the file keeps its hand-set layout and the diff shows the policy alone.
  const value = (key) => new RegExp(`("key":\\s*"${key}",\\s*"value":\\s*)"(?:[^"\\\\]|\\\\.)*"`, "g");
  let next = 0;
  const written = text
    .replace(value(CSP), (_, head) => `${head}${JSON.stringify(expected[rules[next++]?.variant] ?? "")}`)
    .replace(value(ENDPOINTS), (_, head) => `${head}${JSON.stringify(ENDPOINTS_VALUE)}`);
  if (next !== rules.length || behind(JSON.parse(written)).length > 0) {
    fail([`vercel.json: give each header of the ${CSP} rules its "key" before its "value", one header per object.`]);
  }
  if (written !== text) await writeFile(vercelFile, written);
  console.log(`csp: vercel.json ${written === text ? "already held" : "now holds"} the policy, on ${rules.length} host rules`);
} else {
  const stale = behind(JSON.parse(text));
  if (stale.length > 0) {
    const listed = stale.map(({ rule }) => listedHashes(valueOf(rule, CSP)));
    const pagesWith = (hash) => scripts.filter((page) => page.hashes.includes(hash)).map((page) => page.page);
    fail([
      "vercel.json's report-only CSP is not the one scripts/csp.mjs writes for these pages (ADR-198).",
      ...hashes
        .filter((hash) => listed.some((own) => !own.includes(hash)))
        .map((hash) => `it lacks ${hash}, an inline script on ${pagesWith(hash).join(" ")}`),
      ...[...new Set(listed.flat())].filter((hash) => !hashes.includes(hash)).map((hash) => `no page has ${hash} any more`),
      `Run \`${WRITE}\` and commit vercel.json.`,
    ]);
  }
  console.log(`csp: vercel.json names the ${hashes.length} inline scripts of ${scripts.length} pages, on ${rules.length} host rules`);
}

/**
 * IndexNow from production (landing scope 21, ADR-115): once the web a commit shipped is live, tell Bing, and the AI
 * search that reads its index, which pages there are. The API does it so that no key or token sits on GitHub; the key
 * is the one the site serves at /indexnow.txt, public by design. A Release reaches production as a commit whether it
 * forwards `production` by token (MB-75) or Promote does, so the task goes by commit and not by who moved the branch:
 * it waits until the home page's `commit` meta is this process's own commit, sends the sitemap's URLs once, and logs
 * one line. It runs after the listen, in the background, and nothing in it rejects, so it can neither fail the start
 * nor hold it up.
 */
import { readAppEnv, readCommitSha } from "./appEnv.js";
import { logger } from "./logger.js";

/** Production's address. The web cannot be imported here (MB-108); web/src/site/site.ts names the same origin. */
export const SITE_ORIGIN = "https://mystarsdecoded.com";
export const KEY_LOCATION = `${SITE_ORIGIN}/indexnow.txt`;
/** One endpoint reaches every search engine that takes part in IndexNow. */
const ENDPOINT = "https://api.indexnow.org/IndexNow";

/**
 * Vercel and Railway deploy a commit minutes apart. Twenty minutes covers a slow build; past that the web's build has
 * most likely failed, and a release that did not ship is not announced.
 */
export const GIVE_UP_MS = 20 * 60_000;
export const POLL_MS = 30_000;
const FETCH_TIMEOUT_MS = 15_000;

const USER_AGENT = "starsdecoded-indexnow";
// The home page is the clock this task waits on, so no cache may answer for it.
const READ_HEADERS = { "user-agent": USER_AGENT, "cache-control": "no-cache" };
const POST_HEADERS = { "user-agent": USER_AGENT, "content-type": "application/json; charset=utf-8" };

export interface IndexNowDeps {
  env: NodeJS.ProcessEnv;
  fetcher: typeof fetch;
  sleep(ms: number): Promise<void>;
  now(): number;
  log(level: "info" | "warn", line: string): void;
  /**
   * The commits this process has asked about. A second ask for one does nothing, so a commit is sent at most once per
   * process; a restart of the same commit asks again, which IndexNow tolerates, and remembering across restarts would
   * need a table.
   */
  attempted: Set<string>;
}

/** What waiting on a web host needs, swapped in tests so nothing is fetched and no one sleeps. */
export type WebWaitDeps = Pick<IndexNowDeps, "fetcher" | "sleep" | "now">;

export type IndexNowOutcome =
  | { kind: "skipped"; reason: string }
  | { kind: "sent"; commit: string; urls: number; status: number }
  | { kind: "gave_up"; commit: string; seen: string | null }
  | { kind: "failed"; commit: string; reason: string };

const XML_ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

/** The pages the site's own sitemap lists; an address on another host is left out, since IndexNow refuses a list that has one. */
export function sitemapUrls(xml: string): string[] {
  const urls = [...xml.matchAll(/<loc>\s*([^<]*?)\s*<\/loc>/g)].map((found) =>
    found[1].replace(/&(amp|lt|gt|quot|apos);/g, (_, name: string) => XML_ENTITIES[name]),
  );
  return [...new Set(urls)].filter((url) => url.startsWith(`${SITE_ORIGIN}/`));
}

/** The `commit` meta site/head.ts writes, whatever the order of its attributes; null on a page that has none. */
export function commitOf(html: string): string | null {
  for (const [tag] of html.matchAll(/<meta\b[^>]*>/gi)) {
    if (!/\bname=["']commit["']/i.test(tag)) continue;
    return /\bcontent=["']([^"']*)["']/i.exec(tag)?.[1].trim() || null;
  }
  return null;
}

/** 8 to 128 letters, digits and dashes is all IndexNow accepts; a page of HTML that answered in the key file's place is not a key. */
export function keyFrom(text: string): string | null {
  const key = text.trim();
  return /^[A-Za-z0-9-]{8,128}$/.test(key) ? key : null;
}

export function payload(key: string, urlList: string[]) {
  return { host: new URL(SITE_ORIGIN).host, key, keyLocation: KEY_LOCATION, urlList };
}

const short = (commit: string) => commit.slice(0, 7);

async function read(deps: WebWaitDeps, path: string, what: string, origin = SITE_ORIGIN): Promise<string> {
  const res = await deps.fetcher(`${origin}${path}`, {
    headers: READ_HEADERS,
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`${what} answered ${res.status}`);
  return res.text();
}

/** A home page that cannot be read yet says nothing about the release, so the wait goes on rather than fails. */
async function liveCommit(deps: WebWaitDeps, origin: string): Promise<string | null> {
  try {
    return commitOf(await read(deps, "/", "the home page", origin));
  } catch {
    return null;
  }
}

async function untilLive(deps: WebWaitDeps, origin: string, commit: string): Promise<{ live: boolean; seen: string | null }> {
  const deadline = deps.now() + GIVE_UP_MS;
  for (;;) {
    const seen = await liveCommit(deps, origin);
    if (seen && seen.toLowerCase() === commit.toLowerCase()) return { live: true, seen };
    const left = deadline - deps.now();
    if (left <= 0) return { live: false, seen };
    await deps.sleep(Math.min(POLL_MS, left));
  }
}

async function announce(deps: IndexNowDeps): Promise<IndexNowOutcome> {
  const commit = readCommitSha(deps.env);
  if (!commit) return { kind: "skipped", reason: "this process does not know its commit (RAILWAY_GIT_COMMIT_SHA)" };
  if (deps.attempted.has(commit)) return { kind: "skipped", reason: `already asked for ${short(commit)}` };
  deps.attempted.add(commit);
  try {
    const { live, seen } = await untilLive(deps, SITE_ORIGIN, commit);
    if (!live) return { kind: "gave_up", commit, seen };
    const urls = sitemapUrls(await read(deps, "/sitemap.xml", "the sitemap"));
    if (urls.length === 0) throw new Error("the sitemap lists no pages");
    const key = keyFrom(await read(deps, "/indexnow.txt", "the key file"));
    if (!key) throw new Error("the key file does not hold an IndexNow key");
    const res = await deps.fetcher(ENDPOINT, {
      method: "POST",
      headers: POST_HEADERS,
      body: JSON.stringify(payload(key, urls)),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    // 202 is IndexNow taking the list and checking the key file afterwards.
    if (res.status !== 200 && res.status !== 202) {
      const detail = (await res.text().catch(() => "")).replace(/\s+/g, " ").trim().slice(0, 120);
      throw new Error(`IndexNow answered ${res.status}${detail ? `: ${detail}` : ""}`);
    }
    return { kind: "sent", commit, urls: urls.length, status: res.status };
  } catch (err) {
    return { kind: "failed", commit, reason: err instanceof Error ? err.message : String(err) };
  }
}

function describeOutcome(outcome: IndexNowOutcome): { level: "info" | "warn"; line: string } {
  switch (outcome.kind) {
    case "sent":
      return {
        level: "info",
        line: `IndexNow: sent ${outcome.urls} pages for ${short(outcome.commit)} (HTTP ${outcome.status})`,
      };
    case "gave_up":
      return {
        level: "warn",
        line: `IndexNow: gave up after ${GIVE_UP_MS / 60_000} minutes, the home page shows ${outcome.seen ? short(outcome.seen) : "no commit"} and this API is ${short(outcome.commit)}`,
      };
    case "failed":
      return { level: "warn", line: `IndexNow: nothing sent for ${short(outcome.commit)}, ${outcome.reason}` };
    case "skipped":
      return { level: "info", line: `IndexNow: skipped, ${outcome.reason}` };
  }
}

const attempted = new Set<string>();

function liveDeps(): IndexNowDeps {
  return {
    env: process.env,
    fetcher: (input, init) => fetch(input, init),
    // Unref'd so a wait in progress never keeps a stopping process alive.
    sleep: (ms) =>
      new Promise((resolve) => {
        setTimeout(resolve, ms).unref();
      }),
    now: Date.now,
    log: (level, line) => logger[level](line),
    attempted,
  };
}

/**
 * The same wait on any web host of ours: staging's walk starts only once the site it walks serves this commit
 * (ADR-315). Answers whether it did within GIVE_UP_MS and the commit the home page last showed; it never rejects.
 */
export async function untilWebServes(
  origin: string,
  commit: string,
  over: Partial<WebWaitDeps> = {},
): Promise<{ live: boolean; seen: string | null }> {
  return untilLive({ ...liveDeps(), ...over }, origin.replace(/\/+$/, ""), commit);
}

/**
 * Production only: staging and local never ping, and say nothing. Answers with the outcome, which is also the one
 * line it logs.
 */
export async function indexNowOnStart(over: Partial<IndexNowDeps> = {}): Promise<IndexNowOutcome | null> {
  const deps: IndexNowDeps = { ...liveDeps(), ...over };
  if (readAppEnv(deps.env) !== "production") return null;
  const outcome = await announce(deps);
  const { level, line } = describeOutcome(outcome);
  deps.log(level, line);
  return outcome;
}

/**
 * The IndexNow task on fake fetches and a fake clock (R11-27): nothing here reaches the network or waits. Pinned: the
 * URL list, the payload, the wait for the web's commit and the give-up, once per commit, production only, and that
 * nothing in the task rejects.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  GIVE_UP_MS,
  KEY_LOCATION,
  POLL_MS,
  SITE_ORIGIN,
  commitOf,
  indexNowOnStart,
  keyFrom,
  payload,
  sitemapUrls,
  type IndexNowDeps,
} from "./indexNow.js";

const SHA = "90c6bbf3a1d24e5f8b7c60d9e1f2a3b4c5d6e7f8";
const OLDER = "7d75e03b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f";
const NEXT = "c0ffee00a1d24e5f8b7c60d9e1f2a3b4c5d6e7f8";
// Only the fake site holds this, so a payload that carries it read it from /indexnow.txt.
const KEY = "0123456789abcdef0123456789abcdef";

const HOME = `${SITE_ORIGIN}/`;
const SITEMAP_URL = `${SITE_ORIGIN}/sitemap.xml`;
const ENDPOINT = "https://api.indexnow.org/IndexNow";
const PAGES = [
  "/",
  "/sky",
  "/method",
  "/compatibility",
  "/learn/whole-sign-houses",
  "/learn/birth-time",
  "/faq",
  "/privacy",
  "/terms",
  "/refunds",
  "/company",
].map((path) => (path === "/" ? HOME : `${SITE_ORIGIN}${path}`));
const PRODUCTION: NodeJS.ProcessEnv = { APP_ENV: "production", RAILWAY_GIT_COMMIT_SHA: SHA };

/** The shape web/src/site/crawl.ts's sitemapXml writes. */
const sitemap = (urls: string[]) =>
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((url) => `  <url>\n    <loc>${url}</loc>\n    <lastmod>2026-09-30</lastmod>\n  </url>\n`)
    .join("")}</urlset>\n`;

/** The shape web/src/site/head.ts writes: `<meta name="commit" content="…" />` among the page's other tags. */
const homePage = (commit: string | null) =>
  new Response(
    `<!DOCTYPE html>\n<html lang="en">\n  <head>\n    <title>Stars Decoded</title>\n    <meta name="description" content="The commit of the matter." />${
      commit ? `\n    <meta name="commit" content="${commit}" />` : ""
    }\n  </head>\n  <body><div id="root"></div></body>\n</html>\n`,
    { status: 200, headers: { "content-type": "text/html" } },
  );

type Handler = (n: number) => Response | Error;

interface World {
  deps: Partial<IndexNowDeps>;
  calls: Array<{ key: string; init?: RequestInit }>;
  slept: number[];
  lines: Array<{ level: string; line: string }>;
  count(key: string): number;
}

/** The production site and IndexNow, each answering as configured on the nth call, a failure as an Error. */
function world(
  over: {
    home?: Handler;
    sitemap?: Handler;
    key?: Handler;
    post?: Handler;
    env?: NodeJS.ProcessEnv;
    attempted?: Set<string>;
  } = {},
): World {
  const calls: World["calls"] = [];
  const slept: number[] = [];
  const lines: World["lines"] = [];
  const asked = new Map<string, number>();
  let clock = 0;
  const handlers: Record<string, Handler> = {
    [`GET ${HOME}`]: over.home ?? (() => homePage(SHA)),
    [`GET ${SITEMAP_URL}`]: over.sitemap ?? (() => new Response(sitemap(PAGES), { status: 200 })),
    [`GET ${KEY_LOCATION}`]:
      over.key ?? (() => new Response(`${KEY}\n`, { status: 200, headers: { "content-type": "text/plain" } })),
    [`POST ${ENDPOINT}`]: over.post ?? (() => new Response(null, { status: 200 })),
  };
  const fetcher = (async (input: string | URL | Request, init?: RequestInit) => {
    const key = `${init?.method ?? "GET"} ${String(input)}`;
    calls.push({ key, init });
    const n = asked.get(key) ?? 0;
    asked.set(key, n + 1);
    const answer = handlers[key]?.(n) ?? new Response("not here", { status: 404 });
    if (answer instanceof Error) throw answer;
    return answer;
  }) as unknown as typeof fetch;
  return {
    deps: {
      env: over.env ?? PRODUCTION,
      fetcher,
      sleep: async (ms) => {
        slept.push(ms);
        clock += ms;
      },
      now: () => clock,
      log: (level, line) => {
        lines.push({ level, line });
      },
      attempted: over.attempted ?? new Set(),
    },
    calls,
    slept,
    lines,
    count: (key) => calls.filter((call) => call.key === key).length,
  };
}

const POST = `POST ${ENDPOINT}`;

test("the sitemap's pages: every loc, unescaped, once each, and only production's own", () => {
  assert.deepEqual(sitemapUrls(sitemap(PAGES)), PAGES);
  const xml = sitemap([
    HOME,
    `${SITE_ORIGIN}/sky`,
    `${SITE_ORIGIN}/sky`,
    "https://elsewhere.example/page",
    `${SITE_ORIGIN}/a?x=1&amp;y=2`,
  ]);
  assert.deepEqual(sitemapUrls(xml), [HOME, `${SITE_ORIGIN}/sky`, `${SITE_ORIGIN}/a?x=1&y=2`]);
  assert.deepEqual(sitemapUrls("<html>not a sitemap</html>"), []);
});

test("commitOf reads the meta whatever its attribute order, and says null where a page has none", async () => {
  assert.equal(commitOf(await homePage(SHA).text()), SHA);
  assert.equal(commitOf(`<meta content='${SHA}' name='commit'>`), SHA);
  assert.equal(commitOf(await homePage(null).text()), null, "a description that says 'commit' is not the tag");
  assert.equal(commitOf(`<meta name="commit" content="" />`), null);
  assert.equal(commitOf("<html></html>"), null);
});

test("keyFrom takes an IndexNow key, trimmed, and nothing else", () => {
  assert.equal(keyFrom(`${KEY}\n`), KEY);
  assert.equal(keyFrom("a".repeat(8)), "a".repeat(8));
  assert.equal(keyFrom("a".repeat(128)), "a".repeat(128));
  assert.equal(keyFrom("a".repeat(7)), null);
  assert.equal(keyFrom("a".repeat(129)), null);
  assert.equal(keyFrom("<!DOCTYPE html><html></html>"), null, "a page answering in the key file's place is not a key");
  assert.equal(keyFrom("two words 12345678"), null);
});

test("the payload names the host, the key, the key file's address and the URLs, and nothing else", () => {
  assert.equal(KEY_LOCATION, "https://mystarsdecoded.com/indexnow.txt");
  assert.deepEqual(payload(KEY, PAGES), {
    host: "mystarsdecoded.com",
    key: KEY,
    keyLocation: KEY_LOCATION,
    urlList: PAGES,
  });
});

test("production with its web already live: one POST of the sitemap's URLs with the site's key, one log line", async () => {
  const w = world();
  const outcome = await indexNowOnStart(w.deps);
  assert.deepEqual(outcome, { kind: "sent", commit: SHA, urls: PAGES.length, status: 200 });
  assert.deepEqual(
    w.calls.map((call) => call.key),
    [`GET ${HOME}`, `GET ${SITEMAP_URL}`, `GET ${KEY_LOCATION}`, POST],
  );
  const post = w.calls[3].init!;
  assert.equal((post.headers as Record<string, string>)["content-type"], "application/json; charset=utf-8");
  assert.deepEqual(JSON.parse(String(post.body)), {
    host: "mystarsdecoded.com",
    key: KEY,
    keyLocation: KEY_LOCATION,
    urlList: PAGES,
  });
  assert.deepEqual(w.slept, []);
  assert.deepEqual(w.lines, [{ level: "info", line: `IndexNow: sent ${PAGES.length} pages for 90c6bbf (HTTP 200)` }]);
});

test("a 202, IndexNow checking the key file afterwards, is sent too; the web's commit matches in any case", async () => {
  const w = world({ home: () => homePage(SHA.toUpperCase()), post: () => new Response(null, { status: 202 }) });
  assert.deepEqual(await indexNowOnStart(w.deps), { kind: "sent", commit: SHA, urls: PAGES.length, status: 202 });
  assert.match(w.lines[0].line, /HTTP 202/);
});

test("it waits for the web to show its commit: an older one, a failed read and a page with no tag all mean not yet", async () => {
  const answers: Array<() => Response | Error> = [
    () => homePage(OLDER),
    () => new Error("socket hang up"),
    () => new Response("", { status: 503 }),
    () => homePage(null),
    () => homePage(SHA),
  ];
  const w = world({ home: (n) => answers[Math.min(n, answers.length - 1)]() });
  assert.equal((await indexNowOnStart(w.deps))?.kind, "sent");
  assert.equal(w.count(`GET ${HOME}`), 5);
  assert.deepEqual(w.slept, [POLL_MS, POLL_MS, POLL_MS, POLL_MS]);
  assert.equal(w.count(POST), 1);
  const firstRead = w.calls.findIndex((call) => call.key === `GET ${SITEMAP_URL}`);
  assert.ok(
    w.calls.slice(0, firstRead).every((call) => call.key === `GET ${HOME}`),
    "nothing but the home page is read until the web is live",
  );
  assert.equal(w.lines.length, 1);
});

test("it gives up after twenty minutes of the web not showing its commit, and sends nothing", async () => {
  assert.equal(GIVE_UP_MS, 20 * 60_000);
  const stale = world({ home: () => homePage(OLDER) });
  assert.deepEqual(await indexNowOnStart(stale.deps), { kind: "gave_up", commit: SHA, seen: OLDER });
  assert.equal(
    stale.slept.reduce((sum, ms) => sum + ms, 0),
    GIVE_UP_MS,
  );
  assert.equal(stale.count(`GET ${HOME}`), GIVE_UP_MS / POLL_MS + 1);
  assert.equal(stale.count(POST), 0);
  assert.equal(stale.count(`GET ${SITEMAP_URL}`), 0);
  assert.equal(stale.lines.length, 1);
  assert.equal(stale.lines[0].level, "warn");
  assert.match(stale.lines[0].line, /gave up after 20 minutes, the home page shows 7d75e03 and this API is 90c6bbf/);

  const down = world({ home: () => new Error("ECONNREFUSED") });
  assert.deepEqual(await indexNowOnStart(down.deps), { kind: "gave_up", commit: SHA, seen: null });
  assert.match(down.lines[0].line, /shows no commit/);
  assert.equal(down.count(POST), 0);
});

test("once per commit: the same commit asks nothing again, even at once, and the next commit sends again", async () => {
  const attempted = new Set<string>();
  const first = world({ attempted });
  assert.equal((await indexNowOnStart(first.deps))?.kind, "sent");
  assert.equal(first.count(POST), 1);

  const again = world({ attempted });
  assert.equal((await indexNowOnStart(again.deps))?.kind, "skipped");
  assert.equal(again.calls.length, 0, "not so much as a read of the home page");
  assert.equal(again.lines.length, 1);
  assert.match(again.lines[0].line, /already asked for 90c6bbf/);

  const next = world({ attempted, env: { ...PRODUCTION, RAILWAY_GIT_COMMIT_SHA: NEXT }, home: () => homePage(NEXT) });
  assert.equal((await indexNowOnStart(next.deps))?.kind, "sent");
  assert.equal(next.count(POST), 1);
  assert.equal(JSON.parse(String(next.calls.find((call) => call.key === POST)!.init!.body)).key, KEY);

  const shared = new Set<string>();
  const a = world({ attempted: shared });
  const b = world({ attempted: shared });
  await Promise.all([indexNowOnStart(a.deps), indexNowOnStart(b.deps)]);
  assert.equal(a.count(POST) + b.count(POST), 1, "two starts in one process still send once");
});

test("a failed send is not retried for the same commit", async () => {
  const attempted = new Set<string>();
  const refused = world({ attempted, post: () => new Response(null, { status: 429 }) });
  assert.equal((await indexNowOnStart(refused.deps))?.kind, "failed");
  const retry = world({ attempted });
  assert.equal((await indexNowOnStart(retry.deps))?.kind, "skipped");
  assert.equal(retry.count(POST), 0);
});

test("staging, development and an unnamed environment never ping and say nothing", async () => {
  const envs: NodeJS.ProcessEnv[] = [
    { APP_ENV: "staging" },
    { RAILWAY_ENVIRONMENT_NAME: "staging" },
    { APP_ENV: "staging", RAILWAY_ENVIRONMENT_NAME: "production" },
    { APP_ENV: "development" },
    {},
  ];
  for (const env of envs) {
    const w = world({ env: { ...env, RAILWAY_GIT_COMMIT_SHA: SHA } });
    assert.equal(await indexNowOnStart(w.deps), null);
    assert.equal(w.calls.length, 0);
    assert.deepEqual(w.lines, []);
  }
});

test("a production process that does not know its commit sends nothing and says so once", async () => {
  for (const env of [{ APP_ENV: "production" }, { APP_ENV: "production", RAILWAY_GIT_COMMIT_SHA: "" }]) {
    const w = world({ env });
    assert.equal((await indexNowOnStart(w.deps))?.kind, "skipped");
    assert.equal(w.calls.length, 0);
    assert.equal(w.lines.length, 1);
    assert.match(w.lines[0].line, /does not know its commit/);
  }
});

test("every read and the send carry a timeout, so a hung connection cannot outlast the wait", async () => {
  const w = world();
  await indexNowOnStart(w.deps);
  assert.ok(w.calls.length > 0);
  for (const call of w.calls) assert.ok(call.init?.signal, call.key);
});

const FAILURES: Array<[string, Parameters<typeof world>[0], RegExp, number]> = [
  [
    "IndexNow refusing the key",
    { post: () => new Response("key not valid", { status: 403 }) },
    /nothing sent for 90c6bbf, IndexNow answered 403: key not valid/,
    1,
  ],
  [
    "IndexNow answering too many requests",
    { post: () => new Response(null, { status: 429 }) },
    /IndexNow answered 429/,
    1,
  ],
  ["a network error on the send", { post: () => new Error("socket hang up") }, /socket hang up/, 1],
  ["a sitemap that is down", { sitemap: () => new Response("", { status: 500 }) }, /the sitemap answered 500/, 0],
  [
    "a sitemap that lists no page",
    { sitemap: () => new Response("<urlset/>", { status: 200 }) },
    /the sitemap lists no pages/,
    0,
  ],
  ["a page in the key file's place", { key: () => homePage(SHA) }, /the key file does not hold an IndexNow key/, 0],
  ["no key file", { key: () => new Response("", { status: 404 }) }, /the key file answered 404/, 0],
];

for (const [name, routes, pattern, posts] of FAILURES) {
  test(`${name}: one warning, never a rejection`, async () => {
    const w = world(routes);
    const outcome = await indexNowOnStart(w.deps);
    assert.equal(outcome?.kind, "failed");
    assert.equal(w.count(POST), posts);
    assert.equal(w.lines.length, 1);
    assert.equal(w.lines[0].level, "warn");
    assert.match(w.lines[0].line, pattern);
  });
}

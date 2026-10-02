/**
 * The QA agent without a browser and without a model: no Chromium is
 * `unconfigured`, never a crash; a stubbed walk and a stubbed reader turn a
 * sev-1 into `fail`, record one `qa` row with the cost, and never create a
 * report (MB-78). The personas walk only pages the site serves.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

process.env.OPENAI_API_KEY ??= "test-key-never-sent";
process.env.DATABASE_URL ??= "postgres://test:test@127.0.0.1:1/never";
const { browserBroken, runQaAgent } = await import("./index.js");
const { findChromium } = await import("./browser.js");
const { PERSONAS, FORBIDDEN_ACTIONS, RETIRED_NAME } = await import("./personas.js");
const { reportText, walkFindings } = await import("./reader.js");
const { emptySection } = await import("../usage.js");
type InsertLabRun = import("@workspace/db").InsertLabRun;
type PageVisit = import("./browser.js").PageVisit;

const visit = (over: Partial<PageVisit>): PageVisit => ({ persona: "Buyer", path: "/", status: 200, title: "Stars Decoded", text: "Your natal chart, computed. Whole-sign houses.", consoleErrors: [], screenshot: null, error: null, step: PERSONAS[0].steps[0], ...over });

test("no Chromium on the image is unconfigured, never a crash", async () => {
  assert.equal(findChromium({ PATH: "/nonexistent", QA_BROWSER_PATH: "/nonexistent/chromium" }), null);
  const out = await runQaAgent({ webOrigin: "https://staging.test", natalRunKey: null, pairRunKey: null, walker: null, store: { sections: async () => [], record: async () => undefined } });
  assert.equal(out.status, "unconfigured");
  assert.match(out.reason ?? "", /MB-77/);
});

test("the walk's own findings: a page that misses what the persona looks for, a forbidden word, a broken page", () => {
  assert.deepEqual(walkFindings([visit({})]), []);
  assert.equal(walkFindings([visit({ text: `Welcome to ${RETIRED_NAME.source}, your natal chart` })])[0].sev, 1);
  assert.match(walkFindings([visit({ text: "nothing here" })])[0].title, /misses what the persona looks for/);
  assert.equal(walkFindings([visit({ status: null, error: "net::ERR_CONNECTION_REFUSED" })])[0].sev, 1);
  assert.ok(FORBIDDEN_ACTIONS.includes("submit birth form") && FORBIDDEN_ACTIONS.includes("POST /api/waitlist"));
  assert.ok(PERSONAS.every((p) => p.steps.every((s) => !/\/report\/|\/compatibility\//.test(s.path))), "no persona opens a report it would have to create");
});

// Held by hand, like the crawl test's map, so a page joining or leaving the walk is a decision a test sees.
const WALKED: Record<string, string[]> = {
  Buyer: ["/", "/sky", "/sample", "/chart"],
  "Returning user": ["/dashboard"],
  Invitee: ["/claim?token=not-a-real-token"],
  Admin: ["/admin/prompts", "/admin/report-lab"],
  Skeptic: ["/method", "/learn/whole-sign-houses", "/privacy", "/terms", "/refunds", "/company"],
};

test("the personas walk the pages the site has, each checked for the retired name", () => {
  assert.deepEqual(Object.fromEntries(PERSONAS.map((p) => [p.name, p.steps.map((s) => s.path)])), WALKED);
  assert.ok(PERSONAS.every((p) => p.steps.every((s) => s.never?.includes(RETIRED_NAME))));
});

test("every step opens a path the site serves: a page in the registry, or an app route vercel.json hands to the app", () => {
  const registry = readFileSync(new URL("../../../../web/src/site/site.ts", import.meta.url), "utf8");
  const pages = [...registry.matchAll(/^\s+path: "(\/[^"]*)",$/gm)].map((m) => m[1]);
  assert.ok(pages.includes("/") && pages.includes("/sky") && pages.includes("/company"), "the registry's paths were read");
  const { rewrites } = JSON.parse(readFileSync(new URL("../../../../vercel.json", import.meta.url), "utf8")) as { rewrites: { source: string; destination: string }[] };
  const appRoutes = rewrites.filter((r) => r.destination === "/app").map((r) => new RegExp(`^${r.source}$`));
  assert.ok(appRoutes.some((re) => re.test("/dashboard")), "vercel.json's app routes were read");
  const unserved = PERSONAS.flatMap((p) => p.steps.map((s) => ({ persona: p.name, path: s.path.split("?")[0] }))).filter(({ path }) => !pages.includes(path) && !appRoutes.some((re) => re.test(path)));
  assert.deepEqual(unserved, [], "these answer with the 404 page, so the walk would test nothing");
});

test("Get my report ends at a sign-in: the birth form shown to a signed-out visitor is a sev-1, a page with no sign-in a sev-2", () => {
  const step = PERSONAS[0].steps.find((s) => s.path === "/chart");
  assert.ok(step);
  const at = (text: string) => walkFindings([visit({ persona: "Buyer", path: "/chart", step, text })]);
  assert.deepEqual(at("Welcome back Sign in to access your charts Continue with Google"), []);
  assert.ok(at("Enter your birth details Birth Date Write my report").some((f) => f.sev === 1));
  assert.deepEqual(at("Loading…").map((f) => f.sev), [2]);
});

test("the sample step looks for the report's name as the page prints it, Personal report, and a page with the old name misses it", () => {
  const step = PERSONAS[0].steps.find((s) => s.path === "/sample");
  assert.ok(step);
  const at = (text: string) => walkFindings([visit({ persona: "Buyer", path: "/sample", step, text })]);
  assert.deepEqual(at("A sample: 4 of 10 chapters from Audrey Hepburn's Personal report. Chapter 01"), []);
  assert.match(at("A sample from Audrey Hepburn's natal report. Chapter 01")[0]?.title ?? "", /misses what the persona looks for/);
});

test("a stubbed reader's sev-1 fails the verdict, the cost lands in one qa row, and no report was created", async () => {
  const recorded: InsertLabRun[] = [];
  const store = { sections: async (runKey: string) => (runKey === "marie-curie.release-abc" ? [{ section: "career", output: { vocationalPull: "You investigate first." } }] : []), record: async (row: InsertLabRun) => { recorded.push(row); } };
  const usage = { ...emptySection("qa:natal", "gpt-5.2"), attempts: 1, inputTokens: 1000, outputTokens: 200 };
  const reader = {
    read: async () => ({ findings: [{ sev: 1 as const, where: "natal report, career", title: "a score names the pair", detail: "\"You are 80% compatible.\"" }], usage }),
    see: async () => ({ findings: [], usage: { ...usage, section: "qa:walk" } }),
  };
  const walker = { walk: async () => [visit({ screenshot: "aGVsbG8=" })] };
  const out = await runQaAgent({ webOrigin: "https://staging.test", natalRunKey: "marie-curie.release-abc", pairRunKey: "curie-hepburn.release-abc", walker, reader, store, model: "gpt-5.2" });
  assert.equal(out.status, "fail");
  assert.equal(out.findings.filter((f) => f.sev === 1).length, 1);
  assert.ok(out.findings.some((f) => /no run to read/.test(f.title)), "the missing pair run is a finding, not a crash");
  assert.ok(out.costUsd > 0);
  assert.equal(recorded.length, 1);
  assert.equal(recorded[0].source, "qa");
  assert.equal(recorded[0].costUsd, out.costUsd);
});

test("a clean walk and a clean read pass", async () => {
  const usage = { ...emptySection("qa:natal", "gpt-5.2"), attempts: 1 };
  const out = await runQaAgent({ webOrigin: "https://staging.test", natalRunKey: null, pairRunKey: null, walker: { walk: async () => [visit({})] }, reader: { read: async () => ({ findings: [], usage }), see: async () => ({ findings: [], usage }) }, store: { sections: async () => [], record: async () => undefined }, model: "gpt-5.2" });
  assert.equal(out.status, "pass");
});

test("the reader gets the prose, never a label leaf it would take for a line of prose", () => {
  const text = reportText([
    { section: "relationships", output: { howYouLove: "You love slowly.", connectBestWith: [{ item: "A Moon or Venus in an earth sign", reason: "they stay" }], claims: [{ quote: "You love slowly." }] } },
    { section: "pair:links", output: { links: [{ planetA: "venus", planetB: "mars", aspect: "trine", reading: "You warm each other up." }] } },
  ]);
  assert.match(text, /You love slowly\./);
  assert.match(text, /they stay/);
  assert.match(text, /You warm each other up\./);
  for (const label of ["A Moon or Venus in an earth sign", "venus", "mars", "trine"]) assert.ok(!text.includes(label), `${label} is a label`);
});

test("a walk where every page failed or read blank is the browser's fault, said once", () => {
  const visit = (over: Partial<PageVisit>): PageVisit => ({ persona: "Buyer", path: "/", status: 200, title: "", text: "", consoleErrors: [], screenshot: null, error: null, step: PERSONAS[0].steps[0], ...over });
  assert.equal(browserBroken([visit({ error: "page.goto: Page crashed" }), visit({ path: "/sample" })]), true);
  assert.equal(browserBroken([visit({ error: "page.goto: Page crashed" }), visit({ path: "/sample", text: "Audrey Hepburn's Personal report" })]), false);
  assert.equal(browserBroken([]), false);
});

/**
 * The QA agent without a browser and without a model: no Chromium is
 * `unconfigured`, never a crash; a stubbed walk and a stubbed reader turn a
 * sev-1 into `fail`, record one `qa` row with the cost, and never create a
 * report (MB-78).
 */
import { test } from "node:test";
import assert from "node:assert/strict";

process.env.OPENAI_API_KEY ??= "test-key-never-sent";
process.env.DATABASE_URL ??= "postgres://test:test@127.0.0.1:1/never";
const { runQaAgent } = await import("./index.js");
const { findChromium } = await import("./browser.js");
const { PERSONAS, FORBIDDEN_ACTIONS } = await import("./personas.js");
const { walkFindings } = await import("./reader.js");
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
  assert.equal(walkFindings([visit({ text: "Welcome to Astra, your natal chart" })])[0].sev, 1);
  assert.match(walkFindings([visit({ text: "nothing here" })])[0].title, /misses what the persona looks for/);
  assert.equal(walkFindings([visit({ status: null, error: "net::ERR_CONNECTION_REFUSED" })])[0].sev, 1);
  assert.ok(FORBIDDEN_ACTIONS.includes("submit birth form"));
  assert.ok(PERSONAS.every((p) => p.steps.every((s) => !/\/report\/|\/compatibility\//.test(s.path))), "no persona opens a report it would have to create");
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

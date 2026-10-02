/**
 * The spend ledger without a database (MB-49): each visitor path, a natal
 * report and its regenerate, a pair, the horizon pass and the legacy pair
 * report, adds every reply's cost as it returns, rejected attempts, the
 * claims-only repair and a failed report included, while the lab's paths add
 * nothing (reading 7). The upsert and the breaker's read run on a scratch
 * Postgres in the round's walk.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

process.env.LOG_LEVEL ??= "silent";
const { cannedNatalReplies, installFakeModel } = await import("./testModel.js");
const { chartFromFixture } = await import("./testFixtures.js");
const { calculateNatalChart } = await import("./chartCalculation.js");
const { openai } = await import("@workspace/integrations-openai-ai-server");
const { callStructured, generateInterpretation, writeSection } = await import("./aiInterpretation.js");
const { generatePairInterpretation } = await import("./pairInterpretation.js");
const { generateSynastryInterpretation } = await import("./synastryInterpretation.js");
const { dbStore, runHorizonPass } = await import("./horizonPass.js");
const { buildPairBrief } = await import("./pairBrief.js");
const { pairReplies } = await import("./testPair.js");
const { ReportFailure } = await import("./failureReasons.js");
const { MODELS } = await import("./models.js");
const { costUsd } = await import("./usage.js");
const { SECTION_IDS } = await import("../prompts/index.js");
const { entryFor, recordSpend, setSpendSink, spentFrom, utcDay } = await import("./spendLedger.js");
const { z } = await import("zod/v4");
type SpendEntry = import("./spendLedger.js").SpendEntry;
type PassStore = import("./horizonPass.js").PassStore;
type ReportInterpretation = import("./aiInterpretation.js").ReportInterpretation;
type FakeRequest = import("./testModel.js").FakeRequest;

const ledger: SpendEntry[] = [];
setSpendSink(async (entry) => { ledger.push(entry); });

// The fake's usage on every reply: 1,000 prompt tokens, 800 of them cached, and 300 out.
const USAGE = { prompt_tokens: 1000, completion_tokens: 300, prompt_tokens_details: { cached_tokens: 800 } };
const unit = (model: string) => costUsd(model, { attempts: 1, inputTokens: 200, cachedInputTokens: 800, outputTokens: 300, reasoningTokens: 0, ms: 0 })!;

const fake = installFakeModel(cannedNatalReplies({ drawn: true, sunSign: "scorpio", sunHouse: 11 }));
const target = openai.chat.completions as unknown as { create: (req: FakeRequest & { model: string }, options?: unknown) => Promise<unknown> };
const answer = target.create;
/** Every reply the model returned, by schema name, so the test knows what was billed. */
const replied: Array<{ name: string; model: string }> = [];
target.create = async (req, options) => {
  // The legacy pair report asks for plain text, with no schema to key a canned reply by.
  const out = req.response_format ? await answer(req, options) : { choices: [{ message: { content: "You both decide late." } }], usage: USAGE };
  replied.push({ name: req.response_format?.json_schema.name ?? "synastry", model: req.model });
  return out;
};

const billedSince = (mark: number) => replied.slice(mark).reduce((n, r) => n + unit(r.model), 0);
const marks = () => ({ entries: ledger.length, replies: replied.length });
function close(actual: number, expected: number, message: string) {
  assert.ok(Math.abs(actual - expected) < 1e-12, `${message}: ${actual} against ${expected}`);
}

const curieChart = chartFromFixture("marie-curie");
const winfreyChart = chartFromFixture("oprah-winfrey");
const curieReplies = () => cannedNatalReplies({ drawn: true, sunSign: "scorpio", sunHouse: 11 });

test("the day's sum adds the rows' costs, and a figure that is not a finite amount of zero or more adds nothing", () => {
  assert.equal(spentFrom([]), 0);
  close(spentFrom([{ costUsd: 0.5 }, { costUsd: 0.25 }, { costUsd: 0 }]), 0.75, "three rows");
  close(spentFrom([{ costUsd: 0.5 }, { costUsd: Number.NaN }, { costUsd: Number.POSITIVE_INFINITY }, { costUsd: -3 }, { costUsd: null }]), 0.5, "odd rows");
});

test("an entry is the reply priced as usage.ts prices it, on the UTC day it returned; a reply with no tokens adds nothing", () => {
  const raw = { ...USAGE, completion_tokens_details: { reasoning_tokens: 100 } };
  const late = entryFor("natal", "gpt-6-luna", raw, "standard", new Date("2026-10-01T23:59:59.999Z"))!;
  assert.deepEqual([late.day, late.kind], ["2026-10-01", "natal"]);
  close(late.costUsd, costUsd("gpt-6-luna", { attempts: 1, inputTokens: 200, cachedInputTokens: 800, outputTokens: 300, reasoningTokens: 100, ms: 0 })!,
    "cached input at its own price, reasoning inside the output once");
  assert.equal(entryFor("natal", "gpt-6-luna", raw, "standard", new Date("2026-10-02T00:00:00.000Z"))!.day, "2026-10-02");
  close(entryFor("pair", "gpt-6.1-sol", raw, "flex")!.costUsd, entryFor("pair", "gpt-6.1-sol", raw)!.costUsd / 2, "flex at half");
  assert.equal(entryFor("synastry", "gpt-6-luna", undefined), null);
  assert.equal(entryFor("synastry", "gpt-6-luna", { prompt_tokens: 0, completion_tokens: 0 }), null);
});

test("recording never throws: a sink that fails loses the entry, not the call; with no kind nothing is written", async () => {
  const restore = setSpendSink(async () => { throw new Error("database down"); });
  try {
    await recordSpend("natal", "gpt-6-luna", USAGE);
  } finally {
    restore();
  }
  const before = ledger.length;
  await recordSpend(undefined, "gpt-6-luna", USAGE);
  assert.equal(ledger.length, before);
  await recordSpend("natal", "gpt-6-luna", USAGE);
  assert.equal(ledger.length, before + 1);
});

test("a visitor's natal report adds every reply as it returns, and its regenerate adds again rather than replacing it", async () => {
  fake.replies = curieReplies();
  const start = marks();
  const first = await generateInterpretation(curieChart, "Marie Curie", { reportId: "r-natal" });
  const added = ledger.slice(start.entries);
  assert.equal(added.length, replied.length - start.replies, "one entry a reply");
  assert.ok(added.every((e) => e.kind === "natal" && e.day === utcDay()));
  close(spentFrom(added), billedSince(start.replies), "every reply billed");
  close(spentFrom(added), first.meta.usage.costUsd!, "the ledger and the report's own usage agree on a clean report");

  const second = await generateInterpretation(curieChart, "Marie Curie", { reportId: "r-natal" });
  close(spentFrom(ledger.slice(start.entries)), first.meta.usage.costUsd! + second.meta.usage.costUsd!, "the first text's cost stays");
});

test("a natal section rejected on every attempt counts each reply, though its report fails and stores no usage", async () => {
  fake.replies = { ...curieReplies(), natal_career: {} };
  const start = marks();
  await assert.rejects(generateInterpretation(curieChart, "Marie Curie", { reportId: "r-failed" }), (err: unknown) => err instanceof ReportFailure);
  const career = replied.slice(start.replies).filter((r) => r.name === "natal_career").length;
  assert.equal(career, 6, "three attempts, then three in the round alone (ADR-84)");
  const added = ledger.slice(start.entries);
  assert.equal(added.length, replied.length - start.replies);
  close(spentFrom(added), billedSince(start.replies), "the six rejected replies included");
  assert.ok(spentFrom(added) >= 6 * unit(MODELS.sections));
});

test("the claims-only repair is a reply too, and counts", async () => {
  const canned = curieReplies() as Record<string, { claims: unknown[] }>;
  fake.replies = { ...canned, natal_career: { ...canned.natal_career, claims: canned.natal_career.claims.slice(0, 2) }, natal_career_claims: { claims: canned.natal_career.claims } };
  const start = marks();
  await generateInterpretation(curieChart, "Marie Curie", { reportId: "r-repair" });
  assert.deepEqual(replied.slice(start.replies).filter((r) => r.name.startsWith("natal_career")).map((r) => r.name), ["natal_career", "natal_career_claims"]);
  assert.equal(ledger.length - start.entries, replied.length - start.replies);
  close(spentFrom(ledger.slice(start.entries)), billedSince(start.replies), "the repair included");
});

test("a visitor's pair counts every reply under pair; the two natal reports beneath it, written with no id, add nothing", async () => {
  const start = marks();
  fake.replies = curieReplies();
  const curie = await generateInterpretation(curieChart, "Marie Curie");
  fake.replies = cannedNatalReplies({ drawn: true, sunSign: "aquarius", sunHouse: 3, sect: "night" });
  const winfrey = await generateInterpretation(winfreyChart, "Oprah Winfrey");
  assert.equal(ledger.length, start.entries);

  const input = {
    lens: "partners" as const,
    at: new Date("2026-09-21T00:00:00Z"),
    a: { name: "Marie Curie", birthDate: "1867-11-07", chart: curieChart, interpretation: curie },
    b: { name: "Oprah Winfrey", birthDate: "1954-01-29", chart: winfreyChart, interpretation: winfrey },
  };
  fake.replies = pairReplies(buildPairBrief(input));
  const pairStart = marks();
  const out = await generatePairInterpretation(input, { reportId: "r-pair" });
  const added = ledger.slice(pairStart.entries);
  assert.ok(added.length > 0 && added.every((e) => e.kind === "pair"));
  assert.equal(added.length, replied.length - pairStart.replies);
  close(spentFrom(added), out.meta.usage.costUsd!, "the ledger and the pair's own usage agree");
});

test("the legacy pair report counts all six replies under synastry, every time it is asked for", async () => {
  const start = marks();
  await generateSynastryInterpretation(curieChart, winfreyChart, "Marie", "Oprah");
  await generateSynastryInterpretation(curieChart, winfreyChart, "Marie", "Oprah");
  const added = ledger.slice(start.entries);
  assert.equal(added.length, 12);
  assert.ok(added.every((e) => e.kind === "synastry"));
  close(spentFrom(added), 12 * unit(MODELS.synastry), "twelve replies");
});

const blindCurie = () => calculateNatalChart("1867-11-07", "12:00", 52.2297, 21.0122, 1.4, 720);
const RISING_CLAIM = { kind: "angle", angle: "ascendant", sign: "capricorn" };
const PASS_REPLIES: Record<string, unknown> = {
  natal_triad_rising: {
    rising: { label: "Capricorn rising", text: "You are read as steady before you have said a word." },
    claims: ["You are read as steady before you have said a word.", "read as steady before", "before you have said a word"].map((quote) => ({ quote, evidence: [RISING_CLAIM] })),
  },
  natal_houses: curieReplies().natal_houses,
  ...Object.fromEntries(SECTION_IDS.map((id) => [`natal_${id}_amend`, {
    amendments: [{ quote: "You keep going after the room has given up.", replacement: "You keep going after the room has emptied.", evidence: [RISING_CLAIM] }],
    additions: [],
  }])),
};

function memoryStore(initial: ReportInterpretation, countsSpend: boolean) {
  let interpretation: ReportInterpretation | null = initial;
  let outcome = "running";
  const store: PassStore = {
    ...(countsSpend ? { countsSpend } : {}),
    async load() { return { interpretation, horizonPasses: 0 }; },
    async saveRevision() {},
    async setRevising() {},
    async writeFrame(_id, next) { interpretation = next; },
    async finish(_id, next) { interpretation = next; outcome = "complete"; },
    async fail(_id, previous, message) { interpretation = previous; outcome = `failed: ${message}`; },
  };
  return { store, outcome: () => outcome };
}

test("the horizon pass on a visitor's report counts under horizon; the report lab's pass against memory adds nothing", async () => {
  assert.equal(dbStore.countsSpend, true, "the route's store is a visitor's");
  fake.replies = cannedNatalReplies({ drawn: false, sunSign: "scorpio" });
  const blind = blindCurie();
  const blindReport = await generateInterpretation(blind, "Marie Curie");
  fake.replies = PASS_REPLIES;
  const input = {
    reportId: "r-pass", profileId: "p-pass", name: "Marie Curie",
    previous: { birthTime: "12:00", birthTimeWindowMinutes: 720, chart: blind },
    chart: curieChart,
  };

  const start = marks();
  const visitor = memoryStore(blindReport, true);
  await runHorizonPass(input, visitor.store);
  assert.equal(visitor.outcome(), "complete");
  const added = ledger.slice(start.entries);
  assert.ok(added.length > 0 && added.every((e) => e.kind === "horizon"));
  assert.equal(added.length, replied.length - start.replies);
  close(spentFrom(added), billedSince(start.replies), "every reply of the pass");

  const labStart = marks();
  const lab = memoryStore(blindReport, false);
  await runHorizonPass({ ...input, reportId: "lab" }, lab.store);
  assert.equal(lab.outcome(), "complete");
  assert.ok(replied.length > labStart.replies, "the model answered the lab's pass");
  assert.equal(ledger.length, labStart.entries);
});

test("a lab-origin call adds nothing: a report with no id, the lab's section hook, and a call with no kind", async () => {
  fake.replies = { ...curieReplies(), qa_natal: { a: "ok" } };
  const start = marks();
  // The release lab and the report lab write reports with no id.
  await generateInterpretation(curieChart, "Marie Curie");
  // Spots and replays go through the lab's hook.
  await writeSection("natal:foundation", curieChart, "Marie Curie", undefined, { model: "gpt-5.2" });
  // The QA reader and the session notes call the shared seam with no kind.
  await callStructured({ usageKey: "qa:natal", model: MODELS.qa, system: "s", user: "u", schema: z.object({ a: z.string() }), maxTokens: 100 });
  assert.ok(replied.length - start.replies >= 13, "the model answered");
  assert.equal(ledger.length, start.entries, "and nothing reached the ledger");
});

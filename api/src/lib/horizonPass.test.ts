/**
 * The pass against memory: the order of what is stored, and the failure path
 * that leaves the previous text and the previous profile in place. The model
 * is a fake; see aiInterpretation.test.ts for the same device.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateNatalChart } from "./chartCalculation.js";
import { chartFromFixture } from "./testFixtures.js";

process.env.OPENAI_API_KEY ??= "test-key-never-sent";
process.env.DATABASE_URL ??= "postgres://test:test@127.0.0.1:1/never";
process.env.PROMPT_DEFAULTS_ONLY = "1";
const { openai } = await import("@workspace/integrations-openai-ai-server");
const { generateInterpretation } = await import("./aiInterpretation.js");
const { runHorizonPass } = await import("./horizonPass.js");
type PassStore = import("./horizonPass.js").PassStore;
type ReportInterpretation = import("./aiInterpretation.js").ReportInterpretation;

const WARSAW = { lat: 52.2297, lon: 21.0122, offset: 1.4 };
const blind = () => calculateNatalChart("1867-11-07", "12:00", WARSAW.lat, WARSAW.lon, WARSAW.offset, 720);
const drawn = () => chartFromFixture("marie-curie");

const PARA = "You investigate first and commit second. You keep going after the room has given up.";
const ACTION = { action: "Write the plan before the call.", why: "so you stop agreeing before you have thought about it" };
const ITEMS = [{ item: "Field research", reason: "you test before you trust" }, { item: "Laboratory work", reason: "you keep going when others stop" }, { item: "Teaching", reason: "you explain by showing" }];
const blindClaims = () => [1, 2, 3].map(() => ({ quote: "You investigate first and commit second.", evidence: [{ kind: "placement", body: "sun", sign: "scorpio", house: null }] }));

const BLIND: Record<string, unknown> = {
  natal_foundation: {
    chartThesis: "Depth over display.", dominantPattern: "Slow, total commitment.", centralTension: "Care against control.",
    supportingEvidence: [1, 2, 3].map(() => ({ placement: "Sun in Scorpio", observation: "fixed water", implication: "commits late and hard" })),
    sectionGuidance: { overview: "a", triad: "b", mind: "c", career: "d", money: "e", relationships: "f", family: "g", superpowers: "h", discoveries: "i", focus: "j" },
  },
  natal_overview: { headline: PARA, concentration: PARA, temperament: PARA, distinctive: PARA, bridge: "Everything here points toward depth.", claims: blindClaims() },
  natal_triad: { sun: { label: "Sun in Scorpio", text: PARA }, moon: { label: "Moon in Pisces", text: PARA }, claims: blindClaims() },
  natal_mind: { howYouThink: PARA, howYouDecide: PARA, howYouAreUnderstood: PARA, practice: PARA, claims: blindClaims() },
  natal_career: { vocationalPull: PARA, howYouShowUp: PARA, growthThroughWork: PARA, actions: [ACTION, ACTION, ACTION], careerPaths: ITEMS, claims: blindClaims() },
  natal_money: { relationshipToResources: PARA, whatWorks: PARA, sharedAndExposed: PARA, actions: [ACTION, ACTION, ACTION], claims: blindClaims() },
  natal_relationships: { howYouLove: PARA, theChallenge: PARA, whatPartnershipAsks: PARA, actions: [ACTION, ACTION, ACTION], connectBestWith: ITEMS, claims: blindClaims() },
  natal_family: { whatYouCarry: PARA, whatRootsYou: PARA, theInheritedEdge: PARA, actions: [ACTION, ACTION], claims: blindClaims() },
  natal_superpowers: {
    superpower: { title: "Total focus", text: PARA, actions: [ACTION, ACTION] },
    chronicPattern: { title: "Late exits", text: PARA, actions: [ACTION, ACTION] },
    growingEdge: { title: "Asking early", text: PARA, actions: [ACTION, ACTION] },
    claims: blindClaims(),
  },
  natal_discoveries: { opening: PARA, paradoxes: [1, 2].map(() => ({ title: "Care and control", tension: PARA, invitation: PARA })), claims: blindClaims() },
  natal_focus: {
    leanInto: { intro: PARA, bullets: [1, 2, 3].map(() => ({ point: "Finish what only you can finish.", why: "so the work carries your mark" })) },
    notice: { intro: PARA, bullets: [1, 2, 3].map(() => ({ point: "Notice the late exit.", why: "so you leave while it still costs little" })) },
    practice: { intro: PARA, bullets: [1, 2, 3].map(() => ({ point: "Ask one question early.", why: "so you stop guessing what people need" })) },
    closing: PARA, claims: blindClaims(),
  },
};

const PASS: Record<string, unknown> = {
  natal_triad_rising: { rising: { label: "Capricorn rising", text: "You are read as steady before you have said a word." }, claims: [
    { quote: "You are read as steady before you have said a word.", evidence: [{ kind: "angle", angle: "ascendant", sign: "capricorn" }] },
    { quote: "read as steady before", evidence: [{ kind: "angle", angle: "ascendant", sign: "capricorn" }] },
    { quote: "before you have said a word", evidence: [{ kind: "angle", angle: "ascendant", sign: "capricorn" }] },
  ] },
  natal_houses: { houses: Array.from({ length: 12 }, (_, i) => ({ house: i + 1, reading: "You set the tone before you speak. Behaviour check: notice who follows your pace this week." })) },
};
const AMEND = {
  amendments: [{ quote: "You keep going after the room has given up.", replacement: "You keep going after the room has emptied.", evidence: [{ kind: "angle", angle: "ascendant", sign: "capricorn" }] }],
  additions: [],
};

let calls: string[] = [];
let failOn: string | null = null;
(openai.chat.completions as unknown as { create: unknown }).create = async (req: { response_format: { json_schema: { name: string } } }) => {
  const name = req.response_format.json_schema.name;
  calls.push(name);
  if (failOn && name === failOn) throw new Error(`simulated outage on ${name}`);
  const reply = BLIND[name] ?? PASS[name] ?? (name.endsWith("_amend") ? AMEND : undefined);
  if (!reply) throw new Error(`no canned reply for ${name}`);
  return { choices: [{ message: { content: JSON.stringify(reply) }, finish_reason: "stop" }], usage: { prompt_tokens: 1000, completion_tokens: 200 } };
};

function memoryStore(initial: ReportInterpretation) {
  const log: string[] = [];
  const state = { interpretation: initial as ReportInterpretation | null, status: "complete", passes: 0, error: null as string | null, revisions: [] as ReportInterpretation[], profileRestored: false };
  const store: PassStore = {
    async load() { return { interpretation: state.interpretation, horizonPasses: state.passes }; },
    async saveRevision(_id, interpretation) { log.push("revision"); state.revisions.push(interpretation); },
    async setRevising() { log.push("revising"); state.status = "revising"; },
    async writeFrame(_id, interpretation) {
      const keys = Object.keys(interpretation).filter((k) => !(k in (state.interpretation ?? {})) || (state.interpretation as unknown as Record<string, unknown>)[k] !== (interpretation as unknown as Record<string, unknown>)[k]);
      log.push(`frame:${keys.join(",")}`);
      state.interpretation = interpretation;
    },
    async finish(_id, interpretation, passes) { log.push("complete"); state.interpretation = interpretation; state.status = "complete"; state.passes = passes; state.error = null; },
    async fail(_id, previous, message) { log.push("failed"); state.interpretation = previous; state.status = "complete"; state.error = message; state.profileRestored = true; },
  };
  return { store, state, log };
}

const input = (chart = drawn()) => ({
  reportId: "r1", profileId: "p1", name: "Marie Curie",
  previous: { birthTime: "12:00", birthTimeWindowMinutes: 720, chart: blind() },
  chart,
});

test("the pass: revision first, then revising, the horizon blocks, the amendments, then complete with the ledger", async () => {
  calls = [];
  const blindReport = await generateInterpretation(blind(), "Marie Curie");
  assert.equal(blindReport.meta.horizon, "unknown");
  const { store, state, log } = memoryStore(blindReport);
  calls = [];
  await runHorizonPass(input(), store);

  assert.equal(log[0], "revision");
  assert.equal(log[1], "revising");
  assert.ok(log.indexOf("frame:houses") < log.findIndex((l) => l.startsWith("frame:") && l !== "frame:houses" && l !== "frame:triad" && l !== "frame:angleMeanings,personalPlanets,aspectMeanings"), "the horizon blocks land before any amendment");
  assert.equal(log[log.length - 1], "complete");
  assert.equal(state.revisions.length, 1);
  assert.equal(state.revisions[0].meta.horizon, "unknown");
  assert.ok(!("houses" in state.revisions[0]), "the revision is the blind text as it was");

  const out = state.interpretation!;
  assert.equal(state.status, "complete");
  assert.equal(state.passes, 1);
  assert.equal(out.meta.horizon, "known");
  assert.equal(out.meta.sect, "day");
  assert.equal(out.triad.rising?.label, "Capricorn rising");
  assert.equal(out.houses?.houses.length, 12);
  assert.ok(out.angleMeanings);
  assert.equal(out.meta.horizonPass?.passes, 1);
  assert.equal(out.meta.horizonPass?.sentencesRevised, 10, "one sentence a section");
  assert.equal(out.meta.horizonPass?.paragraphsAdded, 0);
  assert.equal(Object.keys(out.meta.horizonPass!.sections).length, 10);
  assert.equal(out.overview.headline, "You investigate first and commit second. You keep going after the room has emptied.");
  assert.equal(out.overview.bridge, blindReport.overview.bridge);
  assert.ok(out.meta.usage.sections.length > blindReport.meta.usage.sections.length, "the pass's calls are accounted on top of the report's");
  assert.equal(calls.filter((c) => c.endsWith("_amend")).length, 10);
  assert.ok(!calls.includes("natal_overview"), "the pass never regenerates a section wholesale");
});

// R05's pass on staging kept 53 claims of the blind report's 60 even with the
// rising and the houses added (MB-61): every blind placement claim failed
// re-validation because it carried no house. Replayed from the stored run.
test("the pass keeps its claims: replaying the r05 pass, claims after are at least claims before, and the ledger counts every sentence", async () => {
  const { readFileSync } = await import("node:fs");
  const { applyAmendment, sentencesOf } = await import("./aiInterpretation.js");
  const stored = JSON.parse(readFileSync(new URL("../../../fixtures/passes/marie-curie.r05.json", import.meta.url), "utf8")) as {
    blindClaims: number; passedClaimsInR05: number;
    sections: Record<string, Record<string, unknown> & { claims: Array<{ quote: string }> }>;
    replies: Record<string, { amendments: Array<{ quote: string; replacement: string; evidence: unknown[] }>; additions: Array<{ after: string; text: string; claims: unknown[] }> }>;
  };
  const chart = drawn();
  let before = 0;
  let after = 0;
  let sentences = 0;
  let sentencesOnPage = 0;
  for (const [id, section] of Object.entries(stored.sections)) {
    const reply = stored.replies[id];
    if (!reply) continue;
    const out = applyAmendment(id, section, reply as never, chart);
    before += section.claims.length;
    after += (out.section.claims as unknown[]).length;
    sentences += out.sentencesChanged;
    // What a reader would count: the sentences in the replacements and in the added paragraphs.
    sentencesOnPage += reply.amendments.reduce((n, a) => n + sentencesOf(a.replacement).length, 0) + reply.additions.reduce((n, a) => n + sentencesOf(a.text).length, 0);
    // The one legitimate loss: a Moon aspect that held only across part of the band and not at the hour.
    for (const d of out.droppedClaims) assert.match(d, /no (moon \w+ \w+|\w+ \w+ moon) in the chart/, `${id}: ${d}`);
    // A blind placement claim now carries its house.
    for (const c of out.section.claims as Array<{ evidence: Array<{ ref: { kind: string; house?: number | null } }> }>) {
      for (const e of c.evidence) if (e.ref.kind === "placement") assert.notEqual(e.ref.house, null);
    }
  }
  assert.equal(before, stored.blindClaims);
  assert.ok(after >= before, `claims after ${after} < before ${before}`);
  assert.ok(after > stored.passedClaimsInR05, `R05 kept ${stored.passedClaimsInR05}; now ${after}`);
  assert.equal(sentences, sentencesOnPage);
  assert.ok(sentences > 16, `the ledger counts every changed sentence, not the sixteen amendments: ${sentences}`);
});

test("the failure path: the previous text stays, the profile is restored, the error is recorded", async () => {
  calls = [];
  const blindReport = await generateInterpretation(blind(), "Marie Curie");
  const { store, state, log } = memoryStore(blindReport);
  failOn = "natal_career_amend";
  try {
    await runHorizonPass(input(), store);
  } finally {
    failOn = null;
  }
  assert.equal(log[log.length - 1], "failed");
  assert.equal(state.status, "complete");
  assert.equal(state.passes, 0);
  assert.match(state.error!, /simulated outage on natal_career_amend/);
  assert.equal(state.profileRestored, true);
  assert.deepEqual(state.interpretation, blindReport);
  assert.equal(state.revisions.length, 1);
});

test("the pass refuses a chart whose horizon does not hold", async () => {
  const { store } = memoryStore(await generateInterpretation(blind(), "Marie Curie"));
  await assert.rejects(runHorizonPass(input(blind()), store), /horizon holds/);
});

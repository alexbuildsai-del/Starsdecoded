/**
 * The generator without the model: a fake chat completion answers every call
 * from canned, schema-valid replies, so the blind pipeline and the horizon
 * pass can be proven end to end without an API key or a cent of inference.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateNatalChart } from "./chartCalculation.js";
import { chartFromFixture } from "./testFixtures.js";

process.env.OPENAI_API_KEY ??= "test-key-never-sent";
// The pool connects lazily and defaults-only prompts never query it.
process.env.DATABASE_URL ??= "postgres://test:test@127.0.0.1:1/never";
process.env.PROMPT_DEFAULTS_ONLY = "1";
const { openai } = await import("@workspace/integrations-openai-ai-server");
const { applyAmendment, amendSections, generateInterpretation, previewSectionPrompt, PROMPT_VERSION } = await import("./aiInterpretation.js");
const { buildBrief, SECTION_IDS, ALL_SECTIONS } = await import("../prompts/index.js");

const WARSAW = { lat: 52.2297, lon: 21.0122, offset: 1.4 };
const blindCurie = () => calculateNatalChart("1867-11-07", "12:00", WARSAW.lat, WARSAW.lon, WARSAW.offset, 720);

const ACTION = { action: "Write the plan before the call.", why: "so you stop agreeing before you have thought about it" };
const ITEMS = [{ item: "Field research", reason: "you test before you trust" }, { item: "Laboratory work", reason: "you keep going when others stop" }, { item: "Teaching", reason: "you explain by showing" }];
const PARA = "You investigate first and commit second. You keep going after the room has given up.";

/** Three placement claims with no house, quoting a sentence every canned section contains. */
function claims(quote = "You investigate first and commit second.") {
  return [1, 2, 3].map(() => ({ quote, evidence: [{ kind: "placement", body: "sun", sign: "scorpio", house: null }] }));
}

/** Canned replies keyed by the JSON schema name the call registers. */
const REPLIES: Record<string, unknown> = {
  natal_foundation: {
    chartThesis: "Depth over display.", dominantPattern: "Slow, total commitment.", centralTension: "Care against control.",
    supportingEvidence: [1, 2, 3].map(() => ({ placement: "Sun in Scorpio", observation: "fixed water", implication: "commits late and hard" })),
    sectionGuidance: { overview: "a", triad: "b", mind: "c", career: "d", money: "e", relationships: "f", family: "g", superpowers: "h", discoveries: "i", focus: "j" },
  },
  natal_overview: { headline: PARA, concentration: PARA, temperament: PARA, distinctive: PARA, bridge: "Everything here points toward depth.", claims: claims() },
  natal_triad: { sun: { label: "Sun in Scorpio", text: PARA }, moon: { label: "Moon in Pisces", text: PARA }, claims: claims() },
  natal_mind: { howYouThink: PARA, howYouDecide: PARA, howYouAreUnderstood: PARA, practice: PARA, claims: claims() },
  natal_career: { vocationalPull: PARA, howYouShowUp: PARA, growthThroughWork: PARA, actions: [ACTION, ACTION, ACTION], careerPaths: ITEMS, claims: claims() },
  natal_money: { relationshipToResources: PARA, whatWorks: PARA, sharedAndExposed: PARA, actions: [ACTION, ACTION, ACTION], claims: claims() },
  natal_relationships: { howYouLove: PARA, theChallenge: PARA, whatPartnershipAsks: PARA, actions: [ACTION, ACTION, ACTION], connectBestWith: ITEMS, claims: claims() },
  natal_family: { whatYouCarry: PARA, whatRootsYou: PARA, theInheritedEdge: PARA, actions: [ACTION, ACTION], claims: claims() },
  natal_superpowers: {
    superpower: { title: "Total focus", text: PARA, actions: [ACTION, ACTION] },
    chronicPattern: { title: "Late exits", text: PARA, actions: [ACTION, ACTION] },
    growingEdge: { title: "Asking early", text: PARA, actions: [ACTION, ACTION] },
    claims: claims(),
  },
  natal_discoveries: { opening: PARA, paradoxes: [1, 2].map(() => ({ title: "Care and control", tension: PARA, invitation: PARA })), claims: claims() },
  natal_focus: {
    leanInto: { intro: PARA, bullets: [1, 2, 3].map(() => ({ point: "Finish what only you can finish.", why: "so the work carries your mark" })) },
    notice: { intro: PARA, bullets: [1, 2, 3].map(() => ({ point: "Notice the late exit.", why: "so you leave while it still costs little" })) },
    practice: { intro: PARA, bullets: [1, 2, 3].map(() => ({ point: "Ask one question early.", why: "so you stop guessing what people need" })) },
    closing: PARA, claims: claims(),
  },
};

const calls: string[] = [];
(openai.chat.completions as unknown as { create: unknown }).create = async (req: { response_format: { json_schema: { name: string } } }) => {
  const name = req.response_format.json_schema.name;
  calls.push(name);
  const reply = REPLIES[name];
  if (!reply) throw new Error(`no canned reply for ${name}`);
  return {
    choices: [{ message: { content: JSON.stringify(reply) }, finish_reason: "stop" }],
    usage: { prompt_tokens: 1000, completion_tokens: 300, prompt_tokens_details: { cached_tokens: 800 } },
  };
};

test("a blind run writes no houses key and no triad.rising, and says so in meta", async () => {
  calls.length = 0;
  const chart = blindCurie();
  const frames: string[] = [];
  const out = await generateInterpretation(chart, "Marie Curie", { onSection: (f) => { frames.push(f.section); } });
  assert.equal(out.meta.promptVersion, PROMPT_VERSION);
  assert.equal(out.meta.horizon, "unknown");
  assert.equal(out.meta.sect, undefined);
  assert.ok(!("houses" in out), "a blind report has no houses key");
  assert.ok(!("rising" in out.triad), "a blind triad has no rising part");
  assert.ok(!("angleMeanings" in out), "a blind report composes no angle text");
  assert.ok(!("path" in out));
  assert.ok(!calls.includes("natal_houses"), "the house readings are never called blind");
  assert.deepEqual(frames.filter((f) => f !== "meta").sort(), SECTION_IDS.filter((id) => id !== "houses").sort());
  assert.equal(out.triad.claims[0].evidence[0].label, "Sun 14.6° Scorpio".replace("14.6", chart.planets.sun.degree.toFixed(1)));
  assert.ok(out.meta.wordCount > 100);
});

test("a drawn run calls every section and keeps the rising part", async () => {
  calls.length = 0;
  const drawnTriad = { ...(REPLIES.natal_triad as object), rising: { label: "Capricorn rising", text: PARA }, claims: [
    { quote: "You investigate first and commit second.", evidence: [{ kind: "placement", body: "sun", sign: "scorpio", house: 11 }] },
    { quote: "You investigate first and commit second.", evidence: [{ kind: "angle", angle: "ascendant", sign: "capricorn" }] },
    { quote: "You investigate first and commit second.", evidence: [{ kind: "sect", role: "sect_light", body: "sun" }] },
  ] };
  const houses = { houses: Array.from({ length: 12 }, (_, i) => ({ house: i + 1, reading: "You set the tone before you speak. Behaviour check: notice who follows your pace this week." })) };
  const drawnClaims = () => [1, 2, 3].map(() => ({ quote: "You investigate first and commit second.", evidence: [{ kind: "placement", body: "sun", sign: "scorpio", house: 11 }] }));
  const saved = { ...REPLIES };
  for (const k of Object.keys(REPLIES)) {
    const r = REPLIES[k] as Record<string, unknown>;
    if ("claims" in r) REPLIES[k] = { ...r, claims: drawnClaims() };
  }
  REPLIES.natal_triad = drawnTriad;
  REPLIES.natal_houses = houses;
  REPLIES.natal_foundation = { ...(saved.natal_foundation as object), sect: "day", sectLight: "sun" };
  try {
    const out = await generateInterpretation(chartFromFixture("marie-curie"), "Marie Curie");
    assert.equal(out.meta.horizon, "known");
    assert.equal(out.meta.sect, "day");
    assert.ok(out.houses && out.houses.houses.length === 12);
    assert.equal(out.triad.rising?.label, "Capricorn rising");
    assert.ok(out.angleMeanings);
    assert.ok(calls.includes("natal_houses"));
  } finally {
    Object.assign(REPLIES, saved);
  }
});

test("previewSectionPrompt still works for every live key, and appends the blind rules only when blind", async () => {
  for (const spec of ALL_SECTIONS) {
    const p = await previewSectionPrompt(spec.key, chartFromFixture("marie-curie"), "Marie Curie");
    assert.ok(p.user.includes("CHART BRIEF"), spec.key);
    assert.ok(!p.user.includes("HORIZON UNKNOWN"), spec.key);
  }
  const blind = await previewSectionPrompt("natal:triad", blindCurie(), "Marie Curie");
  assert.match(blind.user, /HORIZON UNKNOWN/);
  assert.match(blind.user, /HORIZON: unknown/);
  assert.ok(!("rising" in ((blind.schema as { properties: Record<string, unknown> }).properties)));
});

// ---------------------------------------------------------------------------
// The amendment pass, pure: exact quote match after softening, or nothing.
// ---------------------------------------------------------------------------
const drawn = () => chartFromFixture("marie-curie");
const stored = () => ({
  howYouThink: "You test an idea before you say it out loud. You keep a private ledger of what held.",
  howYouDecide: "You decide late and then all at once.",
  howYouAreUnderstood: "People read you as reserved until you commit.",
  practice: "Say the half-formed thought once a week.",
  claims: [{ quote: "You decide late and then all at once.", evidence: [{ ref: { kind: "placement", body: "sun", sign: "scorpio", house: null as number | null }, label: "Sun 14.6° Scorpio" }] }],
});

test("applyAmendment: a quote that does not match is dropped, never applied loosely", () => {
  const before = stored();
  const out = applyAmendment("mind", before, {
    amendments: [{ quote: "You decide early and all at once.", replacement: "You decide late, and in public.", evidence: [{ kind: "angle", angle: "ascendant", sign: "capricorn" }] }],
    additions: [],
  }, drawn());
  assert.deepEqual(out.dropped, ["You decide early and all at once."]);
  assert.equal(out.amended.length, 0);
  assert.equal(out.section.howYouDecide, before.howYouDecide);
  assert.equal(out.section.howYouThink, before.howYouThink);
});

test("applyAmendment: a quote with curly quotes and a dash still matches exactly, and the claim follows the replacement", () => {
  const before = stored();
  before.howYouDecide = "You decide late – and then all at once, “no regrets”.";
  before.claims[0].quote = "You decide late - and then all at once, \"no regrets\".";
  const out = applyAmendment("mind", before, {
    amendments: [{ quote: "You decide late - and then all at once, \"no regrets\".", replacement: "You decide late and then in front of everyone.", evidence: [{ kind: "angle", angle: "ascendant", sign: "capricorn" }] }],
    additions: [],
  }, drawn());
  assert.equal(out.dropped.length, 0);
  assert.equal(out.section.howYouDecide, "You decide late and then in front of everyone.");
  assert.equal(out.amended[0].before, "You decide late – and then all at once, “no regrets”.");
  assert.equal(out.amended[0].evidence[0].label, "Ascendant · 12.1° Capricorn");
  const kept = out.section.claims as Array<{ quote: string; evidence: Array<{ ref: { kind: string } }> }>;
  assert.ok(kept.every((c) => c.quote === "You decide late and then in front of everyone."), JSON.stringify(kept));
  assert.ok(kept.some((c) => c.evidence[0].ref.kind === "angle"));
});

test("applyAmendment: an addition lands after the sentence it names, or at the end, and its claims are stored", () => {
  const after = applyAmendment("mind", stored(), {
    amendments: [],
    additions: [{ after: "You test an idea before you say it out loud.", text: "You are read as steady before you have said a word.", claims: [{ quote: "You are read as steady before you have said a word.", evidence: [{ kind: "angle", angle: "ascendant", sign: "capricorn" }] }] }],
  }, drawn());
  assert.equal(after.section.howYouThink, "You test an idea before you say it out loud.\n\nYou are read as steady before you have said a word.\n\nYou keep a private ledger of what held.");
  assert.equal(after.added.length, 1);
  assert.equal(after.added[0].claims[0].evidence[0].label, "Ascendant · 12.1° Capricorn");

  const atEnd = applyAmendment("mind", stored(), {
    amendments: [],
    additions: [{ after: "end", text: "The room decides you are safe before you speak.", claims: [{ quote: "The room decides you are safe before you speak.", evidence: [{ kind: "angle", angle: "midheaven", sign: "scorpio" }] }] }],
  }, drawn());
  assert.equal(atEnd.section.practice, "Say the half-formed thought once a week.\n\nThe room decides you are safe before you speak.");
  assert.equal(atEnd.section.howYouThink, stored().howYouThink);
});

test("applyAmendment: caps hold at three amendments and one addition, and a claim that no longer verifies is dropped", () => {
  const before = stored();
  before.claims.push({ quote: "Say the half-formed thought once a week.", evidence: [{ ref: { kind: "placement", body: "sun", sign: "scorpio", house: 9 }, label: "wrong" }] });
  const out = applyAmendment("mind", before, {
    amendments: [
      { quote: "You decide late and then all at once.", replacement: "You decide late and out loud.", evidence: [{ kind: "angle", angle: "ascendant", sign: "capricorn" }] },
      { quote: "People read you as reserved until you commit.", replacement: "People read you as steady until you commit.", evidence: [{ kind: "angle", angle: "ascendant", sign: "capricorn" }] },
      { quote: "You keep a private ledger of what held.", replacement: "You keep a private ledger of what held up.", evidence: [{ kind: "angle", angle: "ascendant", sign: "capricorn" }] },
      { quote: "Say the half-formed thought once a week.", replacement: "Say it twice a week.", evidence: [{ kind: "angle", angle: "ascendant", sign: "capricorn" }] },
    ],
    additions: [
      { after: "end", text: "One.", claims: [{ quote: "One.", evidence: [{ kind: "angle", angle: "ascendant", sign: "capricorn" }] }] },
      { after: "end", text: "Two.", claims: [{ quote: "Two.", evidence: [{ kind: "angle", angle: "ascendant", sign: "capricorn" }] }] },
    ],
  }, drawn());
  assert.equal(out.amended.length, 3);
  assert.equal(out.added.length, 1);
  assert.equal(out.section.practice, "Say the half-formed thought once a week.\n\nOne.");
  const quotes = (out.section.claims as Array<{ quote: string }>).map((c) => c.quote);
  assert.ok(!quotes.includes("Say the half-formed thought once a week."), "a claim on a wrong house is dropped, not kept");
  assert.ok(quotes.includes("You decide late and out loud."));
});

test("amendSections: one call per stored section, every unamended sentence kept verbatim", async () => {
  const chart = drawn();
  const blindReport = await generateInterpretation(blindCurie(), "Marie Curie");
  calls.length = 0;
  // The fake answers every amendment call with one replacement of the shared sentence and nothing else.
  const amendReply = {
    amendments: [{ quote: "You keep going after the room has given up.", replacement: "You keep going after the room has emptied.", evidence: [{ kind: "angle", angle: "ascendant", sign: "capricorn" }] }],
    additions: [],
  };
  const previous = (openai.chat.completions as unknown as { create: (r: never) => Promise<unknown> }).create;
  (openai.chat.completions as unknown as { create: unknown }).create = async (req: { response_format: { json_schema: { name: string } } }) => {
    calls.push(req.response_format.json_schema.name);
    return { choices: [{ message: { content: JSON.stringify(amendReply) }, finish_reason: "stop" }], usage: { prompt_tokens: 1000, completion_tokens: 100 } };
  };
  try {
    const frames: string[] = [];
    const result = await amendSections(chart, blindReport, buildBrief(chart, "Marie Curie"), { onSection: (f) => { frames.push(f.section); } });
    const amendable = SECTION_IDS.filter((id) => id !== "houses");
    assert.equal(calls.length, amendable.length);
    assert.ok(calls.every((c) => c.endsWith("_amend")));
    assert.deepEqual(frames.sort(), [...amendable].sort());
    for (const id of amendable) {
      assert.equal(result.counts[id].amended, 1, id);
      assert.equal(result.record[id].amended[0].now, "You keep going after the room has emptied.");
    }
    // Everything that was not the amended sentence is byte for byte what the blind report said.
    const strip = (s: string) => s.replace("You keep going after the room has emptied.", "").replace("You keep going after the room has given up.", "");
    const out = result.interpretation as unknown as Record<string, Record<string, unknown>>;
    const before = blindReport as unknown as Record<string, Record<string, unknown>>;
    assert.equal(strip(JSON.stringify(out.career, Object.keys(out.career).filter((k) => k !== "claims").sort())), strip(JSON.stringify(before.career, Object.keys(before.career).filter((k) => k !== "claims").sort())));
    assert.equal(out.overview.headline, "You investigate first and commit second. You keep going after the room has emptied.");
    assert.equal(out.overview.bridge, "Everything here points toward depth.");
    assert.equal(result.usage.length, amendable.length);
  } finally {
    (openai.chat.completions as unknown as { create: unknown }).create = previous;
  }
});

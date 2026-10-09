/**
 * The generator without the model: a fake chat completion answers every call
 * from canned, schema-valid replies, so the blind pipeline and the horizon
 * pass can be proven end to end without an API key or a cent of inference.
 */
import { readFileSync } from "node:fs";
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
const { ReportFailure } = await import("./failureReasons.js");
const { setFailureSink } = await import("./failureLog.js");
const failureRows: Array<{ section: string; ruleId: string; class: string; writeId: string }> = [];
setFailureSink(async (rows) => { for (const r of rows) failureRows.push({ section: r.section, ruleId: r.ruleId, class: r.class, writeId: r.writeId }); });
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
const prompts: Array<{ name: string; user: string }> = [];
let failWith: ((name: string) => Error | null) | null = null;
const delays: Record<string, number> = {};
(openai.chat.completions as unknown as { create: unknown }).create = async (req: { response_format: { json_schema: { name: string } }; messages: Array<{ content: string }> }, options?: { signal?: AbortSignal }) => {
  const name = req.response_format.json_schema.name;
  calls.push(name);
  prompts.push({ name, user: req.messages[1].content });
  const abortError = () => Object.assign(new Error("Request was aborted."), { name: "APIUserAbortError" });
  if (options?.signal?.aborted) throw abortError();
  if (delays[name]) {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(resolve, delays[name]);
      options?.signal?.addEventListener("abort", () => { clearTimeout(timer); reject(abortError()); }, { once: true });
    });
  }
  const failure = failWith?.(name);
  if (failure) throw failure;
  const entry = REPLIES[name];
  const reply = typeof entry === "function" ? (entry as () => unknown)() : entry;
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

// The first release lab (2026-10-02): one natal section on mix B kept a semicolon, which the pair already repaired in code.
test("a semicolon in natal prose becomes a full stop before storage, and a claim quoting across it follows", async () => {
  const saved = REPLIES.natal_relationships;
  const joined = "You investigate first; commit second.";
  REPLIES.natal_relationships = { ...(saved as object), howYouLove: joined, claims: claims(joined) };
  try {
    const out = await generateInterpretation(blindCurie(), "Marie Curie");
    assert.equal(out.relationships.howYouLove, "You investigate first. Commit second.");
    assert.equal(out.relationships.claims[0].quote, "You investigate first. Commit second.");
    assert.ok(!JSON.stringify(out).includes(";"), "no semicolon reaches the stored report");
  } finally {
    REPLIES.natal_relationships = saved;
  }
});

// R05's triad failure (MB-62): the prose was fine and one claim quote was a
// paraphrase, so the section retried the prose three times and the report
// failed. Now the claims are rewritten against the prose first.
test("a claim quote that is not in the prose triggers a claims-only repair, and the prose is kept", async () => {
  calls.length = 0;
  const saved = REPLIES.natal_triad;
  const paraphrased = { ...(saved as object), claims: claims("You investigate first, then you commit.") };
  REPLIES.natal_triad = paraphrased;
  REPLIES.natal_triad_claims = { claims: claims() };
  try {
    const out = await generateInterpretation(blindCurie(), "Marie Curie");
    assert.equal(calls.filter((c) => c === "natal_triad").length, 1, "the prose is written once");
    assert.equal(calls.filter((c) => c === "natal_triad_claims").length, 1, "one claims-only call");
    assert.equal(out.triad.sun.text, PARA, "the prose stands as written");
    assert.equal(out.triad.claims[0].quote, "You investigate first and commit second.");
    assert.equal(out.meta.usage.sections.find((s) => s.section === "natal:triad")?.attempts, 2, "the repair is accounted as an attempt");
  } finally {
    REPLIES.natal_triad = saved;
    delete REPLIES.natal_triad_claims;
  }
});

test("a report fails only after the claims-only repair fails too, and the repair runs once, then the round alone", async () => {
  calls.length = 0;
  const saved = REPLIES.natal_triad;
  REPLIES.natal_triad = { ...(saved as object), claims: claims("You investigate first, then you commit.") };
  REPLIES.natal_triad_claims = { claims: claims("Still not in the prose at all.") };
  try {
    await assert.rejects(generateInterpretation(blindCurie(), "Marie Curie"), (err: Error) =>
      /natal:triad: failed validation after 3 attempts/.test(err.message) && /valid claims after reconciliation|claims-only repair rejected too/.test(err.message));
    assert.equal(calls.filter((c) => c === "natal_triad").length, 6, "three prose attempts, then a round alone of three");
    assert.equal(calls.filter((c) => c === "natal_triad_claims").length, 2, "the claims repair runs once a call");
  } finally {
    REPLIES.natal_triad = saved;
    delete REPLIES.natal_triad_claims;
  }
});

test("a drawn run calls every section, keeps the rising part, and stores each house card with its blocks and Often noticed", async () => {
  calls.length = 0;
  const drawnTriad = { ...(REPLIES.natal_triad as object), rising: { label: "Capricorn rising", text: PARA }, claims: [
    { quote: "You investigate first and commit second.", evidence: [{ kind: "placement", body: "sun", sign: "scorpio", house: 11 }] },
    { quote: "You investigate first and commit second.", evidence: [{ kind: "angle", angle: "ascendant", sign: "capricorn" }] },
    { quote: "You investigate first and commit second.", evidence: [{ kind: "sect", role: "sect_light", body: "sun" }] },
  ] };
  const houses = { houses: Array.from({ length: 12 }, (_, i) => ({ house: i + 1, reading: "You set the tone before you speak. Behaviour check: notice who follows your pace this week.", retrograde: [], stellium: null })) };
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
    // Often noticed is filled in code after the reply, so only the stored report shows the pipeline kept it (ADR-403).
    assert.ok(out.houses.houses.every((h) => Array.isArray(h.retrograde) && "stellium" in h && "noticed" in h));
    assert.ok(out.houses.houses.some((h) => h.noticed !== null && h.noticed.idea.length > 0));
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
    // Every string leaf but the one amended is byte for byte what the blind report said.
    const leaves = (v: unknown, path = "", out: Array<[string, string]> = []): Array<[string, string]> => {
      if (typeof v === "string") out.push([path, v]);
      else if (Array.isArray(v)) v.forEach((x, i) => leaves(x, `${path}.${i}`, out));
      else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) if (k !== "claims") leaves(x, `${path}.${k}`, out);
      return out;
    };
    const out = result.interpretation as unknown as Record<string, unknown>;
    const before = blindReport as unknown as Record<string, unknown>;
    for (const id of amendable) {
      const was = new Map(leaves(before[id]));
      let changed = 0;
      for (const [path, text] of leaves(out[id])) {
        if (text === was.get(path)) continue;
        changed++;
        assert.equal(text, was.get(path)!.replace("You keep going after the room has given up.", "You keep going after the room has emptied."), `${id}${path}`);
      }
      assert.equal(changed, 1, `${id}: exactly one sentence changed`);
    }
    assert.equal((out.overview as { bridge: string }).bridge, "Everything here points toward depth.");
    assert.equal(result.usage.length, amendable.length);
  } finally {
    (openai.chat.completions as unknown as { create: unknown }).create = previous;
  }
});

test("chk-13, chk-16: an array over its maximum is cut before the parse and logged; one under its minimum parses and is logged", async () => {
  calls.length = 0;
  failureRows.length = 0;
  const foundation = REPLIES.natal_foundation as { supportingEvidence: unknown[] };
  const career = REPLIES.natal_career as { actions: unknown[] };
  REPLIES.natal_foundation = { ...foundation, supportingEvidence: Array.from({ length: 8 }, () => foundation.supportingEvidence[0]) };
  REPLIES.natal_career = { ...career, actions: [ACTION, ACTION, ACTION, ACTION, ACTION] };
  REPLIES.natal_family = { ...(REPLIES.natal_family as object), actions: [ACTION] };
  try {
    const out = await generateInterpretation(blindCurie(), "Marie Curie");
    assert.equal(out.foundation.supportingEvidence.length, 6);
    assert.equal(out.career.actions.length, 3);
    assert.equal(out.family.actions.length, 1, "under the minimum is kept and logged");
    assert.equal(calls.filter((c) => c === "natal_career").length, 1, "no retry for a count");
    assert.ok(failureRows.some((r) => r.section === "natal:foundation" && r.ruleId === "chk-13" && r.class === "fix"));
    assert.ok(failureRows.some((r) => r.section === "natal:career" && r.ruleId === "chk-16" && r.class === "fix"));
    assert.ok(failureRows.some((r) => r.section === "natal:family" && r.ruleId === "chk-16" && r.class === "warn"));
  } finally {
    REPLIES.natal_foundation = foundation;
    REPLIES.natal_career = career;
    REPLIES.natal_family = { ...(REPLIES.natal_family as object), actions: [ACTION, ACTION] };
  }
});

const BAD_MIND = { ...(REPLIES.natal_mind as object), claims: claims("Not in the prose, and not close to anything in it either.") };

test("a section that fails three times then passes: the report completes, the others are called once, and the rows say so", async () => {
  calls.length = 0;
  failureRows.length = 0;
  const saved = REPLIES.natal_mind;
  let n = 0;
  // A claims repair that fails too, so every attempt ends in a block (chk-09 in its fallback).
  REPLIES.natal_mind_claims = { claims: claims("Still nowhere near the prose.") };
  REPLIES.natal_mind = () => (n++ < 3 ? BAD_MIND : saved);
  try {
    const frames: string[] = [];
    const out = await generateInterpretation(blindCurie(), "Marie Curie", { onSection: (f) => { frames.push(f.section); } });
    assert.equal(calls.filter((c) => c === "natal_mind").length, 4, "three attempts, then the round alone");
    assert.equal(calls.filter((c) => c === "natal_career").length, 1);
    assert.equal(frames.filter((f) => f === "mind").length, 1);
    assert.equal(out.mind.claims.length, 3);
    const rows = failureRows.filter((r) => r.section === "natal:mind");
    assert.equal(rows.filter((r) => r.ruleId === "chk-09" && r.class === "block").length, 3);
    assert.equal(rows.filter((r) => r.ruleId === "pass").length, 1);
    assert.equal(new Set(rows.map((r) => r.writeId)).size, 2);
  } finally {
    REPLIES.natal_mind = saved;
    delete REPLIES.natal_mind_claims;
  }
});

test("the retry prompt holds every earlier error and the previous reply; the round alone starts from all of them", async () => {
  calls.length = 0;
  prompts.length = 0;
  const saved = REPLIES.natal_mind;
  let n = 0;
  REPLIES.natal_mind_claims = { claims: claims("Still nowhere near the prose.") };
  REPLIES.natal_mind = () => (n++ < 3 ? { ...BAD_MIND, practice: `${PARA} Attempt ${n}.` } : saved);
  try {
    await generateInterpretation(blindCurie(), "Marie Curie");
    const seen = prompts.filter((p) => p.name === "natal_mind").map((p) => p.user);
    assert.equal(seen.length, 4);
    assert.ok(!/EVERY ERROR SO FAR/.test(seen[0]));
    assert.match(seen[1], /EVERY ERROR SO FAR:\n1\. /);
    assert.match(seen[2], /1\. [\s\S]*2\. /);
    assert.match(seen[3], /1\. [\s\S]*2\. [\s\S]*3\. /);
    assert.match(seen[3], /YOUR LAST REPLY:\n\{[\s\S]*Attempt 3/);
    assert.match(seen[3], /Fix these and keep the rest\./);
  } finally {
    REPLIES.natal_mind = saved;
    delete REPLIES.natal_mind_claims;
  }
});

test("always failing: code quality, the slow section aborted, never stored", async () => {
  calls.length = 0;
  const saved = REPLIES.natal_mind;
  REPLIES.natal_mind_claims = { claims: claims("Still nowhere near the prose.") };
  REPLIES.natal_mind = BAD_MIND;
  delays.natal_focus = 400;
  const frames: string[] = [];
  try {
    await assert.rejects(
      generateInterpretation(blindCurie(), "Marie Curie", { onSection: (f) => { frames.push(f.section); } }),
      (err: unknown) => err instanceof ReportFailure && err.code === "quality" && /natal:mind/.test(err.message),
    );
    assert.equal(calls.filter((c) => c === "natal_mind").length, 6);
    assert.ok(!frames.includes("focus"), "the slow section was aborted");
  } finally {
    REPLIES.natal_mind = saved;
    delete REPLIES.natal_mind_claims;
    delete delays.natal_focus;
  }
});

test("a network error fails the report as provider_unreachable; a quota 429 as provider_out_of_credit", async () => {
  failWith = (name) => (name === "natal_money" ? Object.assign(new Error("Connection error."), { name: "APIConnectionError" }) : null);
  try {
    await assert.rejects(generateInterpretation(blindCurie(), "Marie Curie"), (err: unknown) => err instanceof ReportFailure && err.code === "provider_unreachable");
    failWith = (name) => (name === "natal_money" ? Object.assign(new Error("429 insufficient_quota"), { status: 429, code: "insufficient_quota" }) : null);
    await assert.rejects(generateInterpretation(blindCurie(), "Marie Curie"), (err: unknown) => err instanceof ReportFailure && err.code === "provider_out_of_credit");
  } finally {
    failWith = null;
  }
});

// A name a reader typed, written back by the writer, reaches the next prompt only inside a data block (ADR-240, MB-152, sentinel S8).
const { dataBlock, dataValue, outsideDataBlocks } = await import("../prompts/data.js");
const { generateHorizonBlocks } = await import("./aiInterpretation.js");

/** The three injection fixtures' names, read from disk so the test plants what the lab plants (security scope 8). */
const INJECTED = ["inject-delimiter", "inject-instruction", "inject-markup"].map((fixture) =>
  (JSON.parse(readFileSync(new URL(`../../../fixtures/charts/${fixture}.json`, import.meta.url), "utf8")) as { name: string }).name);

/** What a name left outside its blocks shows in a prompt: the payload each fixture carries, or the name as its block shows it. */
function leftOut(prompt: string, name: string): string | null {
  const outside = outsideDataBlocks(prompt);
  return outside.match(/pirate|ignore every rule/i)?.[0] ?? (outside.includes(dataValue(name)) ? dataValue(name) : null);
}

const blocksOf = (text: string, value: string) => text.split(dataBlock("name", value)).length - 1;

/** Stands in for the model while `answer` is in force: every request is heard, and each reply comes from its schema name. */
async function hearing<T>(answer: (schema: string, user: string) => unknown, run: () => Promise<T>): Promise<{ result: T; heard: Array<{ name: string; user: string }> }> {
  const target = openai.chat.completions as unknown as { create: unknown };
  const previous = target.create;
  const heard: Array<{ name: string; user: string }> = [];
  target.create = async (req: { response_format: { json_schema: { name: string } }; messages: Array<{ content: string }> }) => {
    const name = req.response_format.json_schema.name;
    heard.push({ name, user: req.messages[1].content });
    return { choices: [{ message: { content: JSON.stringify(answer(name, req.messages[1].content)) }, finish_reason: "stop" }], usage: { prompt_tokens: 1000, completion_tokens: 100 } };
  };
  try {
    return { result: await run(), heard };
  } finally {
    target.create = previous;
  }
}

test("a name the writer wrote back reaches the next prompt only in a data block: the foundation, the last reply, the prose as written (ADR-240)", async () => {
  const saved = { ...REPLIES };
  try {
    for (const name of INJECTED) {
      const where = name.slice(0, 24);
      calls.length = 0;
      prompts.length = 0;
      const shown = dataValue(name);
      const first = name.split(/\s+/)[0];
      // The foundation names the reader as typed, as the block shows it, and by the first word in capitals.
      REPLIES.natal_foundation = { ...(saved.natal_foundation as object), chartThesis: `${name} works in depth.`, dominantPattern: `${first.toUpperCase()} commits late and hard.`, centralTension: `${shown} cares against control.` };
      // Mind's claims miss, and the repair copies its quote from the prose as the prompt showed it.
      const mindLine = `${name} tests an idea before saying it.`;
      REPLIES.natal_mind = { ...(saved.natal_mind as object), howYouThink: mindLine, claims: claims("Not in the prose, and not close to anything in it either.") };
      REPLIES.natal_mind_claims = () => {
        const user = prompts.filter((p) => p.name === "natal_mind_claims").at(-1)!.user;
        const copied = /"howYouThink": "([\s\S]*?)",\n/.exec(user.slice(user.indexOf("PROSE AS WRITTEN")))![1];
        return { claims: [claims(copied)[0], ...claims().slice(1)] };
      };
      // Career's claims miss twice, so its second attempt reads its last reply back.
      const careerLine = `${shown} keeps going after the room has given up.`;
      let careerCalls = 0;
      REPLIES.natal_career = () => (careerCalls++ === 0 ? { ...(saved.natal_career as object), vocationalPull: careerLine, claims: claims("Not in the prose, and not close to anything in it either.") } : saved.natal_career);
      REPLIES.natal_career_claims = { claims: claims("Still nowhere near the prose.") };

      const out = await generateInterpretation(blindCurie(), name);

      assert.equal(calls.filter((c) => c === "natal_mind_claims").length, 1, `${where}: one claims-only repair`);
      assert.equal(calls.filter((c) => c === "natal_career").length, 2, `${where}: one retry`);
      for (const p of prompts) assert.equal(leftOut(p.user, name), null, `${where}: ${p.name}`);
      const overview = prompts.find((p) => p.name === "natal_overview")!.user;
      assert.equal(blocksOf(overview, shown), 3, `${where}: the brief's block, then the thesis's and the tension's`);
      assert.ok(!outsideDataBlocks(overview).includes(`${first.toUpperCase()} commits`), `${where}: the first word in capitals too`);
      const repaired = prompts.find((p) => p.name === "natal_mind_claims")!.user;
      assert.equal(blocksOf(repaired.slice(repaired.indexOf("PROSE AS WRITTEN")), shown), 1, `${where}: the prose as written holds the name in a block`);
      const retried = prompts.filter((p) => p.name === "natal_career")[1].user;
      assert.equal(blocksOf(retried.slice(retried.indexOf("YOUR LAST REPLY:")), shown), 1, `${where}: the last reply holds the name in a block`);
      assert.equal(out.mind.howYouThink, mindLine, `${where}: the stored prose keeps the name as typed`);
      assert.equal(out.mind.claims[0].quote, mindLine, `${where}: the quote copied from the masked prose quotes the prose as stored`);
      assert.equal(out.career.vocationalPull, (saved.natal_career as { vocationalPull: string }).vocationalPull);
    }
  } finally {
    delete REPLIES.natal_mind_claims;
    delete REPLIES.natal_career_claims;
    Object.assign(REPLIES, saved);
  }
});

test("adding the hour reads the stored foundation and prose with the name in a block, and an amendment copied from them lands on the prose as stored (ADR-240)", async () => {
  const chart = drawn();
  const houses = { houses: Array.from({ length: 12 }, (_, i) => ({ house: i + 1, reading: "You set the tone before you speak. Behaviour check: notice who follows your pace this week.", retrograde: [], stellium: null })) };
  for (const name of INJECTED) {
    const where = name.slice(0, 24);
    // What a writer can write back is the name as its block showed it.
    const shown = dataValue(name);
    const stored = JSON.parse(JSON.stringify(await generateInterpretation(blindCurie(), name))) as Awaited<ReturnType<typeof generateInterpretation>>;
    stored.foundation.chartThesis = `${shown} works in depth.`;
    stored.triad.sun.text = `${shown} keeps going after the room has given up.`;
    stored.mind.howYouDecide = `${shown} decides late and then all at once.`;

    const rising = await hearing((schema) => (schema === "natal_houses" ? houses : {
      rising: { label: "Capricorn rising", text: PARA },
      claims: [{ quote: "You investigate first and commit second.", evidence: [{ kind: "angle", angle: "ascendant", sign: "capricorn" }] }],
    }), () => generateHorizonBlocks(chart, name, stored));
    for (const h of rising.heard) assert.equal(leftOut(h.user, name), null, `${where}: ${h.name}`);
    assert.equal(blocksOf(rising.heard.find((h) => h.name === "natal_triad_rising")!.user, shown), 3, `${where}: the brief's block, the foundation's and the Sun part's`);

    const amended = await hearing((schema, user) => {
      if (schema !== "natal_mind_amend") return { amendments: [], additions: [] };
      const copied = /"howYouDecide": "([\s\S]*?)",\n/.exec(user.slice(user.indexOf("AS WRITTEN")))![1];
      return { amendments: [{ quote: copied, replacement: "You decide late, and in public.", evidence: [{ kind: "angle", angle: "ascendant", sign: "capricorn" }] }], additions: [] };
    }, () => amendSections(chart, stored, buildBrief(chart, name)));
    for (const h of amended.heard) assert.equal(leftOut(h.user, name), null, `${where}: ${h.name}`);
    assert.equal(blocksOf(amended.heard.find((h) => h.name === "natal_mind_amend")!.user, shown), 3, `${where}: the brief's block, the section's and the foundation's`);
    assert.equal(amended.result.interpretation.mind.howYouDecide, "You decide late, and in public.", `${where}: the amendment found the sentence as stored`);
    assert.equal(amended.result.counts.mind.amended, 1);
  }
});

// BUG R15-04, left failing for the card's builder: the foundation reaches every section prompt as JSON, where a paragraph
// break is written `\n`, and a name opening the paragraph after it is never masked (ADR-240, MB-152, sentinel S8).
test("BUG R15-04: a name that opens a paragraph of the foundation reaches no section prompt outside a data block", async () => {
  const saved = REPLIES.natal_foundation;
  try {
    for (const name of INJECTED) {
      prompts.length = 0;
      REPLIES.natal_foundation = { ...(saved as object), chartThesis: `Depth over display.\n\n${dataValue(name)} works in depth.` };
      await generateInterpretation(blindCurie(), name);
      const sections = prompts.filter((p) => p.name !== "natal_foundation");
      assert.ok(sections.length > 0);
      for (const p of sections) assert.equal(leftOut(p.user, name), null, `${name.slice(0, 24)}: ${p.name}`);
    }
  } finally {
    REPLIES.natal_foundation = saved;
  }
});

test("BUG R15-04: YOUR LAST REPLY, the model's JSON, keeps a name that opens a paragraph in a block", async () => {
  const { retryTail } = await import("./aiInterpretation.js");
  for (const name of INJECTED) {
    const reply = JSON.stringify({ howYouThink: `You plan first.\n\n${dataValue(name)} tests an idea before saying it.`, claims: [] });
    assert.equal(leftOut(retryTail(["claims: a quote is not in the prose"], reply, { name }), name), null, name.slice(0, 24));
  }
});

test("the natal prompts are v12, the version every report written from this round's prompts carries (ADR-369, ADR-383, R19-14)", () => {
  assert.equal(PROMPT_VERSION, "v12");
});

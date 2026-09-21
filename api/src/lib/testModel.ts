/**
 * Test-only: a fake chat completion that answers every call from canned,
 * schema-valid replies keyed by the JSON schema name the call registers, so a
 * whole pipeline can be proven without an API key or a cent of inference.
 * Lives outside the *.test.ts files so several of them can share it.
 */
process.env.OPENAI_API_KEY ??= "test-key-never-sent";
// The pool connects lazily and defaults-only prompts never query it.
process.env.DATABASE_URL ??= "postgres://test:test@127.0.0.1:1/never";
process.env.PROMPT_DEFAULTS_ONLY = "1";

const { openai } = await import("@workspace/integrations-openai-ai-server");

export interface FakeModel {
  calls: string[];
  /** Replies by schema name; a function may read the request. */
  replies: Record<string, unknown | ((req: FakeRequest) => unknown)>;
  failOn: string | null;
  restore: () => void;
}

export interface FakeRequest {
  response_format: { json_schema: { name: string; schema: unknown } };
  messages: Array<{ role: string; content: string }>;
}

export function installFakeModel(replies: FakeModel["replies"]): FakeModel {
  const target = openai.chat.completions as unknown as { create: unknown };
  const previous = target.create;
  const fake: FakeModel = { calls: [], replies, failOn: null, restore: () => { target.create = previous; } };
  target.create = async (req: FakeRequest) => {
    const name = req.response_format.json_schema.name;
    fake.calls.push(name);
    if (fake.failOn && name === fake.failOn) throw new Error(`simulated outage on ${name}`);
    const entry = fake.replies[name];
    if (entry === undefined) throw new Error(`no canned reply for ${name}`);
    const reply = typeof entry === "function" ? (entry as (r: FakeRequest) => unknown)(req) : entry;
    return {
      choices: [{ message: { content: JSON.stringify(reply) }, finish_reason: "stop" }],
      usage: { prompt_tokens: 1000, completion_tokens: 300, prompt_tokens_details: { cached_tokens: 800 } },
    };
  };
  return fake;
}

const PARA = "You investigate first and commit second. You keep going after the room has given up.";
const ACTION = { action: "Write the plan before the call.", why: "so you stop agreeing before you have thought about it" };
const ITEMS = [{ item: "Field research", reason: "you test before you trust" }, { item: "Laboratory work", reason: "you keep going when others stop" }, { item: "Teaching", reason: "you explain by showing" }];

/**
 * Schema-valid natal replies for every section, drawn or blind, citing the
 * Sun by sign and, when drawn, its house. The Sun's house is the fixture's:
 * Curie 11, Winfrey 1 by default.
 */
export function cannedNatalReplies(opts: { drawn: boolean; sunSign?: string; sunHouse?: number; sect?: "day" | "night" } = { drawn: true }): Record<string, unknown> {
  const sign = opts.sunSign ?? "scorpio";
  const claims = () => [1, 2, 3].map(() => ({
    quote: "You investigate first and commit second.",
    evidence: [{ kind: "placement", body: "sun", sign, house: opts.drawn ? (opts.sunHouse ?? 11) : null }],
  }));
  const foundation: Record<string, unknown> = {
    chartThesis: "Depth over display.", dominantPattern: "Slow, total commitment.", centralTension: "Care against control.",
    supportingEvidence: [1, 2, 3].map(() => ({ placement: "Sun", observation: "fixed", implication: "commits late and hard" })),
    sectionGuidance: { overview: "a", triad: "b", mind: "c", career: "d", money: "e", relationships: "f", family: "g", superpowers: "h", discoveries: "i", focus: "j" },
  };
  if (opts.drawn) { foundation.sect = opts.sect ?? "day"; foundation.sectLight = (opts.sect ?? "day") === "day" ? "sun" : "moon"; }
  const triad: Record<string, unknown> = { sun: { label: "Sun", text: PARA }, moon: { label: "Moon", text: PARA }, claims: claims() };
  if (opts.drawn) triad.rising = { label: "Rising", text: PARA };
  return {
    natal_foundation: foundation,
    natal_overview: { headline: PARA, concentration: PARA, temperament: PARA, distinctive: PARA, bridge: "Everything here points toward depth.", claims: claims() },
    natal_triad: triad,
    natal_houses: { houses: Array.from({ length: 12 }, (_, i) => ({ house: i + 1, reading: "You set the tone before you speak. Behaviour check: notice who follows your pace this week." })) },
    natal_mind: { howYouThink: PARA, howYouDecide: PARA, howYouAreUnderstood: PARA, practice: PARA, claims: claims() },
    natal_career: { vocationalPull: PARA, howYouShowUp: PARA, growthThroughWork: PARA, actions: [ACTION, ACTION, ACTION], careerPaths: ITEMS, claims: claims() },
    natal_money: { relationshipToResources: PARA, whatWorks: PARA, sharedAndExposed: PARA, actions: [ACTION, ACTION, ACTION], claims: claims() },
    natal_relationships: { howYouLove: PARA, theChallenge: "You leave the room a minute before you are asked to.", whatPartnershipAsks: PARA, actions: [ACTION, ACTION, ACTION], connectBestWith: ITEMS, claims: claims() },
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
}

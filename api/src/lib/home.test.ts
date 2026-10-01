import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

process.env.DATABASE_URL ??= "postgres://test:test@127.0.0.1:1/never";
process.env.OPENAI_API_KEY ??= "test-key-never-sent";
const { GetHomeResponse } = await import("@workspace/api-zod");
const {
  CLOSING_FIRST_PRACTICE, PIN_LIMIT, buildHome, firstSentence, isItemKey, isPinKey, isWorkbookKey, linesOf, pairListed,
  patchWorkbook, pinsOf, triadOf, workbookOf,
} = await import("./home.js");
const { chartForProfile } = await import("./profiles.js");
const { PAIR_PROMPT_VERSION } = await import("../prompts/pair/index.js");
type NatalRow = import("./home.js").NatalRow;
type PairRow = import("./home.js").PairRow;
type Viewer = import("./access.js").Viewer;

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "fixtures", "charts");

/** Birth data from a committed fixture and the chart computed from it, as a profile stores both. */
function birth(name: string) {
  const f = JSON.parse(readFileSync(join(FIXTURES, `${name}.json`), "utf8"));
  return { birthDate: f.birthDate as string, chartData: chartForProfile({ ...f, birthTimeWindowMinutes: f.birthTimeWindowMinutes ?? 0 }) };
}
const MARIE = birth("marie-curie");
const AUDREY = birth("audrey-hepburn");
const OPRAH = birth("oprah-winfrey");
const MARIE_BLIND = birth("marie-curie-unknown");

const GIVER: Viewer = { userId: "user_giver", sessionId: "s-giver" };
const SUBJECT: Viewer = { userId: "user_subject", sessionId: "s-subject" };
const STRANGER: Viewer = { userId: "user_stranger", sessionId: "s-stranger" };
const SESSION: Viewer = { userId: null, sessionId: "s-anon" };

const D1 = "2026-09-20T09:00:00.000Z";
const D2 = "2026-09-21T09:00:00.000Z";
const D3 = "2026-09-22T09:00:00.000Z";
const D4 = "2026-09-23T09:00:00.000Z";

let clock = Date.parse("2026-09-01T09:00:00.000Z");
const later = () => new Date((clock += 60_000));

const NATAL_TEXT = {
  superpowers: {
    superpower: { title: "Steady hands", text: "You stay calm when a plan falls apart. People notice it before you do.", actions: [] },
    chronicPattern: { title: "The long list", text: "You keep a list of what could go wrong.", actions: [] },
    growingEdge: { title: "Asking first", text: "You grow when you ask before you fix.  It feels slower, and it is not.", actions: [] },
  },
  focus: {
    practice: {
      intro: "Growth lives in small asks.",
      bullets: [
        { point: "Ask one person this week what they need before you offer help.", why: "you learn what help lands" },
        { point: "Write down one decision you made too fast, and what you would ask next time.", why: "you slow the reflex" },
        { point: "Say no once this week without a reason attached.", why: "your yes means more" },
      ],
    },
  },
};

const PAIR_TEXT = {
  meta: { promptVersion: PAIR_PROMPT_VERSION },
  twoCharts: {
    headline: "You both decide late and then all at once.",
    strong: ["You finish what the other starts.", "You keep a promise once it is made.", "Neither of you leaves a room angry."],
    work: ["Your two speeds train patience on both sides.", "Money talk trains you to say the number first.", "A plan made twice trains you to say it once."],
    paradox: "The calm that holds you is the calm that hides the plan.",
    strengths: ["Marie finishes what Audrey starts.", "Audrey says it out loud first.", "Neither leaves a room angry."],
    claims: [],
  },
  partners02: {
    nextTime: {
      items: [
        { for: "A", action: "Say the plan out loud on Thursday, before the weekend fills.", why: "trains saying it once" },
        { for: "B", action: "Ask for the quiet hour before you need it.", why: "trains asking early" },
        { for: "both", action: "Pick one evening a week with no plans at all.", why: "trains resting together" },
      ],
    },
  },
};

type Profile = NatalRow["profile"];

function person(id: string, name: string, data: ReturnType<typeof birth>, over: Partial<Profile> = {}): Profile {
  return {
    id, name, ...data,
    userId: GIVER.userId, sessionId: GIVER.sessionId, claimedByUserId: null, isSelf: false, claimedAsSelf: false,
    createdAt: later(), ...over,
  };
}

function natal(id: string, profile: Profile, over: Partial<NatalRow> = {}): NatalRow {
  return { id, status: "complete", sessionId: profile.sessionId, createdAt: later(), interpretation: NATAL_TEXT, workbook: {}, profile, ...over };
}

function pair(id: string, a: Profile, b: Profile, over: Partial<PairRow> = {}, roles: [string, string] = ["owner", "owner"]): PairRow {
  return {
    id, status: "complete", createdAt: later(), interpretation: PAIR_TEXT, workbook: {},
    relationship: { type: "partners", label: null, userId: GIVER.userId, sessionId: GIVER.sessionId },
    parts: [a, b].map((p, i) => ({ ...p, profileId: p.id, accessRole: roles[i] })),
    ...over,
  };
}

/** Marie writes her own report and Audrey's, then a pair of the two (the walk's people). */
function family() {
  const marie = person("PM", "Marie Curie", MARIE, { isSelf: true });
  const audrey = person("PA", "Audrey Hepburn", AUDREY);
  const oprah = person("PO", "Oprah Winfrey", OPRAH);
  return { marie, audrey, oprah, natal: [natal("RM", marie), natal("RA", audrey), natal("RO", oprah)] };
}

const valid = (home: unknown) => GetHomeResponse.parse(home);

test("workbook keys: a pair chapter's digits and a pin key pass, nothing else does (ADR-24, ADR-174)", () => {
  for (const key of [
    "career.actions.0", "superpowers.growingEdge.actions.2", "focus.practice.bullets.0", "mind.practice.0",
    "partners02.nextTime.items.0", "parentChild03.nextTime.items.2", "people06.nextTime.items.1",
  ]) {
    assert.ok(isItemKey(key), key);
    assert.ok(isPinKey(`pin.${key}`), `pin.${key}`);
    assert.ok(isWorkbookKey(key) && isWorkbookKey(`pin.${key}`), key);
  }
  assert.ok(!isItemKey("pin.focus.practice.bullets.0"));
  for (const key of [
    "", "career", "career.actions", "career.0", "Career.actions.0", "02partners.nextTime.items.0", "partners02.0next.items.0",
    "career..0", "career.actions.0.", "career.actions.x", "career.actions.0 ", "__proto__.x.0",
    "pin.", "pin.focus", "pin.pin.focus.practice.bullets.0", "pin.Focus.practice.0",
  ]) {
    assert.ok(!isWorkbookKey(key), JSON.stringify(key));
  }
});

test("pins: three a report; a fourth is refused whole, while re-dating, swapping and unpinning go through (ADR-174, MB-110)", () => {
  assert.equal(PIN_LIMIT, 3);
  const three = {
    "pin.focus.practice.bullets.0": D1, "pin.focus.practice.bullets.1": D2, "pin.partners02.nextTime.items.0": D3,
    "career.actions.0": D1,
  };
  const before = { ...three };
  assert.deepEqual(patchWorkbook(three, { "pin.focus.practice.bullets.2": D4 }), { error: "pin_limit" });
  assert.deepEqual(patchWorkbook(three, { "pin.focus.practice.bullets.2": D4, "career.actions.1": D4 }), { error: "pin_limit" });
  assert.deepEqual(patchWorkbook({}, Object.fromEntries([0, 1, 2, 3].map((i) => [`pin.focus.practice.bullets.${i}`, D1]))), { error: "pin_limit" });

  const swapped = patchWorkbook(three, { "pin.focus.practice.bullets.0": null, "pin.focus.practice.bullets.2": D4 });
  assert.ok("workbook" in swapped);
  assert.deepEqual(pinsOf(swapped.workbook).map((p) => p.key), ["focus.practice.bullets.1", "partners02.nextTime.items.0", "focus.practice.bullets.2"]);

  const redated = patchWorkbook(three, { "pin.focus.practice.bullets.0": D4 });
  assert.ok("workbook" in redated && redated.workbook["pin.focus.practice.bullets.0"] === D4);
  const ticked = patchWorkbook(three, { "career.actions.1": D4, "focus.practice.bullets.0": D4 });
  assert.ok("workbook" in ticked && ticked.workbook["focus.practice.bullets.0"] === D4);

  const over = { ...three, "pin.focus.practice.bullets.2": D4, "pin.mind.practice.0": D4 };
  const eased = patchWorkbook(over, { "pin.mind.practice.0": null });
  assert.ok("workbook" in eased);
  assert.equal(pinsOf(eased.workbook).length, 4);

  const merged = patchWorkbook({ "career.actions.0": D1 }, { "career.actions.0": null, "career.actions.1": D2 });
  assert.deepEqual(merged, { workbook: { "career.actions.1": D2 } });
  assert.deepEqual(three, before);
  assert.deepEqual(workbookOf({ a: "x", b: 1, c: null }), { a: "x" });
  assert.deepEqual(workbookOf(null), {});
  assert.deepEqual(workbookOf(["x"]), {});
});

test("circle: the reader at the centre, everyone whose Personal report they can read around them, each at their latest readable report (ADR-182)", () => {
  const { marie, audrey, oprah } = family();
  const home = valid(buildHome(GIVER, [
    natal("RM", marie),
    natal("RM2", marie, { status: "failed" }),
    natal("RA", audrey),
    natal("RA2", audrey, { status: "interpreting", interpretation: {} }),
    natal("RO", oprah, { status: "failed" }),
  ], []));
  assert.equal(home.several, false);
  assert.equal(home.you?.profileId, "PM");
  assert.equal(home.you?.reportId, "RM");
  assert.equal(home.you?.access, "owner");
  assert.equal(home.you?.isSelf, true);
  assert.equal(home.you?.birthDate, MARIE.birthDate);
  // Oprah's only report failed. She used to vanish from the circle and People without a word; she keeps her seat now,
  // so her row and quick look can say it failed, as the dashboard did before R12.
  assert.deepEqual(home.people.map((p) => [p.profileId, p.reportId, p.status, p.access, p.isSelf]), [
    ["PA", "RA2", "interpreting", "owner", false],
    ["PO", "RO", "failed", "owner", false],
  ]);
  assert.equal(home.people[0].lines, null);
  assert.deepEqual(home.pairs, []);

  const empty = { you: null, several: false, people: [], pairs: [], practising: [] };
  assert.deepEqual(buildHome(STRANGER, family().natal, []), empty);
  assert.deepEqual(buildHome(SESSION, family().natal, []), empty);
});

test("circle: a person whose every Personal report failed keeps one seat at the latest, which lends no lines and nothing to practise (ADR-84)", () => {
  const { marie, audrey, oprah } = family();
  const opens = natal("RA", audrey);
  const retry = natal("RA2", audrey, { status: "failed" });
  const firstTry = natal("RO", oprah, { status: "failed" });
  const secondTry = natal("RO2", oprah, { status: "failed" });
  // Newest first, so the failed retry is read before the older report that opens and must still give way to it.
  const home = valid(buildHome(GIVER, [secondTry, firstTry, retry, opens], []));
  assert.deepEqual(home.people.map((p) => [p.profileId, p.reportId, p.status]), [["PA", "RA", "complete"], ["PO", "RO2", "failed"]]);
  assert.deepEqual(home.people[1].triad, triadOf(oprah.chartData));
  assert.equal(home.people[1].lines, null);

  const writing = natal("RA3", audrey, { status: "interpreting", interpretation: {} });
  const failedAfter = natal("RA4", audrey, { status: "failed" });
  assert.deepEqual(buildHome(GIVER, [failedAfter, writing], []).people.map((p) => p.reportId), ["RA3"]);

  // A failed report keeps whatever text was stored before it stopped, so the reader's own lends no lines and no
  // practice, even pinned; their pair with Audrey is untouched by it.
  const own = valid(buildHome(
    GIVER,
    [natal("RM", marie, { status: "failed", workbook: { "pin.focus.practice.bullets.1": D1 } })],
    [pair("RP", marie, audrey, { workbook: { "pin.partners02.nextTime.items.0": D1 } })],
  ));
  assert.deepEqual([own.you?.reportId, own.you?.status, own.you?.lines, own.several], ["RM", "failed", null, false]);
  assert.deepEqual(own.practising.map((p) => [p.reportId, p.key]), [["RP", "partners02.nextTime.items.0"]]);
  assert.deepEqual(own.pairs.map((p) => [p.reportId, p.status]), [["RP", "complete"]]);

  assert.deepEqual(buildHome(STRANGER, [firstTry, secondTry], []).people, []);
});

test("circle: a report sent to the reader is a person until they say This is me; Stop sharing takes it from its giver's circle (ADR-139, ADR-182)", () => {
  const sent = person("PA", "Audrey Hepburn", AUDREY, { claimedByUserId: SUBJECT.userId });
  const subject = valid(buildHome(SUBJECT, [natal("RA", sent)], []));
  assert.equal(subject.you, null);
  assert.deepEqual(subject.people.map((p) => [p.profileId, p.access, p.isSelf]), [["PA", "claimed", false]]);
  assert.deepEqual(valid(buildHome(GIVER, [natal("RA", sent)], [])).people.map((p) => [p.profileId, p.access]), [["PA", "owner"]]);

  const mine = { ...sent, claimedAsSelf: true };
  const marked = valid(buildHome(SUBJECT, [natal("RA", mine)], []));
  assert.deepEqual([marked.you?.profileId, marked.you?.access, marked.you?.isSelf], ["PA", "claimed", true]);
  assert.ok(marked.you?.lines);
  assert.deepEqual(marked.people, []);

  const handedOver = { ...mine, userId: SUBJECT.userId, sessionId: "s-nobody" };
  assert.deepEqual(buildHome(GIVER, [natal("RA", handedOver, { sessionId: "s-nobody" })], []).people, []);
  assert.equal(buildHome(SUBJECT, [natal("RA", handedOver, { sessionId: "s-nobody" })], []).you?.reportId, "RA");

  const draft = person("PS", "Marie Curie", MARIE, { userId: null, sessionId: SESSION.sessionId, isSelf: true });
  assert.equal(buildHome(SESSION, [natal("RS", draft)], []).you?.reportId, "RS");
  const claimedAway = { ...draft, claimedByUserId: SUBJECT.userId };
  assert.equal(buildHome(SESSION, [natal("RS", claimedAway)], []).you, null);
});

test("circle: two charts marked as the reader's own leave the centre empty and both stay among the people (ADR-120)", () => {
  const marie = person("PM", "Marie Curie", MARIE, { isSelf: true });
  const sentToGiver = person("PB", "Audrey Hepburn", AUDREY, {
    userId: "user_other", sessionId: "s-other", claimedByUserId: GIVER.userId, claimedAsSelf: true,
  });
  const home = valid(buildHome(GIVER, [natal("RM", marie), natal("RB", sentToGiver)], []));
  assert.equal(home.you, null);
  assert.equal(home.several, true);
  assert.deepEqual(home.people.map((p) => [p.profileId, p.isSelf]), [["PM", true], ["PB", true]]);
});

test("triad: the stored chart's degrees to two decimals, whole-sign houses for the Sun and Moon, none for the Rising or without a birth time (ADR-174)", () => {
  const chart = MARIE.chartData;
  const triad = triadOf(chart);
  assert.ok(triad && chart.angles);
  assert.deepEqual(triad.sun, { sign: chart.planets.sun.sign, degree: chart.planets.sun.degree, house: chart.planets.sun.house });
  assert.deepEqual(triad.moon, { sign: chart.planets.moon.sign, degree: chart.planets.moon.degree, house: chart.planets.moon.house });
  assert.deepEqual(triad.rising, { sign: chart.angles.ascendant.sign, degree: chart.angles.ascendant.degree, house: null });
  for (const spot of [triad.sun, triad.moon]) {
    assert.ok(Number.isInteger(spot.house) && spot.house! >= 1 && spot.house! <= 12);
  }
  for (const spot of [triad.sun, triad.moon, triad.rising!]) {
    assert.equal(Math.round(spot.degree * 100) / 100, spot.degree);
    assert.ok(spot.degree >= 0 && spot.degree <= 30);
  }

  const blind = MARIE_BLIND.chartData;
  assert.equal(blind.angles, undefined);
  const unknown = triadOf(blind);
  assert.equal(unknown?.rising, null);
  assert.deepEqual([unknown?.sun.sign, unknown?.sun.house, unknown?.moon.house], [blind.planets.sun.sign, null, null]);

  assert.equal(triadOf(null), null);
  assert.equal(triadOf({}), null);
});

test("lines: chapter 08's superpower and growing edge, each its title and first sentence as written, on the reader's own only (ADR-174, ADR-18)", () => {
  assert.deepEqual(linesOf(NATAL_TEXT), {
    superpower: "Steady hands. You stay calm when a plan falls apart.",
    growingEdge: "Asking first. You grow when you ask before you fix.",
  });
  assert.equal(linesOf({}), null);
  assert.equal(linesOf(null), null);
  assert.equal(linesOf({ superpowers: { superpower: NATAL_TEXT.superpowers.superpower } }), null);
  assert.deepEqual(
    linesOf({ superpowers: { superpower: { title: "Why not?", text: "No end mark" }, growingEdge: { title: "Edge", text: "One." } } }),
    { superpower: "Why not? No end mark", growingEdge: "Edge. One." },
  );
  assert.equal(firstSentence("It took 2.5 hours to say it. Then it was easy."), "It took 2.5 hours to say it.");
  assert.equal(firstSentence("You said “no.” Then you left."), "You said “no.”");
  assert.equal(firstSentence("  Is it fair?\nYou ask that often. "), "Is it fair?");
});

test("pairs: three strong lines, the first work line as the challenge, the story; a closed pair names who stopped and shows nothing (ADR-174, MB-103)", () => {
  const { marie, audrey, oprah } = family();
  const older = pair("RP0", audrey, oprah, { relationship: { type: "people", label: "friends", userId: GIVER.userId, sessionId: GIVER.sessionId } });
  const home = valid(buildHome(GIVER, [], [older, pair("RP", marie, audrey)]));
  assert.deepEqual(home.pairs.map((p) => p.reportId), ["RP", "RP0"]);
  const [rp, rp0] = home.pairs;
  assert.deepEqual(rp, {
    reportId: "RP", lens: "partners", label: null,
    a: { profileId: "PM", name: "Marie Curie" }, b: { profileId: "PA", name: "Audrey Hepburn" },
    status: "complete", stoppedBy: null,
    strong: PAIR_TEXT.twoCharts.strong, challenge: PAIR_TEXT.twoCharts.work[0],
    story: { headline: PAIR_TEXT.twoCharts.headline, strengths: PAIR_TEXT.twoCharts.strengths },
  });
  assert.deepEqual([rp0.lens, rp0.label], ["people", "friends"]);

  const writing = valid(buildHome(GIVER, [], [pair("RPW", marie, audrey, { status: "interpreting", interpretation: {} })])).pairs[0];
  assert.deepEqual([writing.status, writing.strong, writing.challenge, writing.story], ["interpreting", [], null, null]);

  const stopped = { ...audrey, userId: SUBJECT.userId, sessionId: "s-nobody", claimedByUserId: SUBJECT.userId };
  const closed = valid(buildHome(GIVER, [], [pair("RP", marie, stopped)])).pairs[0];
  assert.deepEqual([closed.stoppedBy, closed.strong, closed.challenge, closed.story], ["Audrey", [], null, null]);
  assert.deepEqual(closed.b, { profileId: "PA", name: "Audrey Hepburn" });

  const claimed = { ...audrey, claimedByUserId: SUBJECT.userId };
  assert.deepEqual(buildHome(SUBJECT, [], [pair("RP", marie, claimed, {}, ["owner", "participant"])]).pairs.map((p) => p.reportId), ["RP"]);
  assert.deepEqual(buildHome(SUBJECT, [], [pair("RP", marie, claimed)]).pairs, []);
  assert.deepEqual(buildHome(STRANGER, [], [pair("RP", marie, audrey)]).pairs, []);
  assert.deepEqual(buildHome(GIVER, [], [{ ...pair("RP", marie, audrey), parts: pair("RP", marie, audrey).parts.slice(0, 1) }]).pairs, []);
});

test("pairs: one rule lists them everywhere: none written before p2 once complete (MB-65)", () => {
  assert.ok(pairListed({ status: "complete", interpretation: { meta: { promptVersion: PAIR_PROMPT_VERSION } } }));
  assert.ok(pairListed({ status: "complete", interpretation: { meta: { promptVersion: "p2" } } }));
  assert.ok(pairListed({ status: "complete", interpretation: { meta: { promptVersion: "p3" } } }), "a p3 pair stays listed after p4");
  assert.ok(!pairListed({ status: "complete", interpretation: { meta: { promptVersion: "p1" } } }));
  assert.ok(!pairListed({ status: "complete", interpretation: null }));
  assert.ok(pairListed({ status: "interpreting", interpretation: null }));
  assert.ok(pairListed({ status: "failed", interpretation: {} }));
  const { marie, audrey } = family();
  assert.deepEqual(buildHome(GIVER, [], [pair("RP", marie, audrey, { interpretation: { ...PAIR_TEXT, meta: { promptVersion: "p1" } } })]).pairs, []);
});

test("practising: the reader's own report and the pairs they are one of, pins first, else the Closing's first Practice item (reading 5, MB-110)", () => {
  const { marie, audrey, oprah } = family();
  const bullets = NATAL_TEXT.focus.practice.bullets;
  const items = PAIR_TEXT.partners02.nextTime.items;

  const fresh = valid(buildHome(GIVER, [natal("RM", marie), natal("RA", audrey)], []));
  assert.deepEqual(fresh.practising, [{
    reportId: "RM", kind: "natal", key: CLOSING_FIRST_PRACTICE, action: bullets[0].point, why: bullets[0].why, pinned: false, ticked: false,
  }]);
  assert.equal(CLOSING_FIRST_PRACTICE, "focus.practice.bullets.0");
  const tickedFirst = buildHome(GIVER, [natal("RM", marie, { workbook: { [CLOSING_FIRST_PRACTICE]: D1 } })], []);
  assert.equal(tickedFirst.practising[0].ticked, true);

  const home = valid(buildHome(GIVER, [
    natal("RM", marie, { workbook: { "pin.focus.practice.bullets.2": D3, "focus.practice.bullets.2": D4 } }),
    natal("RA", audrey, { workbook: { "pin.focus.practice.bullets.1": D1 } }),
  ], [
    pair("RP", marie, audrey, { workbook: { "pin.partners02.nextTime.items.1": D2, "pin.partners02.nextTime.items.0": D1, "partners02.nextTime.items.0": D2 } }),
    pair("RQ", audrey, oprah, { workbook: { "pin.partners02.nextTime.items.2": D1 } }),
  ]));
  assert.deepEqual(home.practising, [
    { reportId: "RP", kind: "compatibility", key: "partners02.nextTime.items.0", action: `Marie: ${items[0].action}`, why: items[0].why, pinned: true, ticked: true },
    { reportId: "RP", kind: "compatibility", key: "partners02.nextTime.items.1", action: `Audrey: ${items[1].action}`, why: items[1].why, pinned: true, ticked: false },
    { reportId: "RM", kind: "natal", key: "focus.practice.bullets.2", action: bullets[2].point, why: bullets[2].why, pinned: true, ticked: true },
  ]);

  const both = buildHome(GIVER, [], [pair("RP", marie, audrey, { workbook: { "pin.partners02.nextTime.items.2": D1 } })]);
  assert.equal(both.practising[0].action, `Both: ${items[2].action}`);

  const nothingNamed = buildHome(GIVER, [natal("RM", marie, { workbook: { "pin.career.actions.0": D1, "pin.mind.practice.0": D1 } })], []);
  assert.deepEqual(nothingNamed.practising.map((p) => [p.key, p.pinned]), [[CLOSING_FIRST_PRACTICE, false]]);
  assert.deepEqual(buildHome(GIVER, [natal("RM", marie, { interpretation: {} })], []).practising, []);

  const stopped = { ...audrey, userId: SUBJECT.userId, sessionId: "s-nobody", claimedByUserId: SUBJECT.userId };
  const closed = buildHome(GIVER, [], [pair("RP", marie, stopped, { workbook: { "pin.partners02.nextTime.items.0": D1 } })]);
  assert.deepEqual(closed.practising, []);

  const sentPair = pair("RP", marie, { ...audrey, claimedByUserId: SUBJECT.userId }, { workbook: { "pin.partners02.nextTime.items.1": D1 } }, ["owner", "participant"]);
  assert.deepEqual(buildHome(SUBJECT, [], [sentPair]).practising.map((p) => [p.reportId, p.key]), [["RP", "partners02.nextTime.items.1"]]);
});

/**
 * The triads are computed here, live, through the real engine from the birth
 * data in fixtures/charts (audrey-hepburn, beatrice, marie-curie-unknown) and
 * shaped as `GET /home` shapes them (api/src/lib/home.ts, `triadOf`), so no
 * placement is typed in. The names and report lines around them are only labels.
 */
import { describe, expect, it } from "vitest";
import { calculateNatalChart } from "@workspace/engine";
import type { Home, HomePair, HomePerson, SendState, Spot } from "@workspace/api-client-react";
import {
  OWN_LINES, PAIR_BLOCK, birthDateText, blindRisingText, doorText, firstName, isFinished, isWriting, lensWords, ownIds, pairWithYou,
  quickLookDoors, quickLookFor, shareTargetFor, spotText, triadLines, withYouText, writingText,
} from "./home-view";
import { CENTRE_ID } from "./orbit";

type Birth = [date: string, time: string, latitude: number, longitude: number, zone: string | number, windowMinutes: number];

const BIRTHS = {
  audrey: ["1929-05-04", "03:00", 50.8333, 4.3667, "Europe/Brussels", 0],
  beatrice: ["1988-08-08", "20:18", 51.521, -0.1445, "Europe/London", 0],
  marie: ["1867-11-07", "12:00", 52.2297, 21.0122, 1.4, 720],
} satisfies Record<string, Birth>;

type Placement = { sign: string; degree: number; house?: number };

/** As `GET /home` builds a triad: two decimals, a house only with a horizon, and never on the Rising. */
function triadOf(birth: Birth): HomePerson["triad"] {
  const chart = calculateNatalChart(...birth) as unknown as { planets: Record<string, Placement>; angles?: { ascendant: Placement } | null };
  const housed = !!chart.angles;
  const spot = (p: Placement, house: boolean): Spot => ({ sign: p.sign, degree: Math.round(p.degree * 100) / 100, house: house && p.house ? p.house : null });
  return {
    sun: spot(chart.planets.sun, housed),
    moon: spot(chart.planets.moon, housed),
    rising: chart.angles ? spot(chart.angles.ascendant, false) : null,
  };
}

const person = (profileId: string, name: string, birth: Birth, over: Partial<HomePerson> = {}): HomePerson => ({
  profileId,
  reportId: `r-${profileId}`,
  name,
  birthDate: birth[0],
  status: "complete",
  access: "owner",
  isSelf: false,
  triad: triadOf(birth),
  lines: null,
  ...over,
});

const pair = (reportId: string, a: HomePerson, b: HomePerson, over: Partial<HomePair> = {}): HomePair => ({
  reportId,
  lens: "partners",
  label: null,
  a: { profileId: a.profileId, name: a.name },
  b: { profileId: b.profileId, name: b.name },
  status: "complete",
  stoppedBy: null,
  strong: ["One strong line.", "Another strong line.", "A third strong line."],
  challenge: "One challenge to work on.",
  story: { headline: "A headline.", strengths: ["One", "Two", "Three"] },
  ...over,
});

const ME = person("me", "Beatrice Lund", BIRTHS.beatrice, {
  isSelf: true,
  lines: { superpower: "Steady hands. You stay calm when others rush.", growingEdge: "Saying no. You agree before you have checked." },
});
const AUDREY = person("audrey", "Audrey Hepburn", BIRTHS.audrey);
const MARIE = person("marie", "Marie Curie", BIRTHS.marie);

const home = (over: Partial<Home> = {}): Home => ({ you: ME, several: false, people: [AUDREY, MARIE], pairs: [], practising: [], ...over });

const send = (state: SendState["state"], firstName: string, profileId: string, relationshipId: string | null = null): SendState => ({
  state, profileId, relationshipId, firstName,
});

describe("the person words", () => {
  it("prints a birth date from its stored string, so no time zone moves it", () => {
    expect(birthDateText("1995-08-23")).toBe("23 Aug 1995");
    expect(birthDateText("1929-05-04")).toBe("4 May 1929");
    expect(birthDateText("not a date")).toBe("not a date");
  });

  it("names a door, its status and a missing horizon by first name, or for the reader", () => {
    expect(firstName("  Audrey   Hepburn ")).toBe("Audrey");
    expect(doorText("Audrey Hepburn", false)).toBe("Open Audrey's report");
    expect(doorText("Beatrice Lund", true)).toBe("Open your report");
    expect(writingText("Audrey Hepburn", false)).toBe("Writing Audrey's report");
    expect(writingText("Beatrice Lund", true)).toBe("Writing your report");
    expect(blindRisingText("Marie Curie", false)).toBe("Add Marie's birth time to draw the horizon");
    expect(blindRisingText("Beatrice Lund", true)).toBe("Add your birth time to draw the horizon");
  });

  it("heads chapter 08's lines and a pair's block in the report's own words", () => {
    expect(OWN_LINES).toEqual({ superpower: "Your superpower", growingEdge: "Your growing edge" });
    expect(PAIR_BLOCK).toEqual({ comes: "Comes naturally", challenge: "Challenge to work on" });
  });
});

describe("the triad with degrees", () => {
  it("prints a body's degree, sign and house with its one word, as the approved quick look does (ADR-98)", () => {
    expect(triadLines(AUDREY.triad)).toEqual([
      { key: "sun", label: "Sun", text: "13.12° Taurus · 4th (home)" },
      { key: "moon", label: "Moon", text: "6.45° Pisces · 2nd (money)" },
      { key: "rising", label: "Rising", text: "28.62° Aquarius" },
    ]);
  });

  it("names no house without a birth time, and leaves the Rising to the line that asks for one", () => {
    expect(triadLines(MARIE.triad)).toEqual([
      { key: "sun", label: "Sun", text: "14.58° Scorpio" },
      { key: "moon", label: "Moon", text: "16.48° Pisces" },
      { key: "rising", label: "Rising", text: null },
    ]);
  });

  it("never gives the Rising a house, and draws no rows before the chart is stored", () => {
    const triad = AUDREY.triad!;
    expect(triadLines({ ...triad, rising: { ...triad.rising!, house: 1 } })[2].text).toBe("28.62° Aquarius");
    expect(triadLines(null)).toEqual([]);
  });

  it("keeps two decimals on a degree", () => {
    const sun = AUDREY.triad!.sun;
    expect(spotText({ ...sun, degree: 5 })).toBe("5.00° Taurus · 4th (home)");
  });
});

describe("the reader's pair with a person", () => {
  it("is the newest one that reads, from either side, and never a pair between two others", () => {
    const older = pair("c-old", ME, AUDREY);
    const newer = pair("c-new", AUDREY, ME, { lens: "people" });
    const others = pair("c-others", AUDREY, MARIE);
    expect(pairWithYou(home({ pairs: [others, newer, older] }), "audrey")?.reportId).toBe("c-new");
    expect(pairWithYou(home({ pairs: [others] }), "audrey")).toBeUndefined();
  });

  it("prefers one that reads over a newer one still being written, and shows a writing one when it is the only one", () => {
    const writing = pair("c-writing", ME, AUDREY, { status: "interpreting", strong: [], challenge: null, story: null });
    const done = pair("c-done", ME, AUDREY, { status: "revising" });
    expect(pairWithYou(home({ pairs: [writing, done] }), "audrey")?.reportId).toBe("c-done");
    expect(pairWithYou(home({ pairs: [writing] }), "audrey")?.reportId).toBe("c-writing");
  });

  it("skips a failed pair and one closed by a stop (MB-103 provisional)", () => {
    const pairs = [pair("c-failed", ME, AUDREY, { status: "failed" }), pair("c-closed", ME, AUDREY, { stoppedBy: "Audrey" })];
    expect(pairWithYou(home({ pairs }), "audrey")).toBeUndefined();
  });

  it("counts every chart marked as the reader's while there are several, and none for the reader's own seat", () => {
    const mine = { ...ME, profileId: "me-2", isSelf: true };
    const several = home({ you: null, several: true, people: [ME, mine, AUDREY], pairs: [pair("c1", mine, AUDREY)] });
    expect([...ownIds(several)].sort()).toEqual(["me", "me-2"]);
    expect(pairWithYou(several, "audrey")?.reportId).toBe("c1");
    expect(pairWithYou(several, "me-2")).toBeUndefined();
  });

  it("names the two in the approved mock's words", () => {
    expect(withYouText({ lens: "partners" })).toBe("With you · Partners");
    expect(withYouText({ lens: "parent_child" })).toBe("With you · A parent and a child");
    expect(withYouText({ lens: "people" })).toBe("With you · Friends, family, colleagues");
    expect(lensWords({ lens: "people" })).toBe("Friends, family, colleagues");
  });
});

describe("what a tap opens", () => {
  it("opens the reader's own quick look from the centre, and nothing there before they have a report", () => {
    expect(quickLookFor(home(), CENTRE_ID)).toEqual({ person: ME, self: true });
    expect(quickLookFor(home({ you: null }), CENTRE_ID)).toBeNull();
  });

  it("opens a person's with the reader's pair, or alone, and nothing for a gift, the add point or a ghost seat", () => {
    const together = pair("c1", ME, AUDREY);
    expect(quickLookFor(home({ pairs: [together] }), "audrey")).toEqual({ person: AUDREY, pair: together, self: false });
    expect(quickLookFor(home({ pairs: [together] }), "marie")).toEqual({ person: MARIE, self: false });
    for (const id of ["gift:g1", "add", "ghost:0", "gone"]) expect(quickLookFor(home(), id)).toBeNull();
    expect(quickLookFor(home(), null)).toBeNull();
    expect(quickLookFor(undefined, "audrey")).toBeNull();
  });
});

describe("the quick look's doors", () => {
  it("opens the reader's own report, or says it is being written", () => {
    expect(quickLookDoors({ person: ME, self: true })).toEqual({
      primary: { kind: "open", label: "Open your report", href: "/report/r-me" },
      report: null,
    });
    expect(quickLookDoors({ person: { ...ME, status: "interpreting" }, self: true }).primary).toEqual({ kind: "writing", label: "Writing your report" });
  });

  it("opens a person's report when the reader has no pair with them", () => {
    expect(quickLookDoors({ person: AUDREY, self: false })).toEqual({
      primary: { kind: "open", label: "Open Audrey's report", href: "/report/r-audrey" },
      report: null,
    });
  });

  it("leads with the Compatibility report, the person's report beside it", () => {
    expect(quickLookDoors({ person: AUDREY, pair: pair("c1", ME, AUDREY), self: false })).toEqual({
      primary: { kind: "open", label: "Open Compatibility report", href: "/compatibility/c1" },
      report: { kind: "open", label: "Audrey's report", href: "/report/r-audrey" },
    });
  });

  it("shows a status in place of any door whose report is still being written (ADR-130)", () => {
    const doors = quickLookDoors({ person: { ...AUDREY, status: "computing" }, pair: pair("c1", ME, AUDREY, { status: "pending" }), self: false });
    expect(doors).toEqual({
      primary: { kind: "writing", label: "Writing your Compatibility report" },
      report: { kind: "writing", label: "Writing Audrey's report" },
    });
  });

  it("reads a report under a revision pass as finished", () => {
    expect(isFinished("revising")).toBe(true);
    expect(isWriting("revising")).toBe(false);
    expect(quickLookDoors({ person: { ...AUDREY, status: "revising" }, self: false }).primary.kind).toBe("open");
  });
});

describe("Share with", () => {
  const together = pair("c1", ME, AUDREY);
  const look = { person: AUDREY, pair: together, self: false };

  it("gives the person their own Personal report first, as their row does", () => {
    expect(shareTargetFor(look, { person: send("can_send", "Audrey", "audrey"), pair: send("can_grant", "Audrey", "audrey", "rel") })).toEqual({
      kind: "person", send: send("can_send", "Audrey", "audrey"), reportId: "r-audrey",
    });
  });

  it("gives the pair once they have their report, and only a pair that reads", () => {
    const pairSend = send("can_grant", "Audrey", "audrey", "rel");
    expect(shareTargetFor(look, { person: send("joined", "Audrey", "audrey"), pair: pairSend })).toEqual({ kind: "pair", send: pairSend, reportId: "c1" });
    const writing = { ...look, pair: { ...together, status: "interpreting" as const } };
    expect(shareTargetFor(writing, { person: send("joined", "Audrey", "audrey"), pair: pairSend })).toBeNull();
  });

  it("offers nothing already sent, nothing the server does not offer, and nothing on the reader's own quick look", () => {
    expect(shareTargetFor(look, { person: send("sent", "Audrey", "audrey"), pair: send("sent", "Audrey", "audrey", "rel") })).toBeNull();
    expect(shareTargetFor(look, {})).toBeNull();
    expect(shareTargetFor({ person: ME, self: true }, { person: send("can_send", "Beatrice", "me") })).toBeNull();
  });
});

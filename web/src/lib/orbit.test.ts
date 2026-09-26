import { describe, expect, it } from "vitest";
import type { CreditCounts } from "@workspace/api-client-react";
import {
  initials, orbitPoints, partnersOf, pointAngles, ringGaps,
  type OrbitGift, type OrbitInput, type OrbitPoint, type OrbitProfile, type OrbitReport, type RingGap,
} from "./orbit";

const AT = "2026-09-20T10:00:00.000Z";
const LATER = "2026-09-22T10:00:00.000Z";

const profile = (id: string, name: string, over: Partial<OrbitProfile> = {}): OrbitProfile => ({ id, name, isSelf: false, ...over });

const natal = (id: string, profileId: string, over: Partial<OrbitReport> = {}): OrbitReport => ({
  id, kind: "natal", status: "complete", profileId, createdAt: AT, access: "owner", ...over,
});

const pair = (id: string, a: string, b: string, over: Partial<OrbitReport> = {}): OrbitReport => ({
  id, kind: "compatibility", status: "complete", profileId: null,
  participants: [{ id: a, name: a }, { id: b, name: b }], createdAt: AT, access: "owner", ...over,
});

const gift = (id: string, recipientName: string, state: OrbitGift["state"] = "waiting"): OrbitGift => ({ id, recipientName, state });

const orbit = (over: Partial<OrbitInput> = {}) => orbitPoints({ profiles: [], reports: [], gifts: [], credits: 2, enforced: true, ...over });

const ids = (points: readonly OrbitPoint[]) => points.map((p) => p.id);

// The reader with their own chart written: the centre, never a point.
const ME = profile("me", "Alex Moreau", { isSelf: true });
const MINE = natal("r-me", "me");

/** The reader and people they wrote, each with a finished report: p1, p2, ... */
function people(names: string[]): { profiles: OrbitProfile[]; reports: OrbitReport[] } {
  const others = names.map((name, i) => profile(`p${i + 1}`, name));
  return { profiles: [ME, ...others], reports: [MINE, ...others.map((p) => natal(`r-${p.id}`, p.id))] };
}

/** Each gap holds its own point and ends before the next one starts, all the way round. */
function expectRingOrder(angles: readonly number[], gaps: readonly RingGap[]) {
  expect(gaps).toHaveLength(angles.length);
  gaps.forEach((g, i) => {
    expect(g.start).toBeLessThanOrEqual(angles[i]);
    expect(g.end).toBeGreaterThanOrEqual(angles[i]);
    const nextStart = i === gaps.length - 1 ? gaps[0].start + 360 : gaps[i + 1].start;
    expect(g.end).toBeLessThanOrEqual(nextStart + 1e-9);
  });
}

const deg = (rad: number) => (rad * 180) / Math.PI;

describe("who is on the orbit", () => {
  it("holds only the Add someone point before anyone is written, one however many credits", () => {
    for (const credits of [1, 5, 40]) {
      expect(orbit({ profiles: [ME], reports: [MINE], credits })).toEqual([
        { id: "add", kind: "add", name: "Add someone", initials: "+", label: "ADD SOMEONE", writing: false, sharedPair: false },
      ]);
    }
    expect(ids(orbit())).toEqual(["add"]);
  });

  it("reads GET CREDITS at zero where credits are enforced, and ADD SOMEONE on production's soft pass", () => {
    const counts: CreditCounts = { available: 0, used: 3 };
    expect(orbit({ credits: 0 }).at(-1)).toMatchObject({ kind: "add", name: "Get credits", initials: "+", label: "GET CREDITS" });
    expect(orbit({ credits: counts }).at(-1)?.label).toBe("GET CREDITS");
    expect(orbit({ credits: 0, enforced: false }).at(-1)?.label).toBe("ADD SOMEONE");
    expect(orbit({ credits: { ...counts, available: 1 } }).at(-1)?.label).toBe("ADD SOMEONE");
  });

  it("draws one person as initials and a first name, with the report their card opens", () => {
    const { profiles, reports } = people(["Beatrice Lund"]);
    expect(orbit({ profiles, reports })).toEqual([
      { id: "p1", kind: "person", name: "Beatrice Lund", initials: "BL", label: "BEATRICE", writing: false, sharedPair: false, profileId: "p1", reportId: "r-p1" },
      expect.objectContaining({ id: "add" }),
    ]);
    const accented = people(["  élodie   ångström "]);
    expect(orbit(accented).at(0)).toMatchObject({ name: "élodie   ångström", initials: "ÉÅ", label: "ÉLODIE" });
  });

  it("keeps two people in the order the people list gives them", () => {
    const { profiles, reports } = people(["Beatrice Lund", "Charles Okafor"]);
    expect(ids(orbit({ profiles, reports: [...reports].reverse() }))).toEqual(["p1", "p2", "add"]);
  });

  it("spaces nine people and the Add someone point evenly, each cut clear of the next", () => {
    const { profiles, reports } = people([
      "Ana Ruiz", "Ben Carter", "Chloé Martin", "Dev Patel", "Eun-ji Park", "Farah Haddad", "Gus Olsen", "Hana Sato", "Ivo Novak",
    ]);
    const points = orbit({ profiles, reports });
    expect(points).toHaveLength(10);
    expect(new Set(ids(points)).size).toBe(10);
    expect(points.filter((p) => p.kind === "add")).toHaveLength(1);
    expect(points.at(-1)?.kind).toBe("add");
    const angles = pointAngles(points.length);
    angles.slice(1).forEach((a, i) => expect(a - angles[i]).toBeCloseTo(36, 9));
    // The phone orbit's ring, each disc and its name reaching 44 px from its centre.
    expectRingOrder(angles, ringGaps(angles, 141, 44));
  });

  it("leaves out a person whose report failed, but not one with an earlier report that still opens", () => {
    const points = orbit({
      profiles: [ME, profile("p1", "Dana Weiss"), profile("p2", "Eli Stone")],
      reports: [
        MINE,
        natal("r1", "p1", { status: "failed" }),
        natal("r2-old", "p2"),
        natal("r2-new", "p2", { status: "failed", createdAt: LATER }),
      ],
    });
    expect(ids(points)).toEqual(["p2", "add"]);
    expect(points[0].reportId).toBe("r2-old");
  });

  it("marks a report still being written, and reads one under a revision pass as finished", () => {
    const names = ["Charles Okafor", "Dana Weiss", "Eli Stone", "Farah Haddad"];
    const statuses = ["pending", "computing", "interpreting", "revising"] as const;
    const others = names.map((name, i) => profile(`p${i + 1}`, name));
    const points = orbit({
      profiles: [ME, ...others],
      reports: [MINE, ...others.map((p, i) => natal(`r-${p.id}`, p.id, { status: statuses[i] }))],
    });
    expect(points.map((p) => [p.label, p.writing])).toEqual([
      ["CHARLES · WRITING", true],
      ["DANA · WRITING", true],
      ["ELI · WRITING", true],
      ["FARAH", false],
      ["ADD SOMEONE", false],
    ]);
  });

  it("puts a waiting gift after the people and before Add someone", () => {
    const { profiles, reports } = people(["Beatrice Lund"]);
    expect(orbit({ profiles, reports, gifts: [gift("g1", "Pierre"), gift("g2", "Zoé Durand", "returned")] })).toEqual([
      expect.objectContaining({ id: "p1", kind: "person" }),
      { id: "gift:g1", kind: "gift", name: "Pierre", initials: "P", label: "PIERRE · GIFT WAITING", writing: false, sharedPair: false, giftId: "g1" },
      expect.objectContaining({ id: "add" }),
    ]);
  });

  it("drops a gift once it is claimed and puts nobody in its place (ADR-139)", () => {
    expect(ids(orbit({ profiles: [ME], reports: [MINE], gifts: [gift("g1", "Pierre")] }))).toEqual(["gift:g1", "add"]);
    expect(ids(orbit({ profiles: [ME], reports: [MINE], gifts: [gift("g1", "Pierre", "claimed")] }))).toEqual(["add"]);
  });

  it("never draws the reader, a chart sent to the reader, or anyone without a report the reader made", () => {
    const points = orbit({
      profiles: [
        ME,
        profile("claimed-self", "Alex Moreau", { isSelf: true }),
        profile("not-me", "Sam Keller"),
        profile("no-report", "Tom Berg"),
        profile("mine", "Una Holm"),
        profile("old-server", "Vera Lind"),
      ],
      reports: [
        MINE,
        natal("r-claimed-self", "claimed-self", { access: "claimed" }),
        natal("r-not-me", "not-me", { access: "claimed" }),
        natal("r-mine", "mine"),
        natal("r-old-server", "old-server", { access: undefined }),
        natal("r-unlisted", "unlisted"),
      ],
    });
    expect(ids(points)).toEqual(["mine", "old-server", "add"]);
  });

  it("rings a person violet who shares a pair with the reader that the reader can open", () => {
    const { profiles, reports } = people(["Beatrice Lund", "Charles Okafor", "Dana Weiss", "Eli Stone", "Farah Haddad"]);
    const pairs = [
      pair("c1", "me", "p1"),
      pair("c2", "p2", "me", { status: "interpreting" }),
      pair("c3", "me", "p3", { stoppedBy: "Dana" }),
      pair("c4", "me", "p4", { status: "failed" }),
      pair("c5", "p4", "p5"),
      pair("c6", "p5", "me", { status: "revising" }),
    ];
    const points = orbit({ profiles, reports: [...reports, ...pairs] });
    expect(ids(points.filter((p) => p.sharedPair))).toEqual(["p1", "p5"]);
  });

  it("draws people before the reader's own chart exists, and rings no one without a reader to share with", () => {
    const { profiles, reports } = people(["Beatrice Lund", "Charles Okafor"]);
    const points = orbit({ profiles: profiles.slice(1), reports: [...reports.slice(1), pair("c1", "p1", "p2")], credits: 0 });
    expect(points.map((p) => [p.id, p.sharedPair])).toEqual([["p1", false], ["p2", false], ["add", false]]);
    expect(points.at(-1)?.label).toBe("GET CREDITS");
  });

  it("puts a pair's other person nowhere, even with the pair shared with the reader (ADR-139)", () => {
    // Sam wrote the reader's chart and sent it, then sent the pair of the two of them.
    const reader = profile("made-by-sam", "Alex Moreau", { isSelf: true });
    const shared = pair("c1", "sams-own", "made-by-sam", { access: "participant" });
    const alone = orbit({ profiles: [reader], reports: [natal("r-reader", "made-by-sam", { access: "claimed" }), shared] });
    expect(alone).toEqual([expect.objectContaining({ id: "add", sharedPair: false })]);
    const listed = orbit({
      profiles: [reader, profile("sams-own", "Sam Keller")],
      reports: [natal("r-reader", "made-by-sam", { access: "claimed" }), shared],
    });
    expect(ids(listed)).toEqual(["add"]);
  });
});

describe("partnersOf", () => {
  const pairs: OrbitReport[] = [
    pair("c1", "me", "p1"),
    pair("c2", "p1", "p2"),
    pair("c3", "p2", "p1", { status: "revising" }),
    pair("c4", "p1", "p3", { status: "computing" }),
    pair("c5", "p1", "p4", { stoppedBy: "Dana" }),
    pair("c6", "p1", "p5", { status: "failed" }),
    natal("r-p1", "p1"),
  ];

  it("lists the other people of each pair a point is in that the reader can open, once each", () => {
    expect(partnersOf("p1", pairs)).toEqual(["me", "p2"]);
    expect(partnersOf("p2", pairs)).toEqual(["p1"]);
    expect(partnersOf("me", pairs)).toEqual(["p1"]);
  });

  it("lists nobody through a pair still writing, closed or failed, and nobody for a gift or Add someone", () => {
    for (const id of ["p3", "p4", "p5", "gift:g1", "add", "nobody"]) expect(partnersOf(id, pairs)).toEqual([]);
  });
});

describe("pointAngles", () => {
  it("starts at the top and goes clockwise, or where the offset puts it", () => {
    expect(pointAngles(4)).toEqual([-90, 0, 90, 180]);
    expect(pointAngles(1)).toEqual([-90]);
    expect(pointAngles(3, 90)).toEqual([90, 210, 330]);
    expect(pointAngles(0)).toEqual([]);
    expect(pointAngles(-2)).toEqual([]);
  });

  it("gives each of n points 360 / n degrees, across the top as well", () => {
    for (const n of [2, 5, 7, 10, 12]) {
      const a = pointAngles(n);
      a.slice(1).forEach((x, i) => expect(x - a[i]).toBeCloseTo(360 / n, 9));
      expect(a[0] + 360 - a[n - 1]).toBeCloseTo(360 / n, 9);
    }
  });
});

describe("ringGaps", () => {
  it("cuts the ring where it passes within a point's half-width of its centre", () => {
    const [g] = ringGaps([30], 100, 50);
    const half = deg(2 * Math.asin(0.25));
    expect(g.start).toBeCloseTo(30 - half, 9);
    expect(g.end).toBeCloseTo(30 + half, 9);
    const on = (d: number) => [100 * Math.cos((d * Math.PI) / 180), 100 * Math.sin((d * Math.PI) / 180)];
    const [x0, y0] = on(30);
    const [x1, y1] = on(g.end);
    expect(Math.hypot(x1 - x0, y1 - y0)).toBeCloseTo(50, 9);
  });

  it("gives each point its own half-width, or one to all", () => {
    const angles = pointAngles(4);
    const own = ringGaps(angles, 100, [10, 20, 0, 40]);
    [10, 20, 0, 40].forEach((w, i) => {
      const half = deg(2 * Math.asin(w / 200));
      expect(own[i].end - angles[i]).toBeCloseTo(half, 9);
      expect(angles[i] - own[i].start).toBeCloseTo(half, 9);
    });
    ringGaps(angles, 100, 20).forEach((g, i) => expect(g.end - angles[i]).toBeCloseTo(deg(2 * Math.asin(0.1)), 9));
  });

  it("lets crowded cuts meet between their points without overlapping the next", () => {
    const angles = pointAngles(12);
    const gaps = ringGaps(angles, 100, 40);
    expectRingOrder(angles, gaps);
    gaps.forEach((g, i) => {
      expect(g.start).toBeCloseTo(angles[i] - 15, 9);
      expect(g.end).toBeCloseTo(angles[i] + 15, 9);
    });
  });

  it("splits an overlap inside it, and never past either point", () => {
    const even = ringGaps([0, 30], 100, 30);
    expect(even[0].end).toBeCloseTo(15, 9);
    expect(even[1].start).toBeCloseTo(15, 9);
    expect(even[0].start).toBeCloseTo(-deg(2 * Math.asin(0.15)), 9);
    const uneven = ringGaps([0, 30], 100, [10, 80]);
    expect(uneven[0].end).toBeCloseTo(0, 9);
    expect(uneven[1].start).toBeCloseTo(0, 9);
    expect(uneven[1].end).toBeCloseTo(30 + deg(2 * Math.asin(0.4)), 9);
  });

  it("cuts no more than the whole ring around a lone point, and nothing for no width", () => {
    const [whole] = ringGaps([-90], 50, 500);
    expect(whole.end - whole.start).toBeCloseTo(360, 9);
    expect(ringGaps([10], 100, 0)).toEqual([{ start: 10, end: 10 }]);
    expect(ringGaps([], 100, 20)).toEqual([]);
  });

  it("cuts the same arcs once the orbit has drifted, each gap staying with its own angle", () => {
    const angles = pointAngles(5);
    const widths = [30, 10, 50, 20, 40];
    const base = ringGaps(angles, 120, widths);
    const drift = 1234.5;
    ringGaps(angles.map((a) => a + drift), 120, widths).forEach((g, i) => {
      expect(g.start - drift).toBeCloseTo(base[i].start, 9);
      expect(g.end - drift).toBeCloseTo(base[i].end, 9);
    });
    const order = [2, 0, 4, 1, 3];
    ringGaps(order.map((i) => angles[i]), 120, order.map((i) => widths[i])).forEach((g, k) => {
      expect(g.start).toBeCloseTo(base[order[k]].start, 9);
      expect(g.end).toBeCloseTo(base[order[k]].end, 9);
    });
  });
});

describe("initials", () => {
  it("takes the first letters of the first and last words", () => {
    expect(initials("Beatrice Lund")).toBe("BL");
    expect(initials("Athena Mapelli Mozzi")).toBe("AM");
    expect(initials("Vincent van Gogh")).toBe("VG");
    expect(initials("  mary   jane  watson ")).toBe("MW");
    expect(initials("Jean-Luc Picard")).toBe("JP");
  });

  it("gives a one-word name one letter, and no name none", () => {
    expect(initials("Pierre")).toBe("P");
    expect(initials(" élodie ")).toBe("É");
    expect(initials("")).toBe("");
    expect(initials("   ")).toBe("");
  });

  it("keeps accents, composed or not", () => {
    expect(initials("Élodie Ångström")).toBe("ÉÅ");
    expect(initials("Élodie Ångström")).toBe("ÉÅ");
    expect(initials("ñusta øvergaard")).toBe("ÑØ");
    expect(initials("Q̃uentin")).toBe("Q̃");
  });

  it("starts each word at its first letter", () => {
    expect(initials("(Mum)")).toBe("M");
    expect(initials("'Nana' O'Brien")).toBe("NO");
  });
});

import { describe, expect, it } from "vitest";
import { BUNDLES, bundleById } from "@workspace/commerce";
import type { OrbitProfile, OrbitReport } from "./orbit";
import {
  PATH_SEEN_KEY, TEST_CHECKOUT, bundleRow, bundleRows, creditCount, creditDots, creditsEnforced, historyLine, markPathSeen,
  pathDue, pathHave, pathSteps, pathView, readPathSeen, type PathHave, type PathSeenStore,
} from "./credits-view";
import * as view from "./credits-view";

const NOTHING: PathHave = { ownChart: false, people: [], pairs: 0 };

const titles = (balance: number, have: PathHave) => pathSteps(balance, have).map((s) => s.title);
const planned = (balance: number, have: PathHave) => pathSteps(balance, have).reduce((sum, s) => sum + s.credits, 0);

function memoryStore(initial: Record<string, string> = {}): PathSeenStore & { data: Record<string, string> } {
  const data = { ...initial };
  return {
    data,
    getItem: (key) => data[key] ?? null,
    setItem: (key, value) => {
      data[key] = value;
    },
  };
}

describe("creditsEnforced", () => {
  it("is true on every host but production, which keeps the soft pass (ADR-138)", () => {
    expect(creditsEnforced("development")).toBe(true);
    expect(creditsEnforced("staging")).toBe(true);
    expect(creditsEnforced("production")).toBe(false);
  });

  it("reads the build's host when none is given; a test build is development", () => {
    expect(creditsEnforced()).toBe(true);
  });
});

describe("creditDots", () => {
  it("lights one dot per credit up to ten, then counts the rest", () => {
    expect(creditDots(0)).toEqual({ lit: 0, more: 0 });
    expect(creditDots(1)).toEqual({ lit: 1, more: 0 });
    expect(creditDots(3)).toEqual({ lit: 3, more: 0 });
    expect(creditDots(10)).toEqual({ lit: 10, more: 0 });
    expect(creditDots(11)).toEqual({ lit: 10, more: 1 });
    expect(creditDots(14)).toEqual({ lit: 10, more: 4 });
  });

  it("never draws a dot for a credit that is not there", () => {
    expect(creditDots(-2)).toEqual({ lit: 0, more: 0 });
    expect(creditDots(Number.NaN)).toEqual({ lit: 0, more: 0 });
    expect(creditDots(2.9)).toEqual({ lit: 2, more: 0 });
  });
});

describe("creditCount", () => {
  it("says credit for one and credits otherwise", () => {
    expect(creditCount(0)).toBe("0 credits");
    expect(creditCount(1)).toBe("1 credit");
    expect(creditCount(6)).toBe("6 credits");
  });
});

describe("bundleRows", () => {
  it("prints the catalogue's three bundles: names, prices, the launch price against the Singles total, the mixes", () => {
    expect(bundleRows()).toEqual([
      {
        id: "solo",
        name: "Single",
        line: "1 credit · a Personal report or a Compatibility report",
        credits: 1,
        count: "1 credit",
        either: true,
        mixes: [
          { text: "1 Personal report", kind: "personal" },
          { text: "1 Compatibility report", kind: "compatibility" },
        ],
        price: "€24",
        launch: false,
        singles: null,
        save: null,
      },
      {
        id: "couple",
        name: "Couple",
        line: "3 credits · a report each and how you get along",
        credits: 3,
        count: "3 credits, for example:",
        either: false,
        mixes: [
          { text: "2 Personal reports", kind: "personal" },
          { text: "1 Compatibility report", kind: "compatibility" },
        ],
        price: "€54",
        launch: true,
        singles: "3 Singles €72",
        save: "you save €18",
      },
      {
        id: "family",
        name: "Family & friends",
        line: "5 credits · for the people close to you",
        credits: 5,
        count: "5 credits, for example:",
        either: false,
        mixes: [
          { text: "3 Personal reports", kind: "personal" },
          { text: "2 Compatibility reports", kind: "compatibility" },
        ],
        price: "€72",
        launch: true,
        singles: "5 Singles €120",
        save: "you save €48",
      },
    ]);
  });

  it("carries each bundle's line word for word, the description the home page's JSON-LD gives its Offer (MB-140)", () => {
    expect(bundleRows().map((row) => row.line)).toEqual(BUNDLES.map((bundle) => bundle.line));
    expect(bundleRow({ ...bundleById("couple"), line: "a moved line" }).line).toBe("a moved line");
  });

  it("follows the catalogue, so a moved price moves every list", () => {
    const couple = bundleById("couple");
    expect(bundleRow({ ...couple, cents: couple.cents + 100 })).toMatchObject({
      price: "€55",
      singles: "3 Singles €72",
      save: "you save €17",
    });
  });

  it("shows no comparison where a launch price would save nothing, and never one on Single (ADR-146, 169)", () => {
    const couple = bundleById("couple");
    expect(bundleRow({ ...couple, cents: couple.fullCents })).toMatchObject({ launch: false, singles: null, save: null });
    expect(bundleRow({ ...bundleById("solo"), launch: true })).toMatchObject({ launch: false, singles: null, save: null });
  });

  it("prints no end date and no earlier price (ADR-169)", () => {
    for (const row of bundleRows()) {
      const words = [row.name, row.line, row.count, row.price, row.singles, row.save, ...row.mixes.map((mix) => mix.text)].join(" ");
      expect(words).not.toMatch(/\bwas\b|\buntil\b|\bends?\b|\boffer\b|\d{4}/i);
    }
  });
});

describe("TEST_CHECKOUT", () => {
  it("still buys 1, 3 or 5 credits, one button per bundle (ADR-138)", () => {
    expect(TEST_CHECKOUT).toEqual([1, 3, 5]);
    expect(TEST_CHECKOUT).toEqual(BUNDLES.map((bundle) => bundle.credits));
  });
});

describe("credit-loop's names", () => {
  it("are gone from what the credit surfaces print (pricing-and-launch, ADR-170)", () => {
    expect(Object.keys(view)).not.toContain("BUNDLES");
    const printed = [
      ...bundleRows().map((row) => row.name),
      ...[1, 3, 5].flatMap((added) => [pathView(added, added, NOTHING).title, pathView(added, added + 3, NOTHING).title]),
      ...pathSteps(5, NOTHING).flatMap((step) => [step.title, step.line]),
    ].join(" | ");
    for (const old of ["One report", "Someone and the two of you", "Your people and how you fit", "Your people, then how you fit", "orbit"]) {
      expect(printed).not.toContain(old);
    }
  });
});

describe("historyLine", () => {
  it("lets the kind carry the sign: bought and a gift add, spent takes away", () => {
    expect(historyLine({ kind: "bought", count: 3, label: "3 credits bought", test: false }))
      .toEqual({ amount: "+3", text: "3 credits bought", test: false });
    expect(historyLine({ kind: "gift", count: 1, label: "A gift from Alex", test: false }))
      .toEqual({ amount: "+1", text: "A gift from Alex", test: false });
    expect(historyLine({ kind: "spent", count: 1, label: "Gift to Pierre", test: false }))
      .toEqual({ amount: "−1", text: "Gift to Pierre", test: false });
  });

  it("adds a grant and the yearly plan's credit, and takes a refund away (ADR-275, ADR-276)", () => {
    expect(historyLine({ kind: "granted", count: 3, label: "From Stars Decoded", test: true }))
      .toEqual({ amount: "+3", text: "From Stars Decoded", test: false });
    expect(historyLine({ kind: "granted", count: 1, label: "With Timeline", test: false }))
      .toEqual({ amount: "+1", text: "With Timeline", test: false });
    expect(historyLine({ kind: "refunded", count: 2, label: "Refunded", test: false }))
      .toEqual({ amount: "−2", text: "Refunded", test: false });
  });

  it("marks a test bundle's line once, even when the label already says so (ADR-138)", () => {
    expect(historyLine({ kind: "bought", count: 5, label: "5 credits bought", test: true }).test).toBe(true);
    expect(historyLine({ kind: "bought", count: 5, label: "5 test credits", test: true }).test).toBe(false);
  });

  it("leaves a spend or a gift paid from a test credit unmarked, as reading 9 reads", () => {
    expect(historyLine({ kind: "spent", count: 1, label: "Beatrice", test: true }).test).toBe(false);
    expect(historyLine({ kind: "gift", count: 1, label: "A gift from Alex", test: true }).test).toBe(false);
  });

  it("still reads when the ledger sends no label", () => {
    expect(historyLine({ kind: "bought", count: 3, label: " ", test: true }).text).toBe("3 credits added");
    expect(historyLine({ kind: "spent", count: 1, label: "", test: false }).text).toBe("A report");
    expect(historyLine({ kind: "granted", count: 3, label: "", test: true }).text).toBe("From Stars Decoded");
    expect(historyLine({ kind: "refunded", count: 1, label: " ", test: false }).text).toBe("Refunded");
  });
});

describe("pathSteps", () => {
  it("3 on nothing: your chart, someone close, the two of you, one after another", () => {
    const steps = pathSteps(3, NOTHING);
    expect(steps.map((s) => [s.kind, s.title, s.credits, s.number, s.after])).toEqual([
      ["own", "Your own chart", 1, 1, null],
      ["people", "Someone close to you", 1, 2, 1],
      ["pairs", "The two of you", 1, 3, 2],
    ]);
    expect(steps.every((s) => !s.done)).toBe(true);
  });

  it("5 on nothing: your chart, two people, two Compatibility reports", () => {
    expect(pathSteps(5, NOTHING).map((s) => [s.title, s.line, s.credits])).toEqual([
      ["Your own chart", "Your circle starts with you.", 1],
      ["Two people close to you", "Add them yourself, one credit each.", 2],
      ["Two Compatibility reports", "You and each of them.", 2],
    ]);
    expect(planned(5, NOTHING)).toBe(5);
  });

  it("3 with your own chart written: ticks it, frees its credit, keeps one for whoever comes next", () => {
    const steps = pathSteps(3, { ownChart: true, people: [], pairs: 0 });
    expect(steps.map((s) => [s.title, s.done, s.number])).toEqual([
      ["Your own chart", true, null],
      ["Someone close to you", false, 1],
      ["The two of you", false, 2],
    ]);
    expect(steps[0].credits).toBe(0);
    expect(pathView(3, 3, { ownChart: true, people: [], pairs: 0 }).spare).toBe("One credit is left for someone else later.");
  });

  it("a top-up of 3 onto 3 plans the whole balance from what is written", () => {
    const have: PathHave = { ownChart: true, people: ["Beatrice"], pairs: 1 };
    expect(pathSteps(6, have).map((s) => [s.title, s.credits, s.done, s.after])).toEqual([
      ["Your own chart, Beatrice, the two of you", 0, true, null],
      ["Three more people close to you", 3, false, null],
      ["Three Compatibility reports", 3, false, 1],
    ]);
    expect(planned(6, have)).toBe(6);
  });

  it("a top-up of 3 onto 3 with nothing written yet starts from your own chart", () => {
    expect(titles(6, NOTHING)).toEqual(["Your own chart", "Two people close to you", "Two Compatibility reports"]);
    expect(pathView(3, 6, NOTHING).spare).toBe("One credit is left for someone else later.");
  });

  it("names up to two people and counts beyond, and never plans more than the balance", () => {
    expect(titles(3, { ownChart: true, people: ["Beatrice", "Marie"], pairs: 1 })[0])
      .toBe("Your own chart, Beatrice and Marie, one Compatibility report");
    expect(titles(3, { ownChart: true, people: ["Beatrice", "Marie", "George"], pairs: 2 })[0])
      .toBe("Your own chart, 3 people, 2 Compatibility reports");
    for (let balance = 0; balance <= 14; balance++) {
      for (const have of [NOTHING, { ownChart: true, people: ["Beatrice"], pairs: 0 }]) {
        expect(planned(balance, have)).toBeLessThanOrEqual(balance);
        expect(balance - planned(balance, have)).toBeLessThanOrEqual(1);
      }
    }
  });

  it("with nothing to spend plans nothing and only ticks what is there", () => {
    expect(pathSteps(0, NOTHING)).toEqual([]);
    expect(titles(0, { ownChart: true, people: [], pairs: 0 })).toEqual(["Your own chart"]);
  });
});

describe("pathView", () => {
  it("heads a first bundle by what it holds, a plan for several people by the catalogue's name for it", () => {
    expect(pathView(3, 3, NOTHING)).toMatchObject({ eyebrow: "3 credits added", title: "Here is one way to use them", line: null, spare: null });
    expect(pathView(5, 5, NOTHING)).toMatchObject({ eyebrow: "5 credits added", title: "Family & friends", line: null });
    expect(pathView(5, 5, { ownChart: true, people: [], pairs: 0 }).title).toBe(bundleById("family").name);
  });

  it("heads a top-up by the one balance", () => {
    expect(pathView(3, 6, { ownChart: true, people: ["Beatrice"], pairs: 1 })).toMatchObject({
      eyebrow: "3 more added · a top-up",
      title: "6 credits to use",
      line: "3 left from before, 3 just added: all in one balance.",
      spare: null,
    });
  });
});

describe("pathDue", () => {
  const bundle = (id: string, count: number) => ({ id, count, createdAt: "2026-09-26T10:00:00.000Z" });

  it("shows once per bundle of 3 or more while a credit is left to plan", () => {
    expect(pathDue(bundle("b1", 3), 3, [])).toBe(true);
    expect(pathDue(bundle("b1", 5), 1, [])).toBe(true);
    expect(pathDue(bundle("b1", 3), 3, ["b1"])).toBe(false);
    expect(pathDue(bundle("b1", 1), 1, [])).toBe(false);
    expect(pathDue(bundle("b1", 3), 0, [])).toBe(false);
    expect(pathDue(null, 3, [])).toBe(false);
    expect(pathDue(undefined, 3, [])).toBe(false);
  });
});

describe("the path's memory", () => {
  it("remembers bundle ids under one key, once each, the newest kept", () => {
    const store = memoryStore();
    expect(readPathSeen(store)).toEqual([]);
    markPathSeen("b1", store);
    markPathSeen("b2", store);
    markPathSeen("b1", store);
    expect(readPathSeen(store)).toEqual(["b2", "b1"]);
    expect(Object.keys(store.data)).toEqual([PATH_SEEN_KEY]);
    for (let i = 0; i < 30; i++) markPathSeen(`x${i}`, store);
    expect(readPathSeen(store)).toHaveLength(20);
    expect(readPathSeen(store).at(-1)).toBe("x29");
  });

  it("reads a damaged or missing value as nothing seen", () => {
    expect(readPathSeen(memoryStore({ [PATH_SEEN_KEY]: "{not json" }))).toEqual([]);
    expect(readPathSeen(memoryStore({ [PATH_SEEN_KEY]: '{"a":1}' }))).toEqual([]);
    expect(readPathSeen(memoryStore({ [PATH_SEEN_KEY]: '["b1", 2]' }))).toEqual(["b1"]);
    expect(readPathSeen(null)).toEqual([]);
  });
});

describe("pathHave", () => {
  const AT = "2026-09-20T10:00:00.000Z";
  const profile = (id: string, name: string, isSelf = false): OrbitProfile => ({ id, name, isSelf });
  const natal = (id: string, profileId: string, over: Partial<OrbitReport> = {}): OrbitReport => ({
    id, kind: "natal", status: "complete", profileId, createdAt: AT, access: "owner", ...over,
  });
  const pair = (id: string, a: string, b: string, over: Partial<OrbitReport> = {}): OrbitReport => ({
    id, kind: "compatibility", status: "complete", profileId: null,
    participants: [{ id: a, name: a }, { id: b, name: b }], createdAt: AT, access: "owner", ...over,
  });

  it("counts the reader's chart, the people on the orbit by first name, and the pairs with the reader", () => {
    const profiles = [profile("me", "Alex Moreau", true), profile("p1", "Beatrice York"), profile("p2", "Marie Curie")];
    const reports = [natal("r-me", "me"), natal("r-p1", "p1"), natal("r-p2", "p2", { status: "interpreting" }), pair("c1", "me", "p1")];
    expect(pathHave({ profiles, reports })).toEqual({ ownChart: true, people: ["Beatrice", "Marie"], pairs: 1 });
  });

  it("leaves out what failed, what was stopped, and a pair the reader is not in", () => {
    const profiles = [profile("me", "Alex", true), profile("p1", "Beatrice"), profile("p2", "Marie")];
    const reports = [
      natal("r-me", "me", { status: "failed" }),
      natal("r-p1", "p1"),
      natal("r-p2", "p2"),
      pair("c1", "me", "p1", { stoppedBy: "Beatrice" }),
      pair("c2", "p1", "p2"),
    ];
    expect(pathHave({ profiles, reports })).toEqual({ ownChart: false, people: ["Beatrice", "Marie"], pairs: 0 });
  });
});

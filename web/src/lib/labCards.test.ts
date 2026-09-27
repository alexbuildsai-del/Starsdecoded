import { describe, expect, it } from "vitest";
import { EMPTY_PICKS, blocksOf, groupOf, isJudged, nextCard, orderCards, tie, toggleBest, toggleNotShip, untie, wordsOf } from "./labCards";

const cards = [
  { id: "c1", index: 0, fixture: "marie-curie", section: "overview", judged: false },
  { id: "c2", index: 1, fixture: "day-angular", section: "career", judged: true },
  { id: "c3", index: 2, fixture: "marie-curie", section: "career", judged: false },
  { id: "c4", index: 3, fixture: "marie-curie", section: "superpowers", judged: false },
];

describe("the room's order", () => {
  it("reads career first, then the sections in room order, fixtures by stored index inside each", () => {
    expect(orderCards(cards).map((c) => c.id)).toEqual(["c2", "c3", "c1", "c4"]);
  });

  it("reopens on the first unjudged card, and on nothing once every card is judged", () => {
    expect(nextCard(cards)?.id).toBe("c3");
    expect(nextCard(cards.map((c) => ({ ...c, judged: true })))).toBeNull();
  });
});

describe("tie groups", () => {
  it("merges groups so A=B then B=C is one group of three, and ignores a self-tie", () => {
    let p = tie(EMPTY_PICKS, 0, 1);
    expect(p.same).toEqual([[0, 1]]);
    p = tie(p, 1, 2);
    expect(p.same).toEqual([[0, 1, 2]]);
    p = tie(p, 3, 4);
    expect(p.same).toEqual([[0, 1, 2], [3, 4]]);
    expect(tie(p, 2, 2)).toBe(p);
    expect(groupOf(p, 4)).toEqual([3, 4]);
    expect(groupOf(p, 5)).toBeNull();
  });

  it("untying a variant dissolves a group of one", () => {
    const p = untie(tie(tie(EMPTY_PICKS, 0, 1), 2, 3), 0);
    expect(p.same).toEqual([[2, 3]]);
  });

  it("best and would-not-ship exclude each other on a variant", () => {
    let p = toggleBest(EMPTY_PICKS, 1);
    p = toggleNotShip(p, 1);
    expect(p).toEqual({ best: [], notShip: [1], same: [] });
    p = toggleBest(p, 1);
    expect(p).toEqual({ best: [1], notShip: [], same: [] });
    expect(toggleBest(p, 1).best).toEqual([]);
  });

  it("a card is judged once anything is picked", () => {
    expect(isJudged(null)).toBe(false);
    expect(isJudged(EMPTY_PICKS)).toBe(false);
    expect(isJudged(tie(EMPTY_PICKS, 0, 1))).toBe(true);
    expect(isJudged(toggleNotShip(EMPTY_PICKS, 2))).toBe(true);
  });
});

describe("a section as blocks", () => {
  it("renders the prose in stored order, items as bullets, and leaves the claims out", () => {
    const blocks = blocksOf({
      vocationalPull: "You choose the slow problem.",
      actions: [{ action: "Ask one question early.", why: "so you stop guessing" }],
      superpower: { title: "Total focus", text: "You keep going." },
      claims: [{ quote: "x", evidence: [] }],
    });
    expect(blocks).toEqual([
      { kind: "heading", text: "Vocational pull" },
      { kind: "paragraph", text: "You choose the slow problem." },
      { kind: "bullet", text: "Ask one question early. so you stop guessing" },
      { kind: "heading", text: "Superpower" },
      { kind: "heading", text: "Total focus" },
      { kind: "paragraph", text: "You keep going." },
    ]);
    expect(wordsOf(blocks)).toBe(21);
  });
});

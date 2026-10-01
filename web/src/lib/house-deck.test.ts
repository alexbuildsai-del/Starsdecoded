/**
 * The readings are the sample's committed run (r06's own text) and every sign
 * comes from her chart, computed from the birth-data fixture at run time; the
 * lines expected are what that chart gives.
 */
import { describe, expect, it } from "vitest";
import { houseSign } from "@/components/chart/wheel-geometry";
import { SAMPLE, sampleChart } from "@/site/data/sample";
import {
  HOUSE_NUMBERS, houseLine, houseName, keyStep, nearestCard, splitReading, stepHouse, tickState,
} from "./house-deck";

const READINGS = SAMPLE.run.houses?.houses ?? [];
const reading = (house: number) => READINGS.find((r) => r.house === house)?.reading ?? "";
const signOf = (house: number) => houseSign(house, sampleChart().angles!.ascendant.absoluteDegree);

describe("index", () => {
  it("lights the house being read and fills the ticks before it", () => {
    expect(HOUSE_NUMBERS.map((t) => tickState(t, 4))).toEqual([
      "seen", "seen", "seen", "on", "ahead", "ahead", "ahead", "ahead", "ahead", "ahead", "ahead", "ahead",
    ]);
    expect(HOUSE_NUMBERS.filter((t) => tickState(t, 1) === "seen")).toEqual([]);
    expect(HOUSE_NUMBERS.filter((t) => tickState(t, 12) === "ahead")).toEqual([]);
  });

  it("prints a house with its word, and the bar adds the sign the chart puts there", () => {
    expect(houseName(3)).toBe("3rd house · Mind");
    expect(houseLine(4, signOf(4))).toBe("4th house · Home · Taurus");
    expect(houseLine(1, signOf(1))).toBe("1st house · Self · Aquarius");
    expect(houseLine(12, signOf(12))).toBe("12th house · Solitude · Capricorn");
  });
});

describe("wrap", () => {
  it("steps round the wheel both ways", () => {
    expect(stepHouse(4, 1)).toBe(5);
    expect(stepHouse(4, -1)).toBe(3);
    expect(stepHouse(12, 1)).toBe(1);
    expect(stepHouse(1, -1)).toBe(12);
  });

  it("comes back to the same house after twelve steps either way", () => {
    let house = 7;
    for (let i = 0; i < 12; i++) house = stepHouse(house, 1);
    expect(house).toBe(7);
    for (let i = 0; i < 12; i++) house = stepHouse(house, -1);
    expect(house).toBe(7);
  });

  it("steps on the two arrow keys and nothing else", () => {
    expect(keyStep("ArrowRight")).toBe(1);
    expect(keyStep("ArrowLeft")).toBe(-1);
    for (const key of ["ArrowUp", "ArrowDown", "Enter", " ", "Tab", "a"]) expect(keyStep(key)).toBe(0);
  });
});

describe("swipe", () => {
  // The deck at 390 px: a 350 px column, each card 44 px narrower than it, 10 px apart.
  const view = 350;
  const width = view - 44;
  const pitch = width + 10;
  const cards = HOUSE_NUMBERS.map((_, i) => ({ left: i * pitch, width }));
  const end = cards[11].left + width - view;

  it("settles on the 1st card at rest and on the next after each swipe", () => {
    expect(nearestCard(0, view, cards)).toBe(0);
    // Centred, as scroll-snap leaves a card.
    for (let i = 1; i < 11; i++) expect(nearestCard(cards[i].left + width / 2 - view / 2, view, cards)).toBe(i);
    expect(nearestCard(end, view, cards)).toBe(11);
  });

  it("keeps the card until the swipe passes halfway to the next one", () => {
    const centred = cards[3].left + width / 2 - view / 2;
    expect(nearestCard(centred + pitch * 0.45, view, cards)).toBe(3);
    expect(nearestCard(centred + pitch * 0.55, view, cards)).toBe(4);
    expect(nearestCard(centred - pitch * 0.55, view, cards)).toBe(2);
  });

  it("has nothing to settle on with no cards", () => {
    expect(nearestCard(0, view, [])).toBe(-1);
  });
});

describe("first sentence", () => {
  it("leads with the first sentence and keeps the Behaviour check apart", () => {
    expect(splitReading(reading(4))).toEqual({
      lead: "Sun, Jupiter, and the North Node here make you organise life around a protected inner base, and you get restless when your private world is unstable.",
      rest: "You prefer to build comfort slowly and keep it consistent. With Venus ruling, you show love through the environment you curate and the routines you maintain.",
      check: "Do you tidy, cook, or rearrange to regain emotional steadiness?",
    });
  });

  it("loses no word of any stored reading", () => {
    expect(READINGS).toHaveLength(12);
    for (const r of READINGS) {
      const { lead, rest, check } = splitReading(r.reading);
      expect(lead, `house ${r.house}`).toMatch(/[.!?]$/);
      expect(check, `house ${r.house}`).not.toBeNull();
      expect(`${[lead, rest].filter(Boolean).join(" ")} Behaviour check: ${check}`).toBe(r.reading.replace(/\s+/g, " ").trim());
    }
  });

  it("carries a closing quote with its sentence", () => {
    const { lead, rest } = splitReading(reading(5));
    expect(lead).toBe("Mercury here makes play feel mental, and you flirt through wit, timing, and the right detail.");
    expect(rest.endsWith("if it is not “useful.”")).toBe(true);
  });

  it("reads the US spelling, a dash or a capitalised label as the check", () => {
    const body = reading(1).slice(0, reading(1).indexOf("Behaviour check:"));
    const check = "This week, do you cancel plans to regain control of your time?";
    for (const label of ["Behavior check:", "Behaviour check –", "BEHAVIOUR CHECK:"]) {
      expect(splitReading(`${body}${label} ${check}`).check).toBe(check);
    }
  });

  it("keeps a reading with no check whole, and a one-sentence reading has no rest", () => {
    const body = reading(1).slice(0, reading(1).indexOf("Behaviour check:")).trim();
    const whole = splitReading(body);
    expect(whole.check).toBeNull();
    expect(`${whole.lead} ${whole.rest}`).toBe(body);

    const first = splitReading(reading(2)).lead;
    expect(splitReading(`${first} Behaviour check: Do your purchases track your feelings more than your plans?`)).toEqual({
      lead: first,
      rest: "",
      check: "Do your purchases track your feelings more than your plans?",
    });
  });

  it("runs on through a decimal or an initialism, and reads clean through the prose guard", () => {
    expect(splitReading("You give it 2.5 hours. Then you stop.").lead).toBe("You give it 2.5 hours.");
    expect(splitReading("You left the U.S. early and kept going. Then you stopped.").lead).toBe("You left the U.S. early and kept going.");
    expect(splitReading(`**${reading(4)}**`).lead.startsWith("Sun, Jupiter, and the North Node")).toBe(true);
  });
});

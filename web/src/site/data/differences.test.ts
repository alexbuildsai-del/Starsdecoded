/**
 * The band says only what is so: every line it quotes is the sample's stored run, word for word, where her report
 * prints it (ADR-18); every situation it names is a scene the pair prompts play out; and it quotes no pair until a
 * sample pair's run is committed (MB-93).
 */
import { describe, expect, it } from "vitest";
import { PAIR_CHAPTER_TITLES } from "@/lib/lenses";
import { isItemKey } from "@/lib/workbook";
import { BAND_LENS, DIFFERENCES, SCENES, SITUATIONS, sceneRows } from "./differences";
import { SAMPLE_PAIRS, samplePerson } from "./people";
import { SAMPLE } from "./sample";

const run = SAMPLE.run;
const houseTwo = run.houses?.houses.find((h) => h.house === 2)?.reading ?? "";

// The fixed scenes the pair prompts write, chapters 02 to 06, as R12-12 sets them (ADR-176) and the round's plan lists them.
const PROMPT_SCENES = {
  partners: ["The end of a long day", "The argument at 11 pm", "The bill nobody expected", "The weekend away", "The job offer in another city"],
  people: ["The big dinner", "The project with the deadline", "The weekend away", "Money between you", "The favour too big to ask"],
};

describe("A personality report, not a horoscope", () => {
  it("quotes the first sentence of her second house's reading, word for word", () => {
    expect(DIFFERENCES.line).toBe("You spend to soothe, and you save to feel safe.");
    expect(houseTwo.startsWith(`${DIFFERENCES.line} `)).toBe(true);
  });

  it("quotes that reading's own Behaviour check, which closes it", () => {
    expect(DIFFERENCES.check).toBe("Do your purchases track your feelings more than your plans?");
    expect(houseTwo.endsWith(`Behaviour check: ${DIFFERENCES.check}`)).toBe(true);
  });

  it("lists two of the Closing's Practice items with their own whys, under the keys her report ticks them by", () => {
    const bullets = run.focus?.practice.bullets ?? [];
    expect(DIFFERENCES.practice).toHaveLength(2);
    expect(new Set(DIFFERENCES.practice.map((item) => item.key)).size).toBe(2);
    for (const item of DIFFERENCES.practice) {
      const match = /^focus\.practice\.bullets\.(\d+)$/.exec(item.key);
      expect(match, item.key).not.toBeNull();
      expect(isItemKey(item.key)).toBe(true);
      expect(bullets[Number(match![1])]).toEqual({ point: item.action, why: item.why });
    }
  });

  it("opens Practice on the money item, the one that answers the line", () => {
    expect(DIFFERENCES.practice[0].action).toBe(
      "Put money into what makes you feel settled, not what proves something: repairs, savings, privacy, rest.",
    );
  });
});

describe("Your circle starts with you", () => {
  it("quotes no pair while no sample pair's run is committed", () => {
    expect(DIFFERENCES.pair).toBeNull();
  });

  it("copies the pair prompts' scenes, chapter by chapter", () => {
    expect(SCENES).toEqual(PROMPT_SCENES);
  });

  it("names only scenes its lens plays out, each once", () => {
    expect(SITUATIONS.length).toBeGreaterThan(0);
    expect(new Set(SITUATIONS).size).toBe(SITUATIONS.length);
    for (const scene of SITUATIONS) expect(PROMPT_SCENES[BAND_LENS]).toContain(scene);
  });

  it("sets each situation beside the chapter that plays it out, in the report's order", () => {
    const titles = PAIR_CHAPTER_TITLES(BAND_LENS);
    const rows = sceneRows();
    expect(rows.map((row) => row.scene)).toEqual([...SITUATIONS]);
    for (const row of rows) {
      expect(row.n).toBeGreaterThanOrEqual(2);
      expect(row.n).toBeLessThanOrEqual(6);
      expect(PROMPT_SCENES[BAND_LENS][row.n - 2]).toBe(row.scene);
      expect(titles[row.n - 1]).toBe(row.chapter);
    }
    expect(rows.map((row) => row.n)).toEqual([...rows.map((row) => row.n)].sort((x, y) => x - y));
  });

  it("refuses a situation its lens never plays out", () => {
    expect(() => sceneRows("partners", ["The big dinner"])).toThrow();
  });

  it("draws the lens on the sample account's owner and the person it is about", () => {
    const [a, b] = SAMPLE_PAIRS[BAND_LENS];
    expect(samplePerson(a)?.relation).toBe("self");
    expect(samplePerson(b)?.relation).toBe("partner");
  });
});

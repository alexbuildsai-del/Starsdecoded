/**
 * The sample is only as true as its sources: the committed run is r06's
 * text, her chart is the engine's, the chart the run cites is the chart the
 * page draws, and every claim /sample prints is marked where the reader meets
 * it.
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { calculateNatalChart } from "@workspace/engine";
import { CHAPTERS, type ChapterSection } from "@/lib/chapters";
import { TRADITIONAL_RULER } from "@/lib/house-rulers";
import { isCurrentInterpretation, isDrawn, type Claim, type EvidenceRef } from "@/types/chart";
import { toChartData } from "@/site/lib/chart";
import { HOME_CLAIMS, homeClaims } from "./claims";
import {
  CLAIMS_OF, CLAIM_SECTIONS, DIMMED_LINES, OPEN_CHAPTERS, SAMPLE, chapterTexts, claimById, isOpenChapter, markedClaims,
  printedParagraphs, quoteNeedle, sampleChart, sampleTexts, type ClaimSection,
} from "./sample";
import fixture from "../../../../fixtures/charts/audrey-hepburn.json";

const SECTIONS: ClaimSection[] = ["overview", "triad", "mind", "career", "money", "relationships", "family", "superpowers", "discoveries", "focus"];

const storedClaims = (): Claim[] => SECTIONS.flatMap((s) => SAMPLE.run[s]?.claims ?? []);

describe("the committed run", () => {
  it("is r06's interpretation, less its foundation and usage", () => {
    // sha256 of JSON.stringify(interpretation) in fixtures/reports/audrey-hepburn.r06.json on report-lab/r06
    // (ec4c839), with `foundation` and `meta.usage` deleted: any edit to a sentence or a claim changes it.
    const digest = createHash("sha256").update(JSON.stringify(SAMPLE.run)).digest("hex");
    expect(digest).toBe("8d318a48d826db4e73d351daa6717cb70a1f74629ed9fb6c54f6c091d5f2f3a6");
    expect(SAMPLE.run).not.toHaveProperty("foundation");
    expect(SAMPLE.run.meta).not.toHaveProperty("usage");
    expect(SAMPLE.run).not.toHaveProperty("chart");
    expect(SAMPLE.run).not.toHaveProperty("fixture");
  });

  it("renders on the report page as it was stored", () => {
    expect(isCurrentInterpretation(SAMPLE.run)).toBe(true);
    expect(SAMPLE.generatedAt).toBe(SAMPLE.run.meta.generatedAt);
    expect(Number.isNaN(Date.parse(SAMPLE.generatedAt))).toBe(false);
    expect(storedClaims()).toHaveLength(63);
  });
});

describe("her chart", () => {
  it("is the engine's, from the birth-data fixture", () => {
    const natal = calculateNatalChart(fixture.birthDate, fixture.birthTime, fixture.latitude, fixture.longitude, fixture.timezone, 0);
    expect(sampleChart()).toEqual(toChartData(natal));
    expect(SAMPLE.name).toBe(fixture.name);
  });

  it("names her birthplace and her record's source as the fixture records them", () => {
    expect(fixture.note).toContain(SAMPLE.place);
    expect(fixture.note).toContain(SAMPLE.source);
  });

  it("has the fixtures' Sun, Moon and rising to the hundredth", () => {
    const chart = sampleChart();
    expect(chart.planets.sun).toMatchObject({ sign: "Taurus" });
    expect(chart.planets.sun.degree).toBeCloseTo(13.12, 2);
    expect(chart.planets.moon).toMatchObject({ sign: "Pisces" });
    expect(chart.planets.moon.degree).toBeCloseTo(6.45, 2);
    expect(chart.angles?.ascendant.sign).toBe("Aquarius");
    expect(chart.angles?.ascendant.degree).toBeCloseTo(28.62, 2);
  });

  it("is the night chart the run was written for", () => {
    const chart = sampleChart();
    expect(chart.sunAltitude).toBe(SAMPLE.run.meta.sunAltitude);
    expect(chart.sunAltitude).toBeLessThan(0);
    expect(SAMPLE.run.meta.sect).toBe("night");
  });
});

const PLACEMENT = /^(.+?) (\d+\.\d)° ([A-Z][a-z]+)(?:, (\d+)(?:st|nd|rd|th) house)?$/;
const ANGLE = /^(Ascendant|Midheaven) · (\d+\.\d)° ([A-Z][a-z]+)$/;

/** The degree, sign and house a placement label names, checked against the computed chart. */
function placementHolds(ref: EvidenceRef, label: string): void {
  const chart = sampleChart();
  const body = chart.planets[String(ref.body)];
  const m = PLACEMENT.exec(label);
  expect(m, label).not.toBeNull();
  const [, , degree, sign, house] = m!;
  expect(body.degree.toFixed(1), label).toBe(degree);
  expect(body.sign, label).toBe(sign);
  expect(ref.sign, label).toBe(sign.toLowerCase());
  if (house) {
    expect(body.house, label).toBe(Number(house));
    expect(ref.house, label).toBe(Number(house));
  }
}

function angleHolds(ref: EvidenceRef, label: string): void {
  const angles = sampleChart().angles!;
  const angle = angles[String(ref.angle) as keyof typeof angles];
  const m = ANGLE.exec(label);
  expect(m, label).not.toBeNull();
  expect(angle.degree.toFixed(1), label).toBe(m![2]);
  expect(angle.sign, label).toBe(m![3]);
}

describe("the chart the run cites is the chart the page draws", () => {
  const evidence = storedClaims().flatMap((c) => c.evidence);

  it("names every placement at the computed degree, sign and house", () => {
    const placements = evidence.filter((e) => e.ref.kind === "placement");
    expect(placements.length).toBeGreaterThan(0);
    for (const e of placements) placementHolds(e.ref, e.label);
  });

  it("names every angle at the computed degree", () => {
    for (const e of evidence.filter((x) => x.ref.kind === "angle")) angleHolds(e.ref, e.label);
  });

  it("names only aspects the engine finds, at their orb", () => {
    const { aspects } = sampleChart();
    for (const e of evidence.filter((x) => x.ref.kind === "aspect")) {
      const pair = [String(e.ref.body1), String(e.ref.body2)].sort().join(" ");
      const found = aspects.find((a) => a.type === e.ref.type && [a.planet1, a.planet2].sort().join(" ") === pair);
      expect(found, e.label).toBeDefined();
      expect(found!.orb.toFixed(1), e.label).toBe(Number(e.ref.orb).toFixed(1));
    }
  });

  it("names each ruler of the house it rules, where it sits", () => {
    const chart = sampleChart();
    if (!isDrawn(chart)) throw new Error("her chart has a horizon");
    for (const e of evidence.filter((x) => x.ref.kind === "ruler")) {
      const ruler = chart.planets[String(e.ref.ruler)];
      expect(TRADITIONAL_RULER[chart.houses[String(e.ref.house)].sign], e.label).toBe(e.ref.ruler);
      expect(ruler.sign.toLowerCase(), e.label).toBe(e.ref.rulerSign);
      expect(ruler.house, e.label).toBe(e.ref.rulerHouse);
    }
  });
});

/** Each claim section's own prose, the triad's three passages included, which no chapter prints any more (reading 9). */
function writtenTexts(section: ClaimSection): string[] {
  if (section !== "triad") return chapterTexts(CHAPTERS.find((c) => CLAIMS_OF[c.section] === section)!.section);
  const t = SAMPLE.run.triad;
  return t ? [t.sun.text, t.moon.text, ...(t.rising ? [t.rising.text] : [])] : [];
}

const printedIn = (section: ChapterSection) => sampleTexts(section).flatMap(printedParagraphs);

describe("the run as written", () => {
  it("quotes every one of its 63 claims from its own section's prose, the triad's too", () => {
    for (const section of SECTIONS) {
      const paragraphs = writtenTexts(section).flatMap(printedParagraphs);
      for (const claim of SAMPLE.run[section]?.claims ?? []) {
        expect(paragraphs.some((p) => p.includes(quoteNeedle(claim))), `${section}: ${claim.quote}`).toBe(true);
      }
    }
    expect(CLAIM_SECTIONS).toEqual(SECTIONS);
  });

  it("finds a claim by its address, printed on /sample or not", () => {
    expect(claimById("triad.5")?.claim).toBe(SAMPLE.run.triad?.claims[5]);
    expect(claimById("focus.2")).toMatchObject({ id: "focus.2", section: "focus", claim: SAMPLE.run.focus?.claims[2] });
    for (const id of ["nowhere.0", "houses.0", "triad.99", "triad", "triad.1.2", "triad.x", "overview.-1"]) expect(claimById(id), id).toBeUndefined();
  });
});

describe("what /sample prints (ADR-178)", () => {
  it("opens the artifact's four chapters whole and gives each of the other six one line", () => {
    expect(OPEN_CHAPTERS).toEqual(["overview", "houses", "superpowers", "discoveries"]);
    const dimmed = CHAPTERS.map((c) => c.section).filter((s) => !isOpenChapter(s));
    expect(Object.keys(DIMMED_LINES).sort()).toEqual([...dimmed].sort());
    for (const line of Object.values(DIMMED_LINES)) expect(line.trim()).not.toBe("");
    for (const section of OPEN_CHAPTERS) expect(sampleTexts(section)).toEqual(chapterTexts(section));
  });

  it("prints a dimmed chapter's first paragraph and nothing after it", () => {
    for (const c of CHAPTERS.filter((x) => !isOpenChapter(x.section))) {
      const texts = sampleTexts(c.section);
      expect(texts, c.section).toHaveLength(1);
      expect(printedParagraphs(texts[0])).toEqual([printedParagraphs(chapterTexts(c.section)[0])[0]]);
    }
  });

  it("prints chapter 2 as its twelve house readings, with no triad passage (reading 9)", () => {
    const readings = SAMPLE.run.houses?.houses ?? [];
    expect(readings.map((h) => h.house)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(sampleTexts("houses")).toEqual(readings.map((h) => h.reading));
    const triad = writtenTexts("triad").flatMap(printedParagraphs);
    for (const p of printedIn("houses")) expect(triad).not.toContain(p);
  });
});

describe("markedClaims", () => {
  it("marks every claim the page prints, each once, and no other", () => {
    const order = markedClaims();
    const printed = CHAPTERS.flatMap((c) => printedIn(c.section));
    const shown = SECTIONS.flatMap((s) =>
      (SAMPLE.run[s]?.claims ?? []).flatMap((claim, k) => (printed.some((p) => p.includes(quoteNeedle(claim))) ? [`${s}.${k}`] : [])),
    );
    expect(order.map((c) => c.id).sort()).toEqual([...shown].sort());
    expect(new Set(order.map((c) => c.id)).size).toBe(order.length);
    for (const c of order) {
      const [section, index] = c.id.split(".");
      expect(SAMPLE.run[section as ClaimSection]?.claims[Number(index)]).toBe(c.claim);
      expect(c.section).toBe(section);
      expect(CLAIMS_OF[CHAPTERS[c.chapter - 1].section]).toBe(c.section);
    }
  });

  it("counts what the page prints: four chapters whole and six first paragraphs, no longer all 63", () => {
    const counts = CHAPTERS.map((_, i) => markedClaims().filter((c) => c.chapter === i + 1).length);
    expect(counts).toEqual([7, 0, 2, 2, 1, 3, 2, 6, 6, 0]);
    expect(markedClaims()).toHaveLength(29);
  });

  it("marks no triad claim, in chapter 2 or anywhere (reading 9)", () => {
    expect(markedClaims().filter((c) => c.section === "triad" || c.chapter === 2)).toEqual([]);
    expect(CLAIMS_OF.houses).toBeNull();
  });

  it("numbers the marks from 1 in each chapter", () => {
    const order = markedClaims();
    for (let i = 0; i < order.length; i++) {
      const prev = order[i - 1];
      expect(order[i].n).toBe(prev && prev.chapter === order[i].chapter ? prev.n + 1 : 1);
    }
  });

  it("puts each mark after the one before it in the chapter's printed text", () => {
    const order = markedClaims();
    for (const [i, c] of CHAPTERS.entries()) {
      const paragraphs = printedIn(c.section);
      const at = order
        .filter((x) => x.chapter === i + 1)
        .map((x) => {
          const p = paragraphs.findIndex((t) => t.includes(quoteNeedle(x.claim)));
          expect(p, x.id).toBeGreaterThanOrEqual(0);
          return p * 1e6 + paragraphs[p].indexOf(quoteNeedle(x.claim));
        });
      expect(at).toEqual([...at].sort((a, b) => a - b));
    }
  });

  it("reads each chapter's claims in the order /sample prints them", () => {
    const indices = (section: ClaimSection) => markedClaims().filter((c) => c.section === section).map((c) => Number(c.id.split(".")[1]));
    expect(indices("overview")).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(indices("superpowers")).toEqual([0, 1, 2, 3, 4, 5]);
    expect(indices("discoveries")).toEqual([0, 1, 2, 3, 4, 5]);
    expect(indices("relationships")).toEqual([0, 1, 2]);
    expect(indices("focus")).toEqual([]);
  });

  it("hands every caller its own array", () => {
    markedClaims().reverse();
    expect(markedClaims()[0].id).toBe("overview.0");
  });
});

describe("HOME_CLAIMS", () => {
  it("are the artifact's four, word for word from the run", () => {
    expect(homeClaims().map((c) => c.claim.quote)).toEqual([
      "You carry yourself like someone who can handle a lot alone, and you may disappear to recover instead of asking for help.",
      "You think in quick, clean sentences, and you can make a message land without raising your voice.",
      "Put money into what makes you feel settled, not what proves something: repairs, savings, privacy, rest.",
      "Watch the moment duty expands to fill the whole day, then name what is optional and cut it.",
    ]);
    expect(new Set(HOME_CLAIMS.map((h) => h.claimId)).size).toBe(4);
  });

  it("each end on a body or angle the chart has at the degree the claim's evidence names", () => {
    const chart = sampleChart();
    for (const h of homeClaims()) {
      const { kind, key } = h.target;
      const e = h.claim.evidence.find((x) => (kind === "body" ? x.ref.kind === "placement" && x.ref.body === key : x.ref.kind === "angle" && x.ref.angle === key));
      expect(e, `${h.claimId} cites no ${kind} ${key}`).toBeDefined();
      if (kind === "body") {
        expect(chart.planets[key], key).toBeDefined();
        placementHolds(e!.ref, e!.label);
      } else {
        angleHolds(e!.ref, e!.label);
      }
    }
  });
});

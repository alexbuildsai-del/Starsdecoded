/**
 * The sample is only as true as its sources: the committed run is r06's
 * text, her chart is the engine's, the chart the run cites is the chart the
 * page draws, and every claim lands where the reader meets it.
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { calculateNatalChart } from "@workspace/engine";
import { CHAPTERS } from "@/lib/chapters";
import { TRADITIONAL_RULER } from "@/lib/house-rulers";
import { isCurrentInterpretation, isDrawn, type Claim, type EvidenceRef } from "@/types/chart";
import { toChartData } from "@/site/lib/chart";
import { HOME_CLAIMS, homeClaims } from "./claims";
import { SAMPLE, chapterTexts, claimById, claimsInReadingOrder, printedParagraphs, quoteNeedle, sampleChart, type ClaimSection } from "./sample";
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

describe("claimsInReadingOrder", () => {
  it("anchors all 63 claims, each once", () => {
    const order = claimsInReadingOrder();
    expect(order).toHaveLength(63);
    expect(new Set(order.map((c) => c.id)).size).toBe(63);
    expect(new Set(order.map((c) => c.claim))).toEqual(new Set(storedClaims()));
    for (const c of order) {
      const [section, index] = c.id.split(".");
      expect(SAMPLE.run[section as ClaimSection]?.claims[Number(index)]).toBe(c.claim);
      expect(c.section).toBe(section);
    }
  });

  it("runs in the report page's chapter order, the triad's claims in chapter 2", () => {
    const order = claimsInReadingOrder();
    const chapters = [...new Set(order.map((c) => c.chapter))];
    expect(chapters).toEqual(CHAPTERS.map((_, i) => i + 1));
    expect([...new Set(order.map((c) => c.section))]).toEqual(SECTIONS);
    expect(order.find((c) => c.chapter === 2)?.section).toBe("triad");
    for (const c of order) expect(CHAPTERS[c.chapter - 1].section).toBe(c.section === "triad" ? "houses" : c.section);
  });

  it("numbers the marks from 1 in each chapter", () => {
    const order = claimsInReadingOrder();
    for (let i = 0; i < order.length; i++) {
      const prev = order[i - 1];
      expect(order[i].n).toBe(prev && prev.chapter === order[i].chapter ? prev.n + 1 : 1);
    }
  });

  it("puts each mark after the one before it in the chapter's printed text", () => {
    const order = claimsInReadingOrder();
    for (const [i, c] of CHAPTERS.entries()) {
      const paragraphs = chapterTexts(c.section).flatMap(printedParagraphs);
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

  it("reads the closing's claims after the three lists, as /sample prints the chapter", () => {
    const indices = (section: ClaimSection) => claimsInReadingOrder().filter((c) => c.section === section).map((c) => Number(c.id.split(".")[1]));
    expect(indices("overview")).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(indices("triad")).toEqual([0, 1, 2, 3, 4, 5]);
    expect(indices("focus")).toEqual([0, 1, 3, 4, 5, 6, 2]);
  });

  it("hands every caller its own array", () => {
    claimsInReadingOrder().reverse();
    expect(claimsInReadingOrder()[0].id).toBe("overview.0");
    expect(claimById("focus.2")?.n).toBe(7);
    expect(claimById("nowhere.0")).toBeUndefined();
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

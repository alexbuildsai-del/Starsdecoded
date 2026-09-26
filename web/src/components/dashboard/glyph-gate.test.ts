import { readdirSync, readFileSync } from "node:fs";
import { basename, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * The orbit is not a chart and the card shows bodies as renders, so no
 * Unicode planet or sign glyph is drawn anywhere on the dashboard (ADR-89 to
 * 96, MASTERFILE §9, dashboard-sky acceptance 3). Written by code point, so
 * this file holds none of them itself.
 */
const GLYPHS = [
  { name: "sun with rays", from: 0x2600, to: 0x2600 },
  { name: "sun", from: 0x2609, to: 0x2609 },
  { name: "lunar node", from: 0x260a, to: 0x260b },
  { name: "sun, moon or planet", from: 0x263c, to: 0x2647 },
  { name: "zodiac sign", from: 0x2648, to: 0x2653 },
  { name: "asteroid or Lilith", from: 0x26b3, to: 0x26b8 },
  { name: "Ophiuchus", from: 0x26ce, to: 0x26ce },
  { name: "Pluto form or Uranian point", from: 0x2bd3, to: 0x2be7 },
  { name: "Eris or Sedna", from: 0x2bf0, to: 0x2bf2 },
  { name: "moon or sun emoji", from: 0x1f311, to: 0x1f31e },
  { name: "dwarf planet", from: 0x1f77b, to: 0x1f77f },
  { name: "ringed planet", from: 0x1fa90, to: 0x1fa90 },
] as const;

// A glyph written as a JS or HTML escape renders all the same.
const ESCAPE = /\\u\{([0-9a-f]+)\}|\\u([0-9a-f]{4})|&#x([0-9a-f]+);|&#(\d+);/gi;

const DASHBOARD = fileURLToPath(new URL(".", import.meta.url));
const PAGE = fileURLToPath(new URL("../../pages/DashboardPage.tsx", import.meta.url));
const WEB_SRC = fileURLToPath(new URL("../..", import.meta.url));

function glyphName(codePoint: number): string | null {
  return GLYPHS.find((g) => codePoint >= g.from && codePoint <= g.to)?.name ?? null;
}

function codePoints(line: string): number[] {
  const found = Array.from(line, (ch) => ch.codePointAt(0) ?? 0);
  for (const m of line.matchAll(ESCAPE)) {
    found.push(m[4] !== undefined ? Number(m[4]) : parseInt(m[1] ?? m[2] ?? m[3] ?? "", 16));
  }
  return found;
}

function offences(text: string, where = ""): string[] {
  return text.split("\n").flatMap((line, i) =>
    codePoints(line).flatMap((cp) => {
      const name = glyphName(cp);
      return name ? [`${where}:${i + 1} U+${cp.toString(16).toUpperCase()} (${name})`] : [];
    }),
  );
}

/** What the dashboard renders: every source and style file under components/dashboard, and the page. Tests render nothing. */
function dashboardFiles(): string[] {
  const files = readdirSync(DASHBOARD, { recursive: true, encoding: "utf8" })
    .map((file) => join(DASHBOARD, file))
    .filter((file) => /\.(tsx?|css)$/.test(file) && !/\.test\.tsx?$/.test(file));
  return [...files, PAGE];
}

describe("the dashboard's glyph gate", () => {
  it("catches a glyph however it is written", () => {
    const sun = String.fromCodePoint(0x2609);
    const leo = String.fromCodePoint(0x264c);
    expect(offences(`<span>${sun} Leo</span>`)).toHaveLength(1);
    expect(offences(`const moon = "\\u263D";`)).toEqual([":1 U+263D (sun, moon or planet)"]);
    expect(offences(`label: "\\u{1FA90}"`)).toHaveLength(1);
    expect(offences(`<b>&#x2648;</b>\n<i>&#9800;</i>${leo}`)).toHaveLength(3);
  });

  it("lets the card's own marks through", () => {
    expect(offences("16.44° Leo · 7th (partnership) › Joined ✓ ↥ Send to Beatrice")).toEqual([]);
  });

  it("reads the orbit, the card and the page", () => {
    const names = dashboardFiles().map((file) => basename(file));
    expect(names).toEqual(expect.arrayContaining(["DashboardPage.tsx", "Orbit.tsx", "SkyCard.tsx", "CardSections.tsx", "orbit.css"]));
  });

  it("finds no planet or sign glyph on the dashboard", () => {
    const found = dashboardFiles().flatMap((file) => offences(readFileSync(file, "utf8"), relative(WEB_SRC, file)));
    expect(found).toEqual([]);
  });
});

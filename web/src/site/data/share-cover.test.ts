import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { localParts, placeForZone, skyAt } from "@workspace/engine";
import { latLngLine, sunLine } from "@/lib/sky-now";
import { BODIES } from "@/site/lib/sky";
import { headFor } from "../head";
import { SHARE_COVER } from "./share-cover";

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const at = new Date(SHARE_COVER.at);
/** The home page's default place: the engine's city for no zone at all (ADR-107). */
const home = placeForZone();
const sky = skyAt(at, home);
/** The cover records each degree to the hundredth, so the engine's own is never more than half of one away. */
const HALF_A_HUNDREDTH = 0.005 + 1e-9;

/** Width and height from a JPEG's start-of-frame segment, or null when the bytes are not a JPEG. */
function jpegSize(bytes: Buffer): { width: number; height: number } | null {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  for (let at = 2; at + 9 < bytes.length; at += 2 + bytes.readUInt16BE(at + 2)) {
    if (bytes[at] !== 0xff) return null;
    const marker = bytes[at + 1];
    // C4, C8 and CC share the range but are tables, not frames.
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return { width: bytes.readUInt16BE(at + 7), height: bytes.readUInt16BE(at + 5) };
    }
  }
  return null;
}

describe("the share cover (reading 15)", () => {
  it("was drawn for one whole minute over London, the home page's place", () => {
    expect(home.city).toBe("London");
    expect(at.toISOString()).toBe(SHARE_COVER.at);
    expect(at.getTime() % 60_000).toBe(0);
    expect(SHARE_COVER.place).toEqual({ city: home.city, zone: home.zone, lat: home.lat, lon: home.lon });
  });

  it("stamps that minute on London's clock, the place, the houses and the Sun's height, and never says Live", () => {
    const { date, time } = localParts(at, home.zone);
    const [year, month, day] = date.split("-").map(Number);
    expect(SHARE_COVER.corners).toEqual({
      tl: `THE SKY · ${day} ${MONTHS[month - 1]} ${year} · ${time}`,
      tr: `OVER LONDON · ${latLngLine(home.lat, home.lon)}`,
      bl: "WHOLE SIGN · TROPICAL",
      br: sunLine(sky),
    });
    for (const line of Object.values(SHARE_COVER.corners)) expect(line).not.toMatch(/live/i);
  });

  it("holds every body, the Ascendant and the Midheaven to skyAt's degree for that minute and place", () => {
    const engine: Record<string, number | undefined> = {
      ...Object.fromEntries(BODIES.map((body) => [body, sky.planets[body].absoluteDegree])),
      ascendant: sky.angles?.ascendant.absoluteDegree,
      midheaven: sky.angles?.midheaven.absoluteDegree,
    };
    expect(Object.keys(SHARE_COVER.degrees).sort()).toEqual(Object.keys(engine).sort());
    for (const [key, drawn] of Object.entries(SHARE_COVER.degrees)) {
      expect(Math.abs((engine[key] ?? Number.NaN) - drawn), key).toBeLessThanOrEqual(HALF_A_HUNDREDTH);
    }
  });

  it("is the 1200 × 630 JPEG under 150 KB that the head names", () => {
    const image = readFileSync(fileURLToPath(new URL(`../../../public${SHARE_COVER.image}`, import.meta.url)));
    expect(jpegSize(image)).toEqual({ width: 1200, height: 630 });
    expect(image.length).toBeLessThan(150_000);
    expect(headFor("/", "production")).toContain(`<meta property="og:image" content="https://mystarsdecoded.com${SHARE_COVER.image}" />`);
  });
});

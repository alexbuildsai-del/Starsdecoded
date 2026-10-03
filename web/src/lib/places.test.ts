import { describe, expect, it } from "vitest";
import { calculateNatalChart } from "@workspace/engine";
import type { GeocodeResult as Answer, GeocodeSearchResponse } from "@workspace/api-client-react";
import {
  NO_MATCH_LINE,
  NO_ZONE_LINE,
  SEARCH_FAILED_LINE,
  offsetOn,
  placeLine,
  placeTitle,
  placeTypeLabel,
  placeWhere,
  placeZone,
  placesOf,
  searchFailureLine,
  searchResult,
  searchable,
  type GeocodeResult,
} from "@/lib/places";
import { birthSky, plainLine, risingLine } from "@/site/lib/sky";
import audrey from "../../../fixtures/charts/audrey-hepburn.json";

// Our server's answer as the contract shapes it (R15-02): Ixelles at Audrey Hepburn's recorded coordinates, with the zone
// the server's table gives them and the zone's offset today (summer time), which is not 1929's.
const IXELLES: Answer = {
  name: "Ixelles, Brussels-Capital, Belgium",
  city: "Ixelles",
  region: "Brussels-Capital",
  country: "Belgium",
  latitude: audrey.latitude,
  longitude: audrey.longitude,
  timezoneOffset: 2,
  timezone: "Europe/Brussels",
  placeType: "municipality",
};

const answer = (...results: Answer[]): GeocodeSearchResponse => ({ results });

/** An answer as an API from before ADR-246 sent it: no zone at all. */
const zoneless = (a: Answer) => {
  const { timezone: _dropped, ...rest } = a;
  return rest as Answer;
};

describe("Ixelles, 4 May 1929, 03:00 (QA-02 #3, MB-30)", () => {
  const [ixelles] = placesOf(answer(IXELLES));

  it("comes from our server with its zone, and the chart reads Aquarius rising", () => {
    expect(ixelles.timezone).toBe("Europe/Brussels");
    const sky = birthSky({ date: "1929-05-04", time: "03:00", place: ixelles });
    expect(plainLine(sky.chart)).toBe("Sun in Taurus, Moon in Pisces, Aquarius rising.");
    expect(risingLine(sky.chart)).toBe("28.62° Aquarius");
    expect(sky.at.toISOString()).toBe("1929-05-04T02:00:00.000Z");
  });

  it("is on UTC+1 that night, as the card prints it once the date is typed, not on the UTC+2 the place keeps today", () => {
    expect(offsetOn(ixelles.timezone, "1929-05-04", "03:00")).toBe(1);
    expect(ixelles.timezoneOffset).toBe(2);
  });

  it("would read Aries rising on the longitude's own hour, the guess the browser made when the zone service failed", () => {
    const guessed = calculateNatalChart("1929-05-04", "03:00", ixelles.latitude, ixelles.longitude, Math.round(ixelles.longitude / 15));
    expect(guessed.angles?.ascendant.sign).toBe("Aries");
  });
});

describe("what the field takes from an answer", () => {
  it("takes each place with its zone, its parts filled in, in the server's order", () => {
    const sparse: Answer = { name: "Reykjavík, Iceland", latitude: 64.1466, longitude: -21.9426, timezoneOffset: 0, timezone: "Atlantic/Reykjavik", placeType: "city" };
    expect(placesOf(answer(IXELLES, sparse))).toEqual([
      IXELLES,
      { ...sparse, city: "", region: "", country: "" } satisfies GeocodeResult,
    ]);
  });

  it("keeps nothing but the contract's fields, so a draft holds the place and no more", () => {
    const extra = { ...IXELLES, osmId: 44915 } as Answer;
    expect(Object.keys(placesOf(answer(extra))[0]).sort()).toEqual(Object.keys(IXELLES).sort());
  });

  it("leaves out a place without a zone it can use: none, an empty one, one at sea, or one this browser cannot read", () => {
    const bad = [zoneless(IXELLES), { ...IXELLES, timezone: "" }, { ...IXELLES, timezone: "Etc/GMT-1" }, { ...IXELLES, timezone: "Mars/Olympus_Mons" }];
    expect(placesOf(answer(...bad, { ...IXELLES, name: "kept" })).map((p) => p.name)).toEqual(["kept"]);
  });

  it("reads an empty or broken answer as no places", () => {
    expect(placesOf(null)).toEqual([]);
    expect(placesOf(answer())).toEqual([]);
    expect(placesOf({ results: "Ixelles" } as unknown as GeocodeSearchResponse)).toEqual([]);
  });

  it("says why a search offers nothing: no place found, or places found with no zone (reading 1)", () => {
    expect(searchResult(answer(IXELLES))).toEqual({ places: [IXELLES], line: null });
    expect(searchResult(answer())).toEqual({ places: [], line: NO_MATCH_LINE });
    expect(searchResult(null)).toEqual({ places: [], line: NO_MATCH_LINE });
    expect(searchResult(answer(zoneless(IXELLES), { ...IXELLES, timezone: "Etc/GMT+9" }))).toEqual({ places: [], line: NO_ZONE_LINE });
    expect(NO_ZONE_LINE).toBe("Pick a nearby town.");
  });
});

describe("a search the server refuses", () => {
  // The generated client's error, as far as the field reads it: the status and the parsed body.
  const refused = (status: number, data: unknown, headers: Record<string, string> = {}) => ({
    status,
    data,
    headers: new Headers(headers),
  });

  it("shows the 422's own line, and reading 1's words if it gives none", () => {
    expect(searchFailureLine(refused(422, { error: "no_zone", message: "Pick a nearby town." }))).toBe("Pick a nearby town.");
    expect(searchFailureLine(refused(422, { error: "no_zone", message: "  " }))).toBe(NO_ZONE_LINE);
    expect(searchFailureLine(refused(422, null))).toBe(NO_ZONE_LINE);
  });

  it("reads a 404 as no place found", () => {
    expect(searchFailureLine(refused(404, { error: "not_found", message: "Place not found" }))).toBe(NO_MATCH_LINE);
  });

  it("gives a limit its own words, with the minute it opens again", () => {
    const limit = refused(
      429,
      { error: "rate_limited", message: "We've had 60 place searches from your internet connection in the last minute. Try again in a minute." },
      { "Retry-After": "60" },
    );
    expect(searchFailureLine(limit)).toBe("We've had 60 place searches from your internet connection in the last minute. Try again in a minute.");
  });

  it("says the search failed for anything else: Nominatim down, a timeout, no network", () => {
    expect(searchFailureLine(refused(502, { error: "geocode_failed", message: "Geocoding service unavailable" }))).toBe(SEARCH_FAILED_LINE);
    expect(searchFailureLine(refused(500, null))).toBe(SEARCH_FAILED_LINE);
    expect(searchFailureLine(new DOMException("The operation timed out.", "TimeoutError"))).toBe(SEARCH_FAILED_LINE);
    expect(searchFailureLine(new TypeError("Failed to fetch"))).toBe(SEARCH_FAILED_LINE);
    expect(searchFailureLine(null)).toBe(SEARCH_FAILED_LINE);
  });
});

describe("the card's offset (reading 2, MB-179)", () => {
  it("prints none until a whole birth date is typed", () => {
    expect(offsetOn("Europe/Brussels", "")).toBeNull();
    expect(offsetOn("Europe/Brussels", "1929-05")).toBeNull();
    expect(offsetOn("Europe/Brussels", "04/05/1929")).toBeNull();
  });

  it("is the zone's on the birth date, at the typed time or at noon without one", () => {
    expect(offsetOn("Europe/Brussels", "1929-05-04")).toBe(1);
    expect(offsetOn("Europe/Brussels", "1929-01-15", "03:00")).toBe(0);
    expect(offsetOn("Europe/Brussels", "2026-07-01", null)).toBe(2);
    expect(offsetOn("Asia/Kolkata", "1990-05-17", "14:30")).toBe(5.5);
    expect(offsetOn("America/New_York", "1990-01-10", "not a time")).toBe(-5);
  });

  it("follows the clock change on its day: before and after 03:00 on Brussels' last Sunday of March 2026", () => {
    expect(offsetOn("Europe/Brussels", "2026-03-29", "01:30")).toBe(1);
    expect(offsetOn("Europe/Brussels", "2026-03-29", "12:00")).toBe(2);
  });

  it("keeps a town's own mean time before it took a zone's clock", () => {
    expect(offsetOn("Europe/Warsaw", "1867-11-07", "12:00")).toBeCloseTo(1.4, 10);
  });
});

describe("the search's floor", () => {
  it("asks only once two characters are typed, counted as the server counts them, trimmed (MB-165)", () => {
    expect(searchable("I")).toBe(false);
    expect(searchable(" I ")).toBe(false);
    expect(searchable("Ix")).toBe(true);
    expect(searchable("  Ix ")).toBe(true);
  });

  it("takes a zone a place can carry, and none at sea or unknown to the browser", () => {
    expect(placeZone("Europe/Brussels")).toBe(true);
    expect(placeZone("America/Argentina/Buenos_Aires")).toBe(true);
    for (const zone of [null, undefined, "", 2, "Etc/GMT-1", "Etc/UTC", "Mars/Olympus_Mons"]) expect(placeZone(zone), String(zone)).toBe(false);
  });
});

describe("the labels", () => {
  const place = (over: Partial<GeocodeResult>): GeocodeResult => ({
    name: "Milan, Lombardy, Italy", city: "Milan", region: "Lombardy", country: "Italy",
    latitude: 45.4642, longitude: 9.1896, timezoneOffset: 2, timezone: "Europe/Rome", placeType: "city", ...over,
  });

  it("badges a place by its type, and an administrative area as a region", () => {
    expect(placeTypeLabel("city")).toBe("City");
    expect(placeTypeLabel("neighbourhood")).toBe("Neighbourhood");
    expect(placeTypeLabel("administrative")).toBe("Region");
  });

  it("titles a place by its town, else by the first part of its name, and places it by region and country", () => {
    expect(placeTitle(place({}))).toBe("Milan");
    expect(placeTitle(place({ city: "", name: "Lake Como, Lombardy, Italy" }))).toBe("Lake Como");
    expect(placeWhere(place({}))).toBe("Lombardy, Italy");
    expect(placeWhere(place({ region: "" }))).toBe("Italy");
    expect(placeWhere(place({ region: "", country: "" }))).toBe("");
  });

  it("leaves a region the name already says out of where a place is, a city-state's or a region's own", () => {
    expect(placeWhere(place({ name: "Berlin, Germany", city: "Berlin", region: "Berlin", country: "Germany" }))).toBe("Germany");
    expect(placeWhere(place({ name: "Košický kraj, Slovakia", city: "Košický kraj", region: "Košický kraj", country: "Slovakia" }))).toBe("Slovakia");
  });

  it("says a place in one line under its name: what it is, its region, its country, and no offset (ADR-231)", () => {
    const kosice = place({ name: "Košice, Košický kraj, Slovakia", city: "Košice", region: "Košický kraj", country: "Slovakia", timezone: "Europe/Bratislava" });
    expect(placeLine(kosice)).toBe("City · Košický kraj · Slovakia");
    expect(placeLine({ ...kosice, name: "Košický kraj, Slovakia", city: "Košický kraj", placeType: "administrative" })).toBe("Region · Slovakia");
    expect(placeLine({ ...kosice, name: "Reykjavík, Iceland", city: "Reykjavík", region: "", country: "Iceland" })).toBe("City · Iceland");
    expect(placeLine({ ...kosice, region: "", country: "" })).toBe("City");
    expect(placeLine(place({}))).toBe("City · Lombardy · Italy");
    expect(placeLine(placesOf(answer(IXELLES))[0])).toBe("Municipality · Brussels-Capital · Belgium");
  });
});

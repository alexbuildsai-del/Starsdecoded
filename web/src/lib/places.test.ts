import { describe, expect, it } from "vitest";
import {
  addressOf,
  fallbackZone,
  matchesLabel,
  nominatimUrl,
  placeTitle,
  placeTypeLabel,
  placeWhere,
  rankResults,
  specificityRank,
  toPlace,
  utcLabel,
  zoneFrom,
  zoneUrl,
  type GeocodeResult,
  type NominatimResult,
} from "@/lib/places";

// Hits in Nominatim's format=json shape, trimmed to what the field reads.
const hit = (over: Partial<NominatimResult> & Pick<NominatimResult, "display_name">): NominatimResult => ({
  lat: "45.4641943",
  lon: "9.1896346",
  class: "place",
  type: "city",
  ...over,
});

const lombardy = { city: "Milan", state: "Lombardy", country: "Italy" };

const MILAN_HITS: NominatimResult[] = [
  hit({ display_name: "Milan, Lombardy, Italy", class: "boundary", type: "administrative", importance: 0.83, address: lombardy }),
  hit({ display_name: "Milano Centrale, Piazza Duca d'Aosta, Milan, Lombardy, Italy", class: "railway", type: "station", importance: 0.61, address: lombardy }),
  hit({ display_name: "Milan, Lombardy, Italy", importance: 0.8, address: lombardy }),
  hit({
    display_name: "Milan, Rock Island County, Illinois, United States",
    lat: "41.4531", lon: "-90.5721", type: "village", importance: 0.38,
    address: { village: "Milan", county: "Rock Island County", state: "Illinois", country: "United States" },
  }),
  hit({
    display_name: "Milan, Gibson County, Tennessee, United States",
    lat: "35.9198", lon: "-88.7589", type: "town", importance: 0.45,
    address: { town: "Milan", county: "Gibson County", state: "Tennessee", country: "United States" },
  }),
  hit({
    display_name: "Milan, Washtenaw County, Michigan, United States",
    lat: "42.0853", lon: "-83.6824", importance: 0.5,
    address: { city: "Milan", county: "Washtenaw County", state: "Michigan", country: "United States" },
  }),
  hit({
    display_name: "Milan, Sullivan County, Missouri, United States",
    lat: "40.2022", lon: "-93.1252", importance: 0.42,
    address: { city: "Milan", county: "Sullivan County", state: "Missouri", country: "United States" },
  }),
  hit({
    display_name: "Milan, Erie County, Ohio, United States",
    lat: "41.2975", lon: "-82.6055", type: "village", importance: 0.4,
    address: { village: "Milan", county: "Erie County", state: "Ohio", country: "United States" },
  }),
];

describe("the ranking", () => {
  it("puts a city before a town before a village, any settlement before a region, and a region before anything else", () => {
    const rank = (klass: string, type: string) => specificityRank(hit({ display_name: "x", class: klass, type }));
    expect(rank("place", "city")).toBe(0);
    expect(rank("place", "town")).toBe(1);
    expect([rank("place", "village"), rank("place", "municipality")]).toEqual([2, 2]);
    expect([rank("place", "suburb"), rank("place", "borough"), rank("place", "neighbourhood")]).toEqual([3, 3, 3]);
    expect(rank("place", "hamlet")).toBe(4);
    expect(rank("boundary", "administrative")).toBe(5);
    expect([rank("place", "state"), rank("railway", "station"), rank("amenity", "university")]).toEqual([6, 6, 6]);
  });

  it("re-ranks Nominatim's order, shows a town listed twice once, as its place, and keeps five", () => {
    const ranked = rankResults(MILAN_HITS);
    expect(ranked.map((r) => `${r.type}: ${r.display_name}`)).toEqual([
      "city: Milan, Lombardy, Italy",
      "city: Milan, Washtenaw County, Michigan, United States",
      "city: Milan, Sullivan County, Missouri, United States",
      "town: Milan, Gibson County, Tennessee, United States",
      "village: Milan, Erie County, Ohio, United States",
    ]);
  });

  it("orders a tie by importance, reading none as zero, and compares names without case", () => {
    const quiet = hit({ display_name: "Ely, Cambridgeshire, England", address: { city: "Ely", state: "England", country: "United Kingdom" } });
    const known = hit({ display_name: "Ely, Nevada, United States", importance: 0.4, address: { city: "Ely", state: "Nevada", country: "United States" } });
    expect(rankResults([quiet, known]).map((r) => r.display_name)).toEqual(["Ely, Nevada, United States", "Ely, Cambridgeshire, England"]);
    const shouted = hit({ display_name: "MILAN", importance: 0.1, address: { city: "MILAN", state: "LOMBARDY", country: "ITALY" } });
    expect(rankResults([...MILAN_HITS.slice(0, 3), shouted])).toHaveLength(1);
    expect(rankResults([])).toEqual([]);
  });
});

describe("a hit's address", () => {
  it("names the town from the first settlement key it has, the region from the state down", () => {
    expect(addressOf(hit({ display_name: "x", address: { town: "Stratford-upon-Avon", county: "Warwickshire", state: "England", country: "United Kingdom" } })))
      .toEqual({ city: "Stratford-upon-Avon", region: "England", country: "United Kingdom" });
    expect(addressOf(hit({ display_name: "x", address: { hamlet: "Bosham Hoe", suburb: "Bosham", county: "West Sussex" } })))
      .toEqual({ city: "Bosham Hoe", region: "West Sussex", country: "" });
    expect(addressOf(hit({ display_name: "x", address: { municipality: "Vaux-sur-Sûre", state_district: "Luxembourg", country: "Belgium" } })))
      .toEqual({ city: "Vaux-sur-Sûre", region: "Luxembourg", country: "Belgium" });
  });

  it("calls a hit with no town in its address by the first part of its own name", () => {
    expect(addressOf(hit({ display_name: " Mount Everest , Solukhumbu, Nepal", address: { county: "Solukhumbu", country: "Nepal" } })))
      .toEqual({ city: "Mount Everest", region: "Solukhumbu", country: "Nepal" });
    expect(addressOf(hit({ display_name: "Atlantis" }))).toEqual({ city: "Atlantis", region: "", country: "" });
  });
});

describe("a place from a hit", () => {
  it("joins town, region and country, rounds to four places and carries the zone and the type", () => {
    const milan = toPlace(rankResults(MILAN_HITS)[0], { timezone: "Europe/Rome", timezoneOffset: 2 });
    expect(milan).toEqual({
      name: "Milan, Lombardy, Italy",
      city: "Milan",
      region: "Lombardy",
      country: "Italy",
      latitude: 45.4642,
      longitude: 9.1896,
      timezoneOffset: 2,
      timezone: "Europe/Rome",
      placeType: "city",
    } satisfies GeocodeResult);
  });

  it("says a part equal to the one before it once, and leaves an empty one out", () => {
    const berlin = hit({ display_name: "Berlin, Germany", lat: "52.5170365", lon: "13.3888599", address: { city: "Berlin", state: "Berlin", country: "Germany" } });
    expect(toPlace(berlin, fallbackZone(13.3888599)).name).toBe("Berlin, Germany");
    const noRegion = hit({ display_name: "Reykjavík, Iceland", lat: "64.1466", lon: "-21.9426", address: { city: "Reykjavík", country: "Iceland" } });
    expect(toPlace(noRegion, fallbackZone(-21.9426))).toMatchObject({ name: "Reykjavík, Iceland", region: "", latitude: 64.1466, longitude: -21.9426 });
  });
});

describe("the zone", () => {
  it("reads timeapi.io's current offset in hours and its zone name", () => {
    expect(zoneFrom({ timeZone: "Europe/Rome", currentUtcOffset: { seconds: 7200 } }, 9.19)).toEqual({ timezone: "Europe/Rome", timezoneOffset: 2 });
    expect(zoneFrom({ timeZone: "Asia/Kolkata", currentUtcOffset: { seconds: 19800 } }, 72.88)).toEqual({ timezone: "Asia/Kolkata", timezoneOffset: 5.5 });
    expect(zoneFrom({ utcOffset: -18000 }, -74)).toEqual({ timezone: null, timezoneOffset: -5 });
    expect(zoneFrom({}, -74)).toEqual({ timezone: null, timezoneOffset: 0 });
  });

  it("falls back to the longitude's own hour when the service gave nothing", () => {
    expect(zoneFrom(null, 9.19)).toEqual({ timezone: null, timezoneOffset: 1 });
    expect(fallbackZone(-73.99)).toEqual({ timezone: null, timezoneOffset: -5 });
    expect(fallbackZone(139.69)).toEqual({ timezone: null, timezoneOffset: 9 });
  });
});

describe("the addresses it calls", () => {
  it("asks Nominatim for ten hits with their addresses, the query encoded", () => {
    expect(nominatimUrl("São Paulo, Brazil")).toBe(
      "https://nominatim.openstreetmap.org/search?q=S%C3%A3o%20Paulo%2C%20Brazil&format=json&limit=10&addressdetails=1",
    );
    expect(nominatimUrl("a&b=c")).toContain("q=a%26b%3Dc&");
  });

  it("asks timeapi.io for the zone at the hit's own coordinates", () => {
    expect(zoneUrl(45.4641943, 9.1896346)).toBe("https://timeapi.io/api/timezone/coordinate?latitude=45.4641943&longitude=9.1896346");
    expect(zoneUrl(-33.8688, 151.2093)).toBe("https://timeapi.io/api/timezone/coordinate?latitude=-33.8688&longitude=151.2093");
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

  it("signs the offset, halves and quarters included", () => {
    expect(utcLabel(2)).toBe("UTC+2");
    expect(utcLabel(0)).toBe("UTC+0");
    expect(utcLabel(-5)).toBe("UTC-5");
    expect(utcLabel(5.5)).toBe("UTC+5.5");
    expect(utcLabel(5.75)).toBe("UTC+5.75");
    expect(utcLabel(-3.5)).toBe("UTC-3.5");
  });

  it("counts the matches in the list's head", () => {
    expect(matchesLabel(1)).toBe("1 match — pick the exact city");
    expect(matchesLabel(5)).toBe("5 matches — pick the exact city");
  });
});

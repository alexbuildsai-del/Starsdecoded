import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { offsetAtBirth } from "@workspace/engine";
import {
  addressOf,
  isNominatimHit,
  nominatimUrl,
  offsetToday,
  placesFrom,
  rankResults,
  settlementOf,
  specificityRank,
  toPlace,
  zoneAt,
  type GeocodeResult,
  type NominatimResult,
} from "./places.js";

// Hits in Nominatim's format=jsonv2 shape, trimmed to what the search reads.
const hit = (over: Partial<NominatimResult> & Pick<NominatimResult, "display_name">): NominatimResult => ({
  lat: "45.4641943",
  lon: "9.1896346",
  category: "place",
  type: "city",
  ...over,
});

// A day of Central European summer time, so a zone's offset today is fixed for the tests that read one.
const OCTOBER = new Date("2026-10-03T09:30:00Z");

const lombardy = { city: "Milan", state: "Lombardy", country: "Italy" };

const MILAN_HITS: NominatimResult[] = [
  hit({ display_name: "Milan, Lombardy, Italy", category: "boundary", type: "administrative", importance: 0.83, address: lombardy }),
  hit({ display_name: "Milano Centrale, Piazza Duca d'Aosta, Milan, Lombardy, Italy", category: "railway", type: "station", importance: 0.61, address: lombardy }),
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
    const rank = (category: string, type: string) => specificityRank(hit({ display_name: "x", category, type }));
    assert.equal(rank("place", "city"), 0);
    assert.equal(rank("place", "town"), 1);
    assert.deepEqual([rank("place", "village"), rank("place", "municipality")], [2, 2]);
    assert.deepEqual([rank("place", "suburb"), rank("place", "borough"), rank("place", "neighbourhood")], [3, 3, 3]);
    assert.equal(rank("place", "hamlet"), 4);
    assert.equal(rank("boundary", "administrative"), 5);
    assert.deepEqual([rank("place", "state"), rank("railway", "station"), rank("amenity", "university")], [6, 6, 6]);
  });

  it("reads a boundary's addresstype: a city or town filed as administrative ranks as that settlement, a region or district stays a region", () => {
    const boundary = (addresstype: string | undefined) =>
      hit({ display_name: "x", category: "boundary", type: "administrative", addresstype });
    assert.deepEqual([boundary("city"), boundary("town"), boundary("village"), boundary("hamlet")].map(specificityRank), [0, 1, 2, 4]);
    assert.deepEqual([boundary("state"), boundary("county"), boundary("city_district"), boundary(undefined)].map(specificityRank), [5, 5, 5, 5]);
    assert.equal(settlementOf(boundary("city")), "city");
    assert.equal(settlementOf(boundary("state")), null);
    assert.equal(settlementOf(hit({ display_name: "x", type: "village" })), "village");
  });

  it("takes an addresstype from a boundary only, never from a landmark that happens to be in a city", () => {
    assert.equal(specificityRank(hit({ display_name: "x", category: "railway", type: "station", addresstype: "city" })), 6);
    assert.equal(settlementOf(hit({ display_name: "x", category: "railway", type: "station", addresstype: "city" })), null);
  });

  it("reads the category of an answer in the json shape, where it is called class", () => {
    const json = (klass: string, type: string, addresstype?: string): NominatimResult => ({
      display_name: "x", lat: "0", lon: "0", class: klass, type, addresstype,
    });
    assert.equal(specificityRank(json("place", "town")), 1);
    assert.equal(specificityRank(json("boundary", "administrative")), 5);
    assert.equal(specificityRank(json("boundary", "administrative", "city")), 0);
  });

  it("keeps a city's boundary when one of its own districts shares its town, region and country", () => {
    const kosicky = { state: "Košický kraj", country: "Slovakia" };
    const city = hit({ display_name: "Košice, Košický kraj, Slovakia", category: "boundary", type: "administrative", addresstype: "city", importance: 0.5, address: { city: "Košice", ...kosicky } });
    const district = hit({ display_name: "Staré Mesto, Košice, Košický kraj, Slovakia", category: "boundary", type: "administrative", addresstype: "suburb", importance: 0.6, address: { suburb: "Staré Mesto", city: "Košice", ...kosicky } });
    assert.deepEqual(rankResults([district, city]).map((r) => r.display_name), ["Košice, Košický kraj, Slovakia"]);
  });

  it("re-ranks Nominatim's order, shows a town listed twice once, as its place, and keeps five", () => {
    const ranked = rankResults(MILAN_HITS);
    assert.deepEqual(ranked.map((r) => `${r.type}: ${r.display_name}`), [
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
    assert.deepEqual(rankResults([quiet, known]).map((r) => r.display_name), ["Ely, Nevada, United States", "Ely, Cambridgeshire, England"]);
    const shouted = hit({ display_name: "MILAN", importance: 0.1, address: { city: "MILAN", state: "LOMBARDY", country: "ITALY" } });
    assert.equal(rankResults([...MILAN_HITS.slice(0, 3), shouted]).length, 1);
    assert.deepEqual(rankResults([]), []);
  });
});

// "kosice": Nominatim most likely files the city of Košice as an administrative boundary, the same type as its region and its
// districts, so the list called it a Region, ranked it among them and could drop it as their duplicate. NOT RECORDED: Nominatim is
// out of reach here, so this answer is built to the documented jsonv2 shape, trimmed to what the search reads, the way the
// service is expected to answer: the city says "city" in addresstype, the region and districts do not, and a village of the
// same name sits elsewhere. The live list is read on the preview.
const kosickyKraj = { state: "Košický kraj", country: "Slovakia" };

const KOSICE_BUILT: NominatimResult[] = [
  hit({ display_name: "Košický kraj, Slovakia", lat: "48.6", lon: "21.2", category: "boundary", type: "administrative", addresstype: "state", importance: 0.55, address: kosickyKraj }),
  hit({ display_name: "Košice, Košický kraj, Slovakia", lat: "48.7164", lon: "21.2611", category: "boundary", type: "administrative", addresstype: "city", importance: 0.5, address: { city: "Košice", ...kosickyKraj } }),
  hit({ display_name: "okres Košice I, Košický kraj, Slovakia", lat: "48.72", lon: "21.25", category: "boundary", type: "administrative", addresstype: "county", importance: 0.34, address: { county: "okres Košice I", ...kosickyKraj } }),
  hit({ display_name: "okres Košice II, Košický kraj, Slovakia", lat: "48.7", lon: "21.3", category: "boundary", type: "administrative", addresstype: "county", importance: 0.33, address: { county: "okres Košice II", ...kosickyKraj } }),
  hit({
    display_name: "Košice, okres Kutná Hora, Central Bohemian Region, Czechia",
    lat: "49.91", lon: "14.9", category: "place", type: "village", importance: 0.3,
    address: { village: "Košice", county: "okres Kutná Hora", state: "Central Bohemian Region", country: "Czechia" },
  }),
];

describe("kosice, an answer built to Nominatim's documented jsonv2 shape (not recorded: the service is out of reach here)", () => {
  it("lists Košice first, as a city, ahead of its region and districts and a village of the same name, each with its zone", () => {
    const places = placesFrom(KOSICE_BUILT, OCTOBER);
    assert.deepEqual(places.map((p) => [p.name, p.placeType, p.timezone]), [
      ["Košice, Košický kraj, Slovakia", "city", "Europe/Bratislava"],
      ["Košice, Central Bohemian Region, Czechia", "village", "Europe/Prague"],
      ["Košický kraj, Slovakia", "administrative", "Europe/Bratislava"],
      ["okres Košice I, Košický kraj, Slovakia", "administrative", "Europe/Bratislava"],
      ["okres Košice II, Košický kraj, Slovakia", "administrative", "Europe/Bratislava"],
    ]);
  });

  it("gives Košice as a city, named with its region and country, with its zone and the zone's offset today", () => {
    const [kosice] = rankResults(KOSICE_BUILT);
    assert.deepEqual(toPlace(kosice, "Europe/Bratislava", OCTOBER), {
      name: "Košice, Košický kraj, Slovakia",
      city: "Košice",
      region: "Košický kraj",
      country: "Slovakia",
      latitude: 48.7164,
      longitude: 21.2611,
      timezoneOffset: 2,
      timezone: "Europe/Bratislava",
      placeType: "city",
    } satisfies GeocodeResult);
  });
});

describe("a hit's address", () => {
  it("names the town from the first settlement key it has, the region from the state down", () => {
    assert.deepEqual(addressOf(hit({ display_name: "x", address: { town: "Stratford-upon-Avon", county: "Warwickshire", state: "England", country: "United Kingdom" } })),
      { city: "Stratford-upon-Avon", region: "England", country: "United Kingdom" });
    assert.deepEqual(addressOf(hit({ display_name: "x", address: { hamlet: "Bosham Hoe", suburb: "Bosham", county: "West Sussex" } })),
      { city: "Bosham Hoe", region: "West Sussex", country: "" });
    assert.deepEqual(addressOf(hit({ display_name: "x", address: { municipality: "Vaux-sur-Sûre", state_district: "Luxembourg", country: "Belgium" } })),
      { city: "Vaux-sur-Sûre", region: "Luxembourg", country: "Belgium" });
  });

  it("calls a hit with no town in its address by the first part of its own name", () => {
    assert.deepEqual(addressOf(hit({ display_name: " Mount Everest , Solukhumbu, Nepal", address: { county: "Solukhumbu", country: "Nepal" } })),
      { city: "Mount Everest", region: "Solukhumbu", country: "Nepal" });
    assert.deepEqual(addressOf(hit({ display_name: "Atlantis" })), { city: "Atlantis", region: "", country: "" });
  });

  it("is a search result only with the four fields every hit is read by", () => {
    assert.ok(isNominatimHit(MILAN_HITS[0]));
    assert.ok(isNominatimHit({ display_name: "x", lat: "1", lon: "2", type: "city", extra: true }));
    for (const item of [null, "Milan", 3, [], { display_name: "x", lat: 45.46, lon: "9.19", type: "city" }, { lat: "1", lon: "2", type: "city" }]) {
      assert.ok(!isNominatimHit(item), JSON.stringify(item));
    }
  });
});

describe("a place from a hit", () => {
  it("joins town, region and country, rounds to four places and carries the zone, its offset today and the type", () => {
    const [milan] = rankResults(MILAN_HITS);
    assert.deepEqual(toPlace(milan, "Europe/Rome", OCTOBER), {
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
    assert.equal(toPlace(berlin, "Europe/Berlin", OCTOBER).name, "Berlin, Germany");
    const noRegion = hit({ display_name: "Reykjavík, Iceland", lat: "64.1466", lon: "-21.9426", address: { city: "Reykjavík", country: "Iceland" } });
    const reykjavik = toPlace(noRegion, "Atlantic/Reykjavik", OCTOBER);
    assert.deepEqual([reykjavik.name, reykjavik.region, reykjavik.latitude, reykjavik.longitude], ["Reykjavík, Iceland", "", 64.1466, -21.9426]);
  });

  it("names a town mapped as a boundary by what it is, and anything else by Nominatim's type", () => {
    const boundaryCity = hit({ display_name: "Košice, Slovakia", category: "boundary", type: "administrative", addresstype: "city", address: { city: "Košice", country: "Slovakia" } });
    assert.equal(toPlace(boundaryCity, "Europe/Bratislava", OCTOBER).placeType, "city");
    const region = hit({ display_name: "Lombardy, Italy", category: "boundary", type: "administrative", addresstype: "state", address: { state: "Lombardy", country: "Italy" } });
    assert.equal(toPlace(region, "Europe/Rome", OCTOBER).placeType, "administrative");
  });
});

describe("the zone, from the offline table", () => {
  it("reads Ixelles as Brussels, and Brussels, Milan and Košice as their own zones", () => {
    assert.equal(zoneAt(50.8333, 4.3667), "Europe/Brussels");
    assert.equal(zoneAt(50.8467, 4.3525), "Europe/Brussels");
    assert.equal(zoneAt(45.4642, 9.1896), "Europe/Rome");
    assert.equal(zoneAt(48.7164, 21.2611), "Europe/Bratislava");
  });

  it("gives no zone at sea, nor on the land the table files under Etc, nor off the globe", () => {
    assert.equal(zoneAt(54.5, 3.0), null, "the North Sea answers Etc/GMT");
    assert.equal(zoneAt(40, -40), null, "the Atlantic answers Etc/GMT+3");
    assert.equal(zoneAt(-70.1366, -10.1953), null, "a stretch of Antarctica answers Etc/UTC");
    for (const [lat, lon] of [[Number.NaN, 4.35], [50.85, Number.NaN], [91, 0], [0, 181], [Number.POSITIVE_INFINITY, 0]]) {
      assert.equal(zoneAt(lat, lon), null, `${lat}, ${lon}`);
    }
  });

  it("takes the first of the zones a point on a border answers (reading 1)", () => {
    assert.equal(zoneAt(43.839319, 87.526148), "Asia/Urumqi", "the table answers Asia/Urumqi, then Asia/Shanghai");
  });

  it("answers only zones the platform's clock knows, so every offset can be read", () => {
    const tableDir = join(dirname(createRequire(import.meta.url).resolve("geo-tz/all")), "..", "data");
    const zones = (JSON.parse(readFileSync(join(tableDir, "timezones.geojson.index.json"), "utf8")) as { timezones: string[] }).timezones;
    assert.ok(zones.length > 400, `${zones.length} zones`);
    const unknown = zones.filter((zone) => {
      try {
        new Intl.DateTimeFormat("en-US", { timeZone: zone });
        return false;
      } catch {
        return true;
      }
    });
    assert.deepEqual(unknown, []);
  });

  it("is the zone's offset today at noon, halves and quarters kept, and the chart's own is the birth date's", () => {
    assert.equal(offsetToday("Europe/Brussels", OCTOBER), 2);
    assert.equal(offsetToday("Europe/Brussels", new Date("2026-01-15T23:59:00Z")), 1);
    assert.equal(offsetToday("Asia/Kathmandu", OCTOBER), 5.75);
    assert.equal(offsetToday("America/St_Johns", new Date("2026-01-15T00:00:00Z")), -3.5);
    // 29 March 2026 is the night Brussels moves its clocks on: noon is already summer time.
    assert.equal(offsetToday("Europe/Brussels", new Date("2026-03-29T00:30:00Z")), 2);
    assert.equal(offsetAtBirth("Europe/Brussels", "1929-05-04", "03:00"), 1, "Audrey Hepburn's birth hour, on Belgian summer time");
  });
});

describe("the places a search offers", () => {
  const ixelles = hit({
    display_name: "Ixelles - Elsene, Brussels-Capital, Belgium",
    lat: "50.8333", lon: "4.3667", category: "boundary", type: "administrative", addresstype: "town", importance: 0.5,
    address: { town: "Ixelles - Elsene", state: "Brussels-Capital", country: "Belgium" },
  });
  const atSea = (name: string, type: string, importance: number) =>
    hit({ display_name: name, lat: "54.5", lon: "3.0", category: "place", type, importance, address: { city: name } });

  it("drops a hit at sea before the ranking, so it never takes a town's place among the five", () => {
    const sea = atSea("Dogger", "city", 0.9);
    const places = placesFrom([sea, ...MILAN_HITS], OCTOBER);
    assert.equal(places.length, 5);
    assert.ok(!places.some((p) => p.name === "Dogger"));
    assert.deepEqual(places.map((p) => p.timezone), ["Europe/Rome", "America/Detroit", "America/Chicago", "America/Chicago", "America/New_York"]);
  });

  it("keeps a town whose duplicate lies at sea, and gives each place its zone and that zone's offset today", () => {
    const seaTwin = { ...ixelles, lat: "54.5", lon: "3.0", category: "place", type: "town", importance: 0.9 };
    const places = placesFrom([seaTwin, ixelles], OCTOBER);
    assert.deepEqual(places, [{
      name: "Ixelles - Elsene, Brussels-Capital, Belgium",
      city: "Ixelles - Elsene",
      region: "Brussels-Capital",
      country: "Belgium",
      latitude: 50.8333,
      longitude: 4.3667,
      timezoneOffset: 2,
      timezone: "Europe/Brussels",
      placeType: "town",
    }]);
  });

  it("offers nothing when every hit lies at sea, or has coordinates the table cannot read", () => {
    assert.deepEqual(placesFrom([atSea("Dogger", "city", 0.9), atSea("Doggerland", "village", 0.2)], OCTOBER), []);
    assert.deepEqual(placesFrom([{ ...ixelles, lat: "north", lon: "4.3667" }], OCTOBER), []);
    assert.deepEqual(placesFrom([], OCTOBER), []);
  });
});

describe("the address it calls", () => {
  it("asks Nominatim for ten hits in jsonv2, which documents addresstype, with their addresses, the query encoded", () => {
    assert.equal(
      nominatimUrl("São Paulo, Brazil"),
      "https://nominatim.openstreetmap.org/search?q=S%C3%A3o%20Paulo%2C%20Brazil&format=jsonv2&limit=10&addressdetails=1",
    );
    assert.ok(nominatimUrl("a&b=c").includes("q=a%26b%3Dc&"));
  });
});

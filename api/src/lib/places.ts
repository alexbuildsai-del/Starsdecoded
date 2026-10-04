/**
 * The place search's server half (ADR-246, MB-30). Nominatim's hits are ranked the way people are born, in towns, and
 * each carries the IANA zone the offline table holds for its coordinates. A hit the table gives no zone is never offered,
 * so no chart starts from an offset guessed from a longitude.
 */
import type { z } from "zod";
import type { GeocodePlaceResponse } from "@workspace/api-zod";
import { offsetAtBirth } from "@workspace/engine";
// MB-194 provisional: geo-tz's comprehensive table, which keeps apart the zones that differed before 1970; its default
// merges them into one.
import { find, setCache } from "geo-tz/all";

export type GeocodeResult = z.infer<typeof GeocodePlaceResponse>["results"][number];

/** The part of a Nominatim `format=jsonv2` hit the search reads. `json` names `category` "class", and either is read. */
export interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
  category?: string;
  class?: string;
  type: string;
  /** What the hit is as a part of an address: a city mapped as a boundary has type "administrative" and addresstype "city". */
  addresstype?: string;
  importance?: number;
  address?: {
    country?: string;
    city?: string;
    town?: string;
    village?: string;
    hamlet?: string;
    suburb?: string;
    municipality?: string;
    county?: string;
    state?: string;
    region?: string;
    state_district?: string;
  };
}

// geo-tz keeps every part of the table it has read for as long as the process runs, and read whole the table fills about
// 1.5 GB of heap. Read again from disk, a part costs hundredths of a millisecond on average, so none is kept.
setCache({ store: { get: () => undefined, set: () => {} } });

export const SETTLEMENT_TYPES: ReadonlySet<string> = new Set([
  "city",
  "town",
  "village",
  "hamlet",
  "municipality",
  "suburb",
  "neighbourhood",
  "borough",
]);

/**
 * An administrative boundary whose addresstype is one of these is the settlement
 * itself: Nominatim files Košice under the same type as its region and its
 * districts, and says in addresstype that it is a city. A region or a district
 * does not carry one of these.
 */
const BOUNDARY_SETTLEMENTS: ReadonlySet<string> = new Set(["city", "town", "village", "hamlet"]);

/** `jsonv2` is the format that documents `addresstype`, which is how a city mapped as a boundary says it is one. */
export function nominatimUrl(query: string): string {
  return `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=jsonv2&limit=10&addressdetails=1`;
}

/** The fields every hit is read by; an answer whose items lack one is not a search result. */
export function isNominatimHit(value: unknown): value is NominatimResult {
  if (value === null || typeof value !== "object") return false;
  const hit = value as Record<string, unknown>;
  return ["display_name", "lat", "lon", "type"].every((key) => typeof hit[key] === "string");
}

const categoryOf = (r: NominatimResult): string | undefined => r.category ?? r.class;

/** What a hit is as a settlement, if it is one: a town mapped as a boundary is still a town to the reader, so the ranking and the label both ask here. */
export function settlementOf(r: NominatimResult): string | null {
  if (categoryOf(r) === "place" && SETTLEMENT_TYPES.has(r.type)) return r.type;
  if (categoryOf(r) === "boundary" && r.type === "administrative" && r.addresstype && BOUNDARY_SETTLEMENTS.has(r.addresstype)) {
    return r.addresstype;
  }
  return null;
}

/** Lower is more specific. People are born in towns, so any settlement outranks a region, and a region anything else. */
export function specificityRank(r: NominatimResult): number {
  const settlement = settlementOf(r);
  if (settlement === "city") return 0;
  if (settlement === "town") return 1;
  if (settlement === "village" || settlement === "municipality") return 2;
  if (settlement === "suburb" || settlement === "borough" || settlement === "neighbourhood") return 3;
  if (settlement) return 4;
  if (categoryOf(r) === "boundary" && r.type === "administrative") return 5;
  return 6;
}

/** A hit whose address names no town is called by the first part of its own name. */
export function addressOf(r: NominatimResult): { city: string; region: string; country: string } {
  const addr = r.address ?? {};
  return {
    city: addr.city ?? addr.town ?? addr.village ?? addr.hamlet ?? addr.municipality ?? addr.suburb ?? r.display_name.split(",")[0].trim(),
    region: addr.state ?? addr.region ?? addr.county ?? addr.state_district ?? "",
    country: addr.country ?? "",
  };
}

/**
 * Nominatim orders by importance alone, which can put a landmark above the
 * town it is named after, and it often lists a town twice, as a place and as
 * its boundary: the list shows each town, region and country once, five at most.
 */
export function rankResults<T extends NominatimResult>(results: readonly T[]): T[] {
  const sorted = [...results].sort((a, b) => {
    const rankDiff = specificityRank(a) - specificityRank(b);
    if (rankDiff !== 0) return rankDiff;
    return (b.importance ?? 0) - (a.importance ?? 0);
  });
  const seen = new Set<string>();
  return sorted
    .filter((r) => {
      const { city, region, country } = addressOf(r);
      const key = `${city.toLowerCase()}|${region.toLowerCase()}|${country.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 5);
}

/** Four decimal places, about 11 m: the point the reader is given, and so the point whose zone is read. */
function coordinatesOf(r: NominatimResult): { latitude: number; longitude: number } {
  return {
    latitude: Math.round(parseFloat(r.lat) * 10000) / 10000,
    longitude: Math.round(parseFloat(r.lon) * 10000) / 10000,
  };
}

/**
 * The table's first answer for a point (reading 1): a point on a border answers every zone it touches. An `Etc/` zone is
 * the sea's, or land no country keeps, never a town's, so it counts as none.
 */
export function zoneAt(latitude: number, longitude: number): string | null {
  const onEarth = Number.isFinite(latitude) && Number.isFinite(longitude) && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180;
  if (!onEarth) return null;
  const first = find(latitude, longitude)[0];
  return first && !first.startsWith("Etc/") ? first : null;
}

/**
 * The contract's `timezoneOffset`, the zone's offset today, read at noon so that a clock change's night never decides it.
 * A chart reads the offset the zone kept at the birth date (`offsetAtBirth`), never this one.
 */
export function offsetToday(zone: string, now: Date = new Date()): number {
  return offsetAtBirth(zone, now.toISOString().slice(0, 10), "12:00");
}

/** A part equal to the one before it (a city-state's city and region, say) is said once in the name. */
export function toPlace(r: NominatimResult, zone: string, now: Date = new Date()): GeocodeResult {
  const { city, region, country } = addressOf(r);
  const parts = [city, region, country].filter((s, i, arr) => s && (i === 0 || s !== arr[i - 1]));
  return {
    name: parts.join(", "),
    city,
    region,
    country,
    ...coordinatesOf(r),
    timezoneOffset: offsetToday(zone, now),
    timezone: zone,
    placeType: settlementOf(r) ?? r.type,
  };
}

/**
 * The places a search offers: every hit the table gives a zone, ranked, five at most. The zones are read before the
 * ranking, so a hit at sea never takes the place a town would have had, nor stands in for a town's own duplicate.
 */
export function placesFrom(hits: readonly NominatimResult[], now: Date = new Date()): GeocodeResult[] {
  const zoned = hits.flatMap((hit) => {
    const { latitude, longitude } = coordinatesOf(hit);
    const zone = zoneAt(latitude, longitude);
    return zone ? [{ ...hit, zone }] : [];
  });
  return rankResults(zoned).map((hit) => toPlace(hit, hit.zone, now));
}

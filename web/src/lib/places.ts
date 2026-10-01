/**
 * The place search's pure half (ADR-109). The birth form, the landing and /sky
 * render one field, so the way it ranks Nominatim's hits and the lines it shows
 * live here once, with tests; the field itself does the fetching.
 */

export interface GeocodeResult {
  name: string;
  city: string;
  region: string;
  country: string;
  latitude: number;
  longitude: number;
  timezoneOffset: number;
  /** The IANA zone name, when the zone service gave one; the engine then picks the offset for the birth date (MB-48). */
  timezone: string | null;
  /** A settlement's own type, or "administrative" for a region or a district. */
  placeType: string;
}

/** A hit as the list shows it: Nominatim gives no zone, so a match has none until the reader chooses it. */
export type Match = Omit<GeocodeResult, "timezoneOffset" | "timezone">;

/** The part of a Nominatim `format=jsonv2` hit the field reads. `json` names `category` "class", and either is read. */
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

/** What timeapi.io's coordinate lookup answers, as far as the field reads it. */
export interface TimeApiZone {
  timeZone?: string;
  currentUtcOffset?: { seconds: number };
  utcOffset?: number;
}

export interface Zone {
  timezone: string | null;
  timezoneOffset: number;
}

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

export function zoneUrl(lat: number, lon: number): string {
  return `https://timeapi.io/api/timezone/coordinate?latitude=${lat}&longitude=${lon}`;
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
export function rankResults(results: readonly NominatimResult[]): NominatimResult[] {
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

/** A part equal to the one before it (a city-state's city and region, say) is said once in the name. */
export function toMatch(r: NominatimResult): Match {
  const lat = parseFloat(r.lat);
  const lon = parseFloat(r.lon);
  const { city, region, country } = addressOf(r);
  const parts = [city, region, country].filter((s, i, arr) => s && (i === 0 || s !== arr[i - 1]));
  return {
    name: parts.join(", "),
    city,
    region,
    country,
    latitude: Math.round(lat * 10000) / 10000,
    longitude: Math.round(lon * 10000) / 10000,
    placeType: settlementOf(r) ?? r.type,
  };
}

/** The place the form gets: the match the reader chose, with the zone read for it alone. */
export function withZone(match: Match, zone: Zone): GeocodeResult {
  return { ...match, timezoneOffset: zone.timezoneOffset, timezone: zone.timezone };
}

/** A failed lookup still gives the form an offset: the hour the longitude keeps by the sun. */
export function fallbackZone(lon: number): Zone {
  return { timezone: null, timezoneOffset: Math.round(lon / 15) };
}

export function zoneFrom(data: TimeApiZone | null, lon: number): Zone {
  if (data == null) return fallbackZone(lon);
  const offset = data.currentUtcOffset?.seconds ?? data.utcOffset ?? 0;
  return { timezone: data.timeZone ?? null, timezoneOffset: offset / 3600 };
}

export function placeTypeLabel(placeType: string): string {
  if (placeType === "administrative") return "Region";
  return placeType.charAt(0).toUpperCase() + placeType.slice(1);
}

export function placeTitle(p: Match): string {
  return p.city || p.name.split(",")[0];
}

/** A region the name already says (a region's own hit, a city-state) is left out. */
function whereParts(p: Match): string[] {
  return [p.region === placeTitle(p) ? "" : p.region, p.country].filter(Boolean);
}

export function placeWhere(p: Match): string {
  return whereParts(p).join(", ");
}

/** The line under a match's name. What it is comes first, because a city, its region and its districts can share one name. */
export function placeLine(p: Match): string {
  // MB-130 provisional: no offset, since a hit has no zone and a call per match would multiply timeapi.io's calls.
  return [placeTypeLabel(p.placeType), ...whereParts(p)].join(" · ");
}

export function utcLabel(offset: number): string {
  return `UTC${offset >= 0 ? "+" : ""}${offset}`;
}

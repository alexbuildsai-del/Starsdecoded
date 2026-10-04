/**
 * The place search's pure half (ADR-109, 246). The birth form, the landing and /sky render one field, which asks our
 * server (R-7.1): it searches Nominatim, ranks the hits and reads each one's zone from its own table. What the field
 * makes of the answer, the offset it prints and the lines it shows live here once, with tests.
 */
import { offsetAtBirth } from "@workspace/engine";
import type { GeocodeResult as Answer, GeocodeSearchResponse } from "@workspace/api-client-react";
import { isTime } from "@/lib/birth-time";
import { refusalLine } from "@/lib/refusals";

/**
 * A place as the field hands it to its form: the server's answer with every part present. The server answers only
 * places with a zone (ADR-246), so a place always has one. `timezoneOffset` is the zone's offset today, never a
 * birth's: every offset printed or sent is the zone's on the birth date (reading 1), which `offsetOn` gives.
 */
export type GeocodeResult = Required<Answer>;

/** The parts the labels read, so a sky drawn from a place with no zone (a sample on local mean time) is named the same way. */
export type PlaceName = Pick<GeocodeResult, "name" | "city" | "region" | "country">;

/** Reading 1's line for a search whose places all lack a zone; the server's 422 carries the same words. */
export const NO_ZONE_LINE = "Pick a nearby town.";
export const NO_MATCH_LINE = "No matching places found. Try a different spelling or nearby city.";
export const SEARCH_FAILED_LINE = "Search failed. Please try again.";

/** The contract's floor: the server refuses a search shorter than two characters once trimmed (MB-165). */
export function searchable(text: string): boolean {
  return text.trim().length >= 2;
}

/**
 * A zone a place can carry (reading 1): not an `Etc/` zone, which the table gives a point at sea, and one this browser's
 * clock can read, since every offset is worked out here from it and the server's table may be newer than the browser.
 */
export function placeZone(zone: unknown): zone is string {
  if (typeof zone !== "string" || zone === "" || zone.startsWith("Etc/")) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

/** The places of an answer the field can offer, each part present; one without a zone it can use is left out. */
export function placesOf(answer: GeocodeSearchResponse | null): GeocodeResult[] {
  const results = Array.isArray(answer?.results) ? answer.results : [];
  return results.flatMap((r) =>
    placeZone(r.timezone)
      ? [
          {
            name: r.name,
            city: r.city ?? "",
            region: r.region ?? "",
            country: r.country ?? "",
            latitude: r.latitude,
            longitude: r.longitude,
            timezoneOffset: r.timezoneOffset,
            timezone: r.timezone,
            placeType: r.placeType,
          },
        ]
      : [],
  );
}

/**
 * What a search shows: the places it can offer, or the line that says why there are none. Places found with no zone the
 * field can use are refused as the server refuses them (ADR-246), which an API older than this web still sends.
 */
export function searchResult(answer: GeocodeSearchResponse | null): { places: GeocodeResult[]; line: string | null } {
  const places = placesOf(answer);
  if (places.length > 0) return { places, line: null };
  const found = Array.isArray(answer?.results) && answer.results.length > 0;
  return { places, line: found ? NO_ZONE_LINE : NO_MATCH_LINE };
}

/** The line for a search the server refused or could not answer: its own words where it has some for the reader. */
export function searchFailureLine(error: unknown): string {
  const status = (error as { status?: unknown } | null)?.status;
  if (status === 404) return NO_MATCH_LINE;
  if (status === 422) {
    const message = ((error as { data?: { message?: unknown } | null }).data ?? {}).message;
    return typeof message === "string" && message.trim() ? message : NO_ZONE_LINE;
  }
  return refusalLine(error) ?? SEARCH_FAILED_LINE;
}

const WHOLE_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * The card's offset (reading 2, MB-179): none until a whole birth date is typed, then the zone's on that date, at the
 * typed time or at noon without one. Brussels is UTC+1 on 4 May 1929 whatever it is today.
 */
export function offsetOn(zone: string, ymd: string, time?: string | null): number | null {
  if (!WHOLE_DATE.test(ymd)) return null;
  return offsetAtBirth(zone, ymd, time && isTime(time) ? time : "12:00");
}

export function placeTypeLabel(placeType: string): string {
  if (placeType === "administrative") return "Region";
  return placeType.charAt(0).toUpperCase() + placeType.slice(1);
}

export function placeTitle(p: PlaceName): string {
  return p.city || p.name.split(",")[0];
}

/** A region the name already says (a region's own hit, a city-state) is left out. */
function whereParts(p: PlaceName): string[] {
  return [p.region === placeTitle(p) ? "" : p.region, p.country].filter(Boolean);
}

export function placeWhere(p: PlaceName): string {
  return whereParts(p).join(", ");
}

/** The line under a match's name. What it is comes first, because a city, its region and its districts can share one name. */
export function placeLine(p: PlaceName & Pick<GeocodeResult, "placeType">): string {
  // ADR-231 (MB-130): no offset in the list. A hit's is the zone's today, which a birth in another season or era did not
  // keep; the card prints the birth date's once a place is picked and the date typed (MB-179).
  return [placeTypeLabel(p.placeType), ...whereParts(p)].join(" · ");
}

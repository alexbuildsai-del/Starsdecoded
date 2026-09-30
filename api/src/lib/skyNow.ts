import { EPHEMERIS, placeForZone, skyAt, type NatalChartData, type Place } from "@workspace/engine";

// MB-108 provisional: the waitlist page still asks the API for its wheel; the browser computes it from the engine package once GET /api/sky retires.

export interface Sky {
  place: Place;
  at: Date;
  chart: NatalChartData;
  ephemeris: string;
}

/**
 * One chart per city per minute, whoever asks: a page open in many browsers
 * costs the engine one run a minute for each city, and tzdb bounds the cities.
 */
const cache = new Map<string, Sky>();

export function skyNow(zone: string | undefined, now: Date = new Date()): Sky {
  const place = placeForZone(zone);
  const at = new Date(Math.floor(now.getTime() / 60_000) * 60_000);
  const hit = cache.get(place.zone);
  if (hit && hit.at.getTime() === at.getTime()) return hit;
  const sky: Sky = { place, at, chart: skyAt(at, place), ephemeris: EPHEMERIS };
  cache.set(place.zone, sky);
  return sky;
}

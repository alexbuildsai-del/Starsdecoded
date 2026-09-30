import { calculateNatalChart, type NatalChartData } from "./chartCalculation.js";
import { ZONE_CITIES, ZONE_LINKS } from "./zoneCities.js";

/**
 * The sky now over a visitor's city (ADR-107). The city is the one their time
 * zone names, so nothing is asked of them, and the chart is the engine's own
 * at that minute.
 */
export interface Place {
  city: string;
  zone: string;
  lat: number;
  lon: number;
}

const FALLBACK_ZONE = "Europe/London";

/** "America/Argentina/Buenos_Aires" is Buenos Aires. */
export function cityName(zone: string): string {
  return zone.slice(zone.lastIndexOf("/") + 1).replace(/_/g, " ");
}

/** The zone's own city where tzdb lists one, its link's target where it is an old name, London otherwise. */
export function placeForZone(zone?: string): Place {
  const listed = zone && ZONE_CITIES[zone] ? zone : zone ? ZONE_LINKS[zone] : undefined;
  const key = listed && ZONE_CITIES[listed] ? listed : FALLBACK_ZONE;
  const [lat, lon] = ZONE_CITIES[key];
  return { city: cityName(key), zone: key, lat, lon };
}

/** The wall-clock date and minute in a zone, as the engine takes a birth. */
export function localParts(at: Date, zone: string): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(at);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "00";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, time: `${get("hour")}:${get("minute")}` };
}

export function skyAt(at: Date, place: Place): NatalChartData {
  const { date, time } = localParts(at, place.zone);
  return calculateNatalChart(date, time, place.lat, place.lon, place.zone);
}

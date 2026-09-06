import { Router } from "express";
import { GeocodePlaceQueryParams } from "@workspace/api-zod";

const router = Router();

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
  class: string;
  type: string;
  importance?: number;
  address?: {
    country?: string;
    country_code?: string;
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

const SETTLEMENT_TYPES = new Set([
  "city",
  "town",
  "village",
  "hamlet",
  "municipality",
  "suburb",
  "neighbourhood",
  "borough",
]);

function specificityRank(r: NominatimResult): number {
  if (r.class === "place" && SETTLEMENT_TYPES.has(r.type)) {
    if (r.type === "city") return 0;
    if (r.type === "town") return 1;
    if (r.type === "village" || r.type === "municipality") return 2;
    if (r.type === "suburb" || r.type === "borough" || r.type === "neighbourhood") return 3;
    return 4;
  }
  if (r.class === "boundary" && r.type === "administrative") return 5;
  return 6;
}

async function getTimezoneOffset(lat: number, lon: number): Promise<number> {
  try {
    const url = `https://timeapi.io/api/timezone/coordinate?latitude=${lat}&longitude=${lon}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) throw new Error("Timezone API failed");
    const data = (await res.json()) as { currentUtcOffset?: { seconds: number }; utcOffset?: number };
    const offset = data.currentUtcOffset?.seconds ?? data.utcOffset ?? 0;
    return offset / 3600;
  } catch {
    return Math.round(lon / 15);
  }
}

router.get("/geocode", async (req, res) => {
  // Never cache geocode responses — prevents stale 304s when the same city
  // is searched twice (browser sends If-None-Match, Express returns 304 with
  // no body, customFetch gets null back, frontend shows "No matching places").
  res.set("Cache-Control", "no-store");

  // zod.coerce.string() converts undefined → "undefined", so validate the raw
  // query param directly before running the Zod schema.
  const rawQ = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (!rawQ) {
    return res.status(400).json({ error: "validation_error", message: "Missing required parameter: q" });
  }
  const parsed = GeocodePlaceQueryParams.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: "validation_error", message: "Missing required parameter: q" });
  }

  const query = rawQ;

  try {
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=10&addressdetails=1`;
    const nominatimRes = await fetch(nominatimUrl, {
      headers: { "User-Agent": "Astra-NatalChartApp/1.0" },
      signal: AbortSignal.timeout(8000),
    });

    if (!nominatimRes.ok) {
      return res.status(502).json({ error: "geocode_failed", message: "Geocoding service unavailable" });
    }

    const rawResults = await nominatimRes.json();
    // Nominatim can return an error object instead of an array (e.g. when rate-limited)
    if (!Array.isArray(rawResults) || rawResults.length === 0) {
      return res.status(404).json({ error: "not_found", message: "Place not found" });
    }
    const allResults = rawResults as NominatimResult[];

    // Sort by specificity (cities first, then towns/villages, then regions/states)
    const sorted = [...allResults].sort((a, b) => {
      const rankDiff = specificityRank(a) - specificityRank(b);
      if (rankDiff !== 0) return rankDiff;
      return (b.importance ?? 0) - (a.importance ?? 0);
    });

    // Take up to 5 candidates, deduplicating by (city, country) pair
    const seen = new Set<string>();
    const candidates = sorted
      .filter((r) => {
        const addr = r.address ?? {};
        const cityName = addr.city ?? addr.town ?? addr.village ?? addr.hamlet ?? addr.municipality ?? addr.suburb ?? r.display_name.split(",")[0].trim();
        const region = addr.state ?? addr.region ?? addr.county ?? addr.state_district ?? "";
        const country = addr.country ?? "";
        const key = `${cityName.toLowerCase()}|${region.toLowerCase()}|${country.toLowerCase()}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 5);

    // Resolve timezone for each candidate in parallel
    const results = await Promise.all(
      candidates.map(async (place) => {
        const lat = parseFloat(place.lat);
        const lon = parseFloat(place.lon);
        const addr = place.address ?? {};
        const city = addr.city ?? addr.town ?? addr.village ?? addr.hamlet ?? addr.municipality ?? addr.suburb ?? place.display_name.split(",")[0].trim();
        const region = addr.state ?? addr.region ?? addr.county ?? addr.state_district ?? "";
        const country = addr.country ?? "";

        const parts = [city, region, country].filter((s, i, arr) => s && (i === 0 || s !== arr[i - 1]));
        const displayName = parts.join(", ");

        const timezoneOffset = await getTimezoneOffset(lat, lon);

        return {
          name: displayName,
          city,
          region,
          country,
          latitude: Math.round(lat * 10000) / 10000,
          longitude: Math.round(lon * 10000) / 10000,
          timezoneOffset,
          placeType: place.type,
        };
      }),
    );

    return res.json({ results });
  } catch (err) {
    req.log.error({ err }, "Geocoding failed");
    return res.status(500).json({ error: "internal_error", message: "Geocoding failed" });
  }
});

export default router;

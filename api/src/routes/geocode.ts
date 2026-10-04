import { Router } from "express";
import { GeocodePlaceQueryParams } from "@workspace/api-zod";
import { validationFailure } from "../lib/validation.js";
import { isNominatimHit, nominatimUrl, placesFrom } from "../lib/places.js";

const router = Router();

// Nominatim's usage policy asks every caller to name itself.
const USER_AGENT = "StarsDecoded/1.0 (natal chart app)";

/** What the place field says when every place found lies where the zone table has no zone (ADR-246, reading 1). */
const NO_ZONE_LINE = "Pick a nearby town.";

const UNAVAILABLE = { error: "geocode_failed", message: "Geocoding service unavailable" } as const;

/**
 * The browser asked Nominatim itself until ADR-246, and so got place names in the reader's language; passing their
 * Accept-Language on keeps that. A value that is not a plain list of language tags stays behind.
 */
function languageOf(header: string | undefined): Record<string, string> {
  return header && /^[\w*,;=. -]{1,200}$/.test(header) ? { "Accept-Language": header } : {};
}

router.get("/geocode", async (req, res) => {
  // Never cache geocode responses — prevents stale 304s when the same city
  // is searched twice (browser sends If-None-Match, Express returns 304 with
  // no body, customFetch gets null back, frontend shows "No matching places").
  res.set("Cache-Control", "no-store");

  // The schema reads the trimmed text: zod.coerce.string() would pass a missing q as "undefined", and the contract's two
  // characters must hold for what is searched, not for its padding.
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  // MB-165 provisional: a one-letter search is refused here, before Nominatim is asked.
  const parsed = GeocodePlaceQueryParams.safeParse({ q });
  if (!parsed.success) {
    return res.status(400).json(validationFailure(parsed.error));
  }

  // Nominatim down, refusing, or answering with anything but a list of hits is a 502: the reader is told the search
  // failed, never that their town does not exist. The sentinel reads this route, so a line holds a status or an error's
  // class, never what was typed.
  let hits: unknown;
  try {
    const answer = await fetch(nominatimUrl(parsed.data.q), {
      headers: { "User-Agent": USER_AGENT, ...languageOf(req.header("accept-language")) },
      signal: AbortSignal.timeout(8000),
    });
    if (!answer.ok) {
      req.log.warn({ upstream: "nominatim", status: answer.status }, "Geocoding service refused");
      return res.status(502).json(UNAVAILABLE);
    }
    hits = await answer.json();
  } catch (err) {
    req.log.warn({ upstream: "nominatim", failure: err instanceof Error ? err.name : typeof err }, "Geocoding service unreachable");
    return res.status(502).json(UNAVAILABLE);
  }
  if (!Array.isArray(hits) || !hits.every(isNominatimHit)) {
    req.log.warn({ upstream: "nominatim" }, "Geocoding service answered no list of places");
    return res.status(502).json(UNAVAILABLE);
  }
  if (hits.length === 0) {
    return res.status(404).json({ error: "not_found", message: "Place not found" });
  }

  try {
    const results = placesFrom(hits);
    if (results.length === 0) {
      return res.status(422).json({ error: "no_zone", message: NO_ZONE_LINE });
    }
    return res.json({ results });
  } catch (err) {
    const { name, code } = (err ?? {}) as { name?: unknown; code?: unknown };
    req.log.error({ failure: typeof name === "string" ? name : "unknown", code: typeof code === "string" ? code : undefined }, "Geocoding failed");
    return res.status(500).json({ error: "internal_error", message: "Geocoding failed" });
  }
});

export default router;

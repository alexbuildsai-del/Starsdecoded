import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Building2, Check, Landmark, Loader2, MapPin, Search, Trees, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  SETTLEMENT_TYPES,
  fallbackZone,
  matchesLabel,
  nominatimUrl,
  placeTitle,
  placeTypeLabel,
  placeWhere,
  rankResults,
  toPlace,
  utcLabel,
  zoneFrom,
  zoneUrl,
  type GeocodeResult,
  type NominatimResult,
  type TimeApiZone,
  type Zone,
} from "@/lib/places";

export interface PlaceFieldProps {
  id: string;
  value: GeocodeResult | null;
  onChange: (place: GeocodeResult | null) => void;
  label?: string;
}

async function lookupZone(lat: number, lon: number): Promise<Zone> {
  try {
    const res = await fetch(zoneUrl(lat, lon), { signal: AbortSignal.timeout(4000) });
    if (!res.ok) throw new Error("Timezone API failed");
    return zoneFrom((await res.json()) as TimeApiZone | null, lon);
  } catch {
    return fallbackZone(lon);
  }
}

function placeIcon(placeType: string) {
  if (placeType === "city" || placeType === "town" || placeType === "borough") return Building2;
  if (placeType === "village" || placeType === "hamlet" || placeType === "municipality") return Trees;
  if (SETTLEMENT_TYPES.has(placeType)) return MapPin;
  return Landmark;
}

/**
 * The one place field (ADR-109): the birth form's search, which the landing
 * and /sky render as it is. The chosen place is the caller's, so a place it
 * hands in (a prefill, the visitor's own city) shows as chosen; the typed text
 * and the list are the field's own.
 */
export function PlaceField({ id, value, onChange, label = "Birth Place" }: PlaceFieldProps) {
  const [query, setQuery] = useState(value?.name ?? "");
  const [shown, setShown] = useState(value);
  const [candidates, setCandidates] = useState<GeocodeResult[]>([]);
  const [placeError, setPlaceError] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isPendingSearch, setIsPendingSearch] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestSearch = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // The chosen place is the caller's: its prefill must show in the box, and its reset must not leave a name standing
  // with nothing chosen behind it. Text the reader has typed since is theirs and stays.
  if (value !== shown) {
    setShown(value);
    if (value) setQuery(value.name);
    else if (shown && query === shown.name) setQuery("");
  }

  const doSearch = useCallback(async (text: string) => {
    if (!text || text.length < 2) return;
    const search = ++latestSearch.current;
    const stale = () => search !== latestSearch.current;
    setIsPendingSearch(false);
    setIsSearching(true);
    setPlaceError("");
    try {
      const res = await fetch(nominatimUrl(text), { signal: AbortSignal.timeout(8000) });
      if (!res.ok) throw new Error("Nominatim error");
      const raw: unknown = await res.json();
      if (stale()) return;
      if (!Array.isArray(raw) || raw.length === 0) {
        setPlaceError("No matching places found. Try a different spelling or nearby city.");
        setCandidates([]);
        setShowDropdown(false);
        return;
      }
      const results = await Promise.all(
        rankResults(raw as NominatimResult[]).map(async (hit) =>
          toPlace(hit, await lookupZone(parseFloat(hit.lat), parseFloat(hit.lon))),
        ),
      );
      if (stale()) return;
      setCandidates(results);
      setShowDropdown(true);
    } catch {
      if (stale()) return;
      setPlaceError("Search failed — please try again.");
      setCandidates([]);
      setShowDropdown(false);
    } finally {
      if (!stale()) setIsSearching(false);
    }
  }, []);

  // A reply to an older query, or a search still waiting to go, must not reopen the list over newer text or a chosen place.
  const dropSearches = () => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    latestSearch.current++;
    setIsPendingSearch(false);
    setIsSearching(false);
  };

  // Leaving the page must not send a search the reader will never see: Nominatim's policy counts every call.
  useEffect(
    () => () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
      latestSearch.current++;
    },
    [],
  );

  const handlePlaceInput = (text: string) => {
    dropSearches();
    setQuery(text);
    if (value) onChange(null);
    setPlaceError("");
    if (text.length >= 2) {
      setIsPendingSearch(true);
      searchTimer.current = setTimeout(() => doSearch(text), 600);
    } else {
      setCandidates([]);
      setShowDropdown(false);
    }
  };

  const handleSearchButton = () => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (query.length >= 2) doSearch(query);
  };

  const selectCandidate = (place: GeocodeResult) => {
    dropSearches();
    onChange(place);
    setQuery(place.name);
    setShowDropdown(false);
    setCandidates([]);
  };

  const clearPlace = () => {
    dropSearches();
    setQuery("");
    setCandidates([]);
    if (value) onChange(null);
    setPlaceError("");
    setShowDropdown(false);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="space-y-2" ref={containerRef}>
      <Label htmlFor={id} className="font-label text-xs tracking-wide uppercase text-muted-foreground">
        {label}
      </Label>
      <div className="relative">
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
          {isSearching || isPendingSearch ? (
            <Loader2 className="h-4 w-4 text-primary animate-spin" />
          ) : value ? (
            <MapPin className="h-4 w-4 text-primary" />
          ) : (
            <Search className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
        {/* 16 px below md, whatever the page around it: iOS zooms into a smaller input on focus (landing, Fields fit). */}
        <Input
          id={id}
          type="text"
          value={query}
          onChange={(e) => handlePlaceInput(e.target.value)}
          onFocus={() => candidates.length > 0 && setShowDropdown(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleSearchButton();
            }
          }}
          placeholder="Type a city name, e.g. Milan, Rome…"
          className="bg-card border-border/60 text-foreground placeholder:text-muted-foreground/50 h-12 text-base md:text-sm pl-10 pr-24"
          autoComplete="off"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {query && !isSearching && !isPendingSearch && (
            <button
              type="button"
              onClick={clearPlace}
              className="text-muted-foreground hover:text-foreground p-1"
              aria-label="Clear"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          {query.length >= 2 && !value && (
            <button
              type="button"
              onClick={handleSearchButton}
              disabled={isSearching || isPendingSearch}
              className="text-xs font-label font-semibold px-2 py-1 rounded-md bg-primary/15 text-primary hover:bg-primary/25 disabled:opacity-40 transition-colors"
            >
              Search
            </button>
          )}
        </div>

        <AnimatePresence>
          {showDropdown && candidates.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              data-testid="city-dropdown"
              className="absolute left-0 right-0 top-full mt-1.5 z-20 rounded-xl border border-border/60 bg-card/95 backdrop-blur-md shadow-2xl shadow-black/40 overflow-hidden max-h-80 overflow-y-auto"
            >
              <div className="px-3 py-2 border-b border-border/40 flex items-center justify-between">
                <span className="text-[11px] font-label tracking-wider uppercase text-muted-foreground">
                  {matchesLabel(candidates.length)}
                </span>
                <button
                  type="button"
                  onClick={() => setShowDropdown(false)}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label="Close suggestions"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <ul>
                {candidates.map((c, idx) => {
                  const Icon = placeIcon(c.placeType);
                  const isSettlement = SETTLEMENT_TYPES.has(c.placeType);
                  return (
                    <li key={`${c.latitude}-${c.longitude}-${idx}`}>
                      <button
                        type="button"
                        onClick={() => selectCandidate(c)}
                        className="w-full text-left px-3 py-2.5 hover:bg-primary/10 transition-colors flex items-start gap-3 group"
                      >
                        <div className={`mt-0.5 flex-shrink-0 rounded-md p-1.5 ${isSettlement ? "bg-primary/15 text-primary" : "bg-muted/40 text-muted-foreground"}`}>
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-foreground font-medium truncate">
                              {placeTitle(c)}
                            </span>
                            <span className={`text-[10px] font-label uppercase tracking-wider px-1.5 py-0.5 rounded ${isSettlement ? "bg-primary/15 text-primary" : "bg-muted/40 text-muted-foreground"}`}>
                              {placeTypeLabel(c.placeType)}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground truncate mt-0.5">
                            {placeWhere(c)}
                          </div>
                        </div>
                        <div className="text-[10px] text-muted-foreground/70 font-label flex-shrink-0 mt-1">
                          {utcLabel(c.timezoneOffset)}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
              {/* Nominatim's policy asks for the credit wherever its places show (ADR-109); held at the foot so a scrolled list keeps it. */}
              <p className="sticky bottom-0 border-t border-border/40 bg-card px-3 py-2 text-[11px] font-numeric tracking-wide text-muted-foreground">
                <a
                  href="https://www.openstreetmap.org/copyright"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground transition-colors"
                >
                  © OpenStreetMap contributors
                </a>
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* A place handed in on the first render shows at once, so a prerendered page does not shift as it hydrates. */}
      <AnimatePresence initial={false}>
        {value && (
          <motion.div
            key="chosen"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20 flex items-center gap-2 text-sm">
              <Check className="h-3.5 w-3.5 text-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-foreground font-medium truncate">{placeTitle(value)}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {placeWhere(value)} · <span className="font-numeric">{value.latitude.toFixed(2)}°, {value.longitude.toFixed(2)}°</span>
                </div>
              </div>
              <span className="text-muted-foreground text-xs font-label">
                {utcLabel(value.timezoneOffset)}
              </span>
            </div>
          </motion.div>
        )}
        {placeError && (
          <motion.p
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-sm text-destructive mt-1"
          >
            {placeError}
          </motion.p>
        )}
      </AnimatePresence>

      {!value && !placeError && query.length >= 2 && !isSearching && !isPendingSearch && candidates.length === 0 && (
        <p className="text-xs text-muted-foreground mt-1">
          Press Enter or tap Search to find matching cities.
        </p>
      )}
    </div>
  );
}

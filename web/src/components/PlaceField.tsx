import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Loader2, MapPin, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  fallbackZone,
  nominatimUrl,
  placeLine,
  placeTitle,
  placeWhere,
  rankResults,
  toMatch,
  utcLabel,
  withZone,
  zoneFrom,
  zoneUrl,
  type GeocodeResult,
  type Match,
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

/**
 * The one place field (ADR-109): the birth form's search, which the landing
 * and /sky render as it is. The chosen place is the caller's, so a place it
 * hands in (a prefill, the visitor's own city) shows as chosen; the typed text
 * and the list are the field's own.
 */
export function PlaceField({ id, value, onChange, label = "Birth Place" }: PlaceFieldProps) {
  const [query, setQuery] = useState(value?.name ?? "");
  const [shown, setShown] = useState(value);
  const [candidates, setCandidates] = useState<Match[]>([]);
  const [placeError, setPlaceError] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isPendingSearch, setIsPendingSearch] = useState(false);
  const [isChoosing, setIsChoosing] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestSearch = useRef(0);
  const latestChoice = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  // The zone comes after the tap, and the form may have changed meanwhile (an error up that the place should clear), so a
  // choice reaches the caller's handler as it is when the zone arrives, not as the tap saw it.
  const latestOnChange = useRef(onChange);
  useEffect(() => {
    latestOnChange.current = onChange;
  });

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
      setCandidates(rankResults(raw as NominatimResult[]).map(toMatch));
      setShowDropdown(true);
    } catch {
      if (stale()) return;
      setPlaceError("Search failed. Please try again.");
      setCandidates([]);
      setShowDropdown(false);
    } finally {
      if (!stale()) setIsSearching(false);
    }
  }, []);

  // A reply to an older query, or a search still waiting to go, must not reopen the list over newer text or a chosen place;
  // and a zone still on its way must not choose a place the reader has since typed over.
  const dropSearches = () => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    latestSearch.current++;
    latestChoice.current++;
    setIsPendingSearch(false);
    setIsSearching(false);
    setIsChoosing(false);
  };

  // Leaving the page must not send a search the reader will never see: Nominatim's policy counts every call.
  useEffect(
    () => () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
      latestSearch.current++;
      latestChoice.current++;
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
    if (isChoosing) return;
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (query.length >= 2) doSearch(query);
  };

  // MB-130 provisional: the list shows hits with no zone, since one timeapi.io call per match would multiply the calls;
  // the zone is read once, for the place chosen, and the place is the form's only when it arrives (or falls back).
  const selectCandidate = async (match: Match) => {
    dropSearches();
    const choice = ++latestChoice.current;
    setQuery(match.name);
    setShowDropdown(false);
    setCandidates([]);
    setIsChoosing(true);
    const zone = await lookupZone(match.latitude, match.longitude);
    if (choice !== latestChoice.current) return;
    setIsChoosing(false);
    latestOnChange.current(withZone(match, zone));
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
          {isSearching || isPendingSearch || isChoosing ? (
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
              className="text-muted-foreground hover:text-foreground p-1.5"
              aria-label="Clear"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          {query.length >= 2 && !value && !isChoosing && (
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
              className="absolute left-0 right-0 top-full mt-1.5 z-20 rounded-xl border border-border/60 bg-card shadow-2xl shadow-black/40 overflow-hidden max-h-80 overflow-y-auto"
            >
              <div className="flex items-center justify-between gap-3 border-b border-border/60 px-3.5 py-2.5">
                <span className="font-label text-[10.5px] tracking-[.12em] uppercase text-muted-foreground">Pick the exact place</span>
                <button
                  type="button"
                  onClick={() => setShowDropdown(false)}
                  className="text-muted-foreground hover:text-foreground p-1.5 -m-1.5"
                  aria-label="Close suggestions"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              {/* A match is one column, so a long name wraps in the list's full width instead of sharing its row with a zone. */}
              <ul>
                {candidates.map((m, idx) => (
                  <li key={`${m.latitude}-${m.longitude}-${idx}`} className="border-b border-border/60 last:border-b-0">
                    <button
                      type="button"
                      onClick={() => selectCandidate(m)}
                      className="block w-full px-3.5 py-[11px] text-left transition-colors hover:bg-primary/10 focus-visible:bg-primary/10 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary"
                    >
                      <span className="block text-[15.5px] leading-snug text-foreground break-words">{placeTitle(m)}</span>
                      <span className="mt-0.5 block font-numeric text-[11.5px] leading-snug tracking-[.04em] uppercase text-muted-foreground break-words">
                        {placeLine(m)}
                      </span>
                    </button>
                  </li>
                ))}
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
            <div className="mt-2 flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/10 px-3 py-2 text-sm">
              <Check className="mt-1 h-3.5 w-3.5 flex-shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <div className="font-medium text-foreground break-words">{placeTitle(value)}</div>
                <div className="text-xs text-muted-foreground break-words">
                  {placeWhere(value) ? `${placeWhere(value)} · ` : ""}
                  <span className="font-numeric">
                    {value.latitude.toFixed(2)}°, {value.longitude.toFixed(2)}° · {utcLabel(value.timezoneOffset)}
                  </span>
                </div>
              </div>
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

      {!value && !placeError && query.length >= 2 && !isSearching && !isPendingSearch && !isChoosing && candidates.length === 0 && (
        <p className="text-xs text-muted-foreground mt-1">
          Press Enter or tap Search to find matching cities.
        </p>
      )}
    </div>
  );
}

import { useState, useCallback, useRef, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, MapPin, Loader2, Search, X, Check, Building2, Trees, Landmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateReport, useListProfiles, getListProfilesQueryKey } from "@workspace/api-client-react";

interface GeocodeResult {
  name: string;
  city: string;
  region: string;
  country: string;
  latitude: number;
  longitude: number;
  timezoneOffset: number;
  placeType: string;
}

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
  class: string;
  type: string;
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

function placeIcon(placeType: string) {
  if (placeType === "city" || placeType === "town" || placeType === "borough") return Building2;
  if (placeType === "village" || placeType === "hamlet" || placeType === "municipality") return Trees;
  if (SETTLEMENT_TYPES.has(placeType)) return MapPin;
  return Landmark;
}

function placeLabel(placeType: string): string {
  if (placeType === "administrative") return "Region";
  return placeType.charAt(0).toUpperCase() + placeType.slice(1);
}

export default function BirthFormPage() {
  const [, navigate] = useLocation();
  // ?self=1 means the user arrived from the "Generate My Chart" CTA — pre-check the toggle.
  // wouter's useLocation() only returns the pathname, so the query string must
  // come from useSearch().
  const search = useSearch();
  const selfFromUrl = new URLSearchParams(search).get("self") === "1";

  // Default toggle to true (optimistic); flip to false once we confirm a self-profile exists.
  const [isSelf, setIsSelf] = useState(true);
  const [selfInitialized, setSelfInitialized] = useState(selfFromUrl);

  const { data: profiles } = useListProfiles({
    query: { queryKey: getListProfilesQueryKey(), staleTime: 60_000 },
  });

  useEffect(() => {
    // Guard with Array.isArray: a body-less response (e.g. a 304) resolves to
    // null rather than an array and must not crash the page.
    if (!selfInitialized && Array.isArray(profiles)) {
      const hasSelfProfile = profiles.some((p) => p.isSelf);
      setIsSelf(!hasSelfProfile);
      setSelfInitialized(true);
    }
  }, [profiles, selfInitialized]);

  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [birthTime, setBirthTime] = useState("");
  const [placeQuery, setPlaceQuery] = useState("");
  const [candidates, setCandidates] = useState<GeocodeResult[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<GeocodeResult | null>(null);
  const [placeError, setPlaceError] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isPendingSearch, setIsPendingSearch] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const createReport = useCreateReport({
    mutation: {
      onSuccess: (data) => {
        navigate(`/generating/${data.id}`);
      },
      onError: (err) => {
        console.error("[BirthForm] createReport failed:", err);
      },
    },
  });

  const doSearch = useCallback(async (query: string) => {
    if (!query || query.length < 2) return;
    setIsPendingSearch(false);
    setIsSearching(true);
    setPlaceError("");
    try {
      const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=10&addressdetails=1`;
      const nominatimRes = await fetch(nominatimUrl, { signal: AbortSignal.timeout(8000) });
      if (!nominatimRes.ok) throw new Error("Nominatim error");
      const rawResults = await nominatimRes.json();
      if (!Array.isArray(rawResults) || rawResults.length === 0) {
        setPlaceError("No matching places found. Try a different spelling or nearby city.");
        setCandidates([]);
        setShowDropdown(false);
        return;
      }
      const allResults = rawResults as NominatimResult[];

      const sorted = [...allResults].sort((a, b) => {
        const rankDiff = specificityRank(a) - specificityRank(b);
        if (rankDiff !== 0) return rankDiff;
        return (b.importance ?? 0) - (a.importance ?? 0);
      });

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
          } satisfies GeocodeResult;
        }),
      );

      setCandidates(results);
      setShowDropdown(true);
    } catch {
      setPlaceError("Search failed — please try again.");
      setCandidates([]);
      setShowDropdown(false);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handlePlaceInput = (value: string) => {
    setPlaceQuery(value);
    setSelectedPlace(null);
    setPlaceError("");
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (value.length >= 2) {
      setIsPendingSearch(true);
      searchTimer.current = setTimeout(() => doSearch(value), 600);
    } else {
      setIsPendingSearch(false);
      setCandidates([]);
      setShowDropdown(false);
    }
  };

  const handleSearchButton = () => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (placeQuery.length >= 2) doSearch(placeQuery);
  };

  const selectCandidate = (place: GeocodeResult) => {
    setSelectedPlace(place);
    setPlaceQuery(place.name);
    setShowDropdown(false);
    setCandidates([]);
  };

  const clearPlace = () => {
    setPlaceQuery("");
    setCandidates([]);
    setSelectedPlace(null);
    setPlaceError("");
    setShowDropdown(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const canSubmit = name.trim() && birthDate && birthTime && selectedPlace;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !selectedPlace) return;

    createReport.mutate({
      data: {
        name: name.trim(),
        birthDate,
        birthTime,
        birthPlace: selectedPlace.name,
        latitude: selectedPlace.latitude,
        longitude: selectedPlace.longitude,
        timezoneOffset: selectedPlace.timezoneOffset,
        isForSelf: isSelf,
      },
    });
  };

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="min-h-screen bg-background bg-stars flex flex-col">
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center gap-4">
          <button
            onClick={() => navigate("/")}
            className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5 text-sm font-label"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <span className="font-display text-lg gradient-text">Astra</span>
        </div>
      </nav>

      <div className="flex-1 flex items-center justify-center px-6 pt-20 pb-10">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-lg"
        >
          <div className="text-center mb-10">
            <p className="font-label text-xs tracking-[0.2em] uppercase text-primary/80 mb-3">
              Natal Chart Report
            </p>
            <h1 className="font-display text-4xl font-light leading-tight mb-3">
              Enter your birth details
            </h1>
            <p className="text-muted-foreground text-sm">
              Accurate birth time and place are essential for a precise chart.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name" className="font-label text-xs tracking-wide uppercase text-muted-foreground">
                Your Name
              </Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="First name or full name"
                className="bg-card border-border/60 text-foreground placeholder:text-muted-foreground/50 h-12 text-base"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="birthDate" className="font-label text-xs tracking-wide uppercase text-muted-foreground">
                  Birth Date
                </Label>
                <Input
                  id="birthDate"
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  max={today}
                  className="bg-card border-border/60 text-foreground h-12 text-base [color-scheme:dark]"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="birthTime" className="font-label text-xs tracking-wide uppercase text-muted-foreground">
                  Birth Time
                </Label>
                <Input
                  id="birthTime"
                  type="time"
                  value={birthTime}
                  onChange={(e) => setBirthTime(e.target.value)}
                  className="bg-card border-border/60 text-foreground h-12 text-base [color-scheme:dark]"
                  required
                />
              </div>
            </div>

            <div className="space-y-2" ref={containerRef}>
              <Label htmlFor="birthPlace" className="font-label text-xs tracking-wide uppercase text-muted-foreground">
                Birth Place
              </Label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                  {isSearching || isPendingSearch ? (
                    <Loader2 className="h-4 w-4 text-primary animate-spin" />
                  ) : selectedPlace ? (
                    <MapPin className="h-4 w-4 text-primary" />
                  ) : (
                    <Search className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <Input
                  id="birthPlace"
                  type="text"
                  value={placeQuery}
                  onChange={(e) => handlePlaceInput(e.target.value)}
                  onFocus={() => candidates.length > 0 && setShowDropdown(true)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleSearchButton();
                    }
                  }}
                  placeholder="Type a city name, e.g. Milan, Rome…"
                  className="bg-card border-border/60 text-foreground placeholder:text-muted-foreground/50 h-12 text-base pl-10 pr-24"
                  autoComplete="off"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  {placeQuery && !isSearching && !isPendingSearch && (
                    <button
                      type="button"
                      onClick={clearPlace}
                      className="text-muted-foreground hover:text-foreground p-1"
                      aria-label="Clear"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {placeQuery.length >= 2 && !selectedPlace && (
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

                {/* Dropdown of candidates */}
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
                          {candidates.length} match{candidates.length !== 1 ? "es" : ""} — pick the exact city
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
                                      {c.city || c.name.split(",")[0]}
                                    </span>
                                    <span className={`text-[10px] font-label uppercase tracking-wider px-1.5 py-0.5 rounded ${isSettlement ? "bg-primary/15 text-primary" : "bg-muted/40 text-muted-foreground"}`}>
                                      {placeLabel(c.placeType)}
                                    </span>
                                  </div>
                                  <div className="text-xs text-muted-foreground truncate mt-0.5">
                                    {[c.region, c.country].filter(Boolean).join(", ")}
                                  </div>
                                </div>
                                <div className="text-[10px] text-muted-foreground/70 font-label flex-shrink-0 mt-1">
                                  UTC{c.timezoneOffset >= 0 ? "+" : ""}{c.timezoneOffset}
                                </div>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <AnimatePresence>
                {selectedPlace && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20 flex items-center gap-2 text-sm">
                      <Check className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-foreground font-medium truncate">{selectedPlace.city || selectedPlace.name.split(",")[0]}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {[selectedPlace.region, selectedPlace.country].filter(Boolean).join(", ")} · {selectedPlace.latitude.toFixed(2)}°, {selectedPlace.longitude.toFixed(2)}°
                        </div>
                      </div>
                      <span className="text-muted-foreground text-xs font-label">
                        UTC{selectedPlace.timezoneOffset >= 0 ? "+" : ""}{selectedPlace.timezoneOffset}
                      </span>
                    </div>
                  </motion.div>
                )}
                {placeError && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-sm text-destructive mt-1"
                  >
                    {placeError}
                  </motion.p>
                )}
              </AnimatePresence>

              {!selectedPlace && !placeError && placeQuery.length >= 2 && !isSearching && !isPendingSearch && candidates.length === 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Press Enter or tap Search to find matching cities.
                </p>
              )}
            </div>

            <p className="text-xs text-muted-foreground bg-muted/30 rounded-lg px-4 py-3 leading-relaxed">
              <strong className="text-foreground">Note:</strong> Birth time significantly affects your Ascendant, house placements, and the accuracy of your psychological profile. If unknown, use noon (12:00).
            </p>

            {/* "This chart is for me" toggle */}
            <button
              type="button"
              onClick={() => setIsSelf((v) => !v)}
              className={`w-full flex items-center gap-3 rounded-xl border px-4 py-3.5 transition-colors text-left ${
                isSelf
                  ? "border-primary/40 bg-primary/8"
                  : "border-border/40 bg-card/40 hover:border-border/60"
              }`}
            >
              <div className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                isSelf ? "bg-primary border-primary" : "border-muted-foreground/40 bg-transparent"
              }`}>
                {isSelf && <Check className="h-3 w-3 text-white" />}
              </div>
              <div>
                <p className={`text-sm font-medium leading-tight ${isSelf ? "text-foreground" : "text-muted-foreground"}`}>
                  This is my natal chart
                </p>
                <p className="text-xs text-muted-foreground/70 mt-0.5 leading-tight">
                  Saves this chart as yours on your profile
                </p>
              </div>
            </button>

            <Button
              type="submit"
              disabled={!canSubmit || createReport.isPending}
              className="w-full gradient-primary text-white border-0 font-label font-semibold h-14 text-base"
            >
              {createReport.isPending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  Generate My Report · €24
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>

            {createReport.isError && (
              <div className="text-sm text-destructive text-center space-y-1">
                <p>Something went wrong. Please try again.</p>
                <p className="text-xs opacity-80 font-mono break-all">
                  {createReport.error instanceof Error
                    ? createReport.error.message
                    : String(createReport.error)}
                </p>
              </div>
            )}
          </form>
        </motion.div>
      </div>
    </div>
  );
}

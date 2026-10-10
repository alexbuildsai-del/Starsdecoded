/**
 * The birth fields (ADR-222, ADR-109): the typed date, the typed time with the three-way
 * answer and the part-of-day pills, and our own place search. One label style, edges you can
 * see, Search as a compact Button. The behaviour is the old files' and their tests': the
 * rules live in lib/date-entry, lib/birth-time and lib/places; the old component paths
 * re-export from here.
 */
import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useReducer, useRef, useState, type ChangeEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Loader2, MapPin, Search, X } from "lucide-react";
import { geocodePlace, usePreviewHorizon } from "@workspace/api-client-react";
import { Button } from "@/ds/atoms/Button";
import { FIELD_LABEL, Input } from "@/ds/atoms/Input";
import { useEntryFormat } from "@/hooks/useEntryFormat";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import {
  TIME_PATTERN, dateDigits, dateNote, datePattern, dateText, localDay, pickHalf, stepDate, stepTime, timeNote, timeState, timeText,
  type Half, type TimeState,
} from "@/lib/date-entry";
import {
  MODE_LABELS, partLabels, readout, toValue,
  type BirthTimeAnswer, type BirthTimeMode, type PartOfDay,
} from "@/lib/birth-time";
import { hintFor } from "@/lib/birth-record-hints";
import {
  offsetOn,
  placeLine,
  placeTitle,
  placeWhere,
  searchFailureLine,
  searchResult,
  searchable,
  type GeocodeResult,
} from "@/lib/places";
import { utcLine } from "@/lib/sky-now";
import { cn } from "@/lib/utils";
import type { Horizon } from "@/types/chart";

// 16 px at every width, so a phone never zooms into the field (ADR-171); the time field wears the same.
const ENTRY_FIELD = "font-numeric";

// The chosen choice in a row of pills or tiles: Chip's selected look.
const CHOSEN = "border-indigo bg-indigo/20 text-paper";
const PILL = "flex min-h-11 cursor-pointer select-none items-center rounded-pill border px-4 text-sm transition-colors duration-(--dur-fast) has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus";

export interface BirthDateFieldProps {
  id: string;
  /** "YYYY-MM-DD", or "" while the field holds no whole, real date in range. */
  value: string;
  onChange: (value: string) => void;
  /** Typing or pasting finished a valid date: the form moves focus on to the time. */
  onComplete?: () => void;
  /** The first and last dates the form takes, "YYYY-MM-DD". */
  min?: string;
  max?: string;
  /** A hint the form already shows, read after the field's own readout. */
  describedBy?: string;
}

export function BirthDateField({ id, value, onChange, onComplete, min, max, describedBy }: BirthDateFieldProps) {
  const { order } = useEntryFormat();
  const [digits, setDigits] = useState(() => dateDigits(value, order));
  const [left, setLeft] = useState(false);
  const [refused, setRefused] = useState(false);
  // Every change renders, even one the field refuses, so the caret is put back where it belongs.
  const [, rendered] = useReducer((n: number) => n + 1, 0);
  const input = useRef<HTMLInputElement>(null);
  const caret = useRef<number | null>(null);
  // The value this field last stood for, so a value the form sets is told apart from one the field sent.
  const stood = useRef(value);
  const laidFor = useRef(order);

  useEffect(() => {
    if (value === stood.current) return;
    stood.current = value;
    setDigits(dateDigits(value, order));
    setRefused(false);
  }, [value, order]);

  // The browser's order arrives after hydration; a whole date is laid out again in it.
  useEffect(() => {
    if (order === laidFor.current) return;
    laidFor.current = order;
    if (stood.current) setDigits(dateDigits(stood.current, order));
  }, [order]);

  useLayoutEffect(() => {
    const at = caret.current;
    caret.current = null;
    const el = input.current;
    if (at !== null && el && el.ownerDocument.activeElement === el) el.setSelectionRange(at, at);
  });

  const text = dateText(digits, order);
  const range = { min, max };
  const note = dateNote(digits, order, { range, today: localDay(new Date()), left, refused });
  const noteId = `${id}-note`;

  const change = (event: ChangeEvent<HTMLInputElement>) => {
    const el = event.currentTarget;
    const step = stepDate(
      digits,
      {
        shown: text,
        text: el.value,
        caret: el.selectionStart ?? el.value.length,
        inputType: (event.nativeEvent as InputEvent).inputType,
      },
      order,
      range,
    );
    caret.current = step.caret;
    setDigits(step.digits);
    setLeft(false);
    setRefused(step.refused);
    rendered();
    if (step.value !== stood.current) {
      stood.current = step.value;
      onChange(step.value);
    }
    if (step.done) onComplete?.();
  };

  return (
    <div className="grid min-w-0 gap-1.5">
      <Input
        ref={input}
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        spellCheck={false}
        placeholder={datePattern(order)}
        value={text}
        onChange={change}
        onBlur={() => setLeft(true)}
        aria-invalid={note?.kind === "problem" || undefined}
        aria-describedby={describedBy ? `${noteId} ${describedBy}` : noteId}
        className={ENTRY_FIELD}
      />
      {/* The line is kept when empty, so the readout arriving never moves the fields below it. */}
      <p className="min-h-[18px] text-[12.5px] leading-[18px]">
        <span id={noteId} aria-live="polite" className={note?.kind === "problem" ? "text-error" : "text-muted"}>
          {note && note.kind !== "order" ? note.text : ""}
        </span>
        {/* The placeholder has gone by the first digit, so the order stays in sight while the rest go in. Screen
            readers heard it as the placeholder, and the readout follows. */}
        {note?.kind === "order" ? <span aria-hidden="true" className="text-muted">{note.text}</span> : null}
      </p>
    </div>
  );
}


export interface BirthTimeFieldProps {
  id: string;
  /** "HH:MM" on the 24-hour clock, or "" while the field holds no real time. */
  value: string;
  onChange: (value: string) => void;
  /**
   * Typing, a paste or a tap on the switch finished a valid time, with its half
   * set on a 12-hour clock: the form moves focus on to its next step.
   */
  onComplete?: () => void;
  /** A hint the form already shows, read after the field's own note. */
  describedBy?: string;
}

const HALVES: readonly Half[] = ["am", "pm"];

export function BirthTimeField({ id, value, onChange, onComplete, describedBy }: BirthTimeFieldProps) {
  const { clock } = useEntryFormat();
  const [state, setState] = useState<TimeState>(() => timeState(value, clock));
  const [left, setLeft] = useState(false);
  // Every change renders, even one the field refuses, so the caret is put back where it belongs.
  const [, rendered] = useReducer((n: number) => n + 1, 0);
  const input = useRef<HTMLInputElement>(null);
  const caret = useRef<number | null>(null);
  // The value this field last stood for, so a value the form sets is told apart from one the field sent.
  const stood = useRef(value);
  const laidFor = useRef(clock);

  useEffect(() => {
    if (value === stood.current) return;
    stood.current = value;
    setState(timeState(value, clock));
  }, [value, clock]);

  // The browser's clock arrives after hydration; a whole time is shown again on it.
  useEffect(() => {
    if (clock === laidFor.current) return;
    laidFor.current = clock;
    if (stood.current) setState(timeState(stood.current, clock));
  }, [clock]);

  useLayoutEffect(() => {
    const at = caret.current;
    caret.current = null;
    const el = input.current;
    if (at !== null && el && el.ownerDocument.activeElement === el) el.setSelectionRange(at, at);
  });

  const text = timeText(state.digits);
  const problem = timeNote(state.digits, clock, left);
  const noteId = `${id}-note`;

  const send = (next: string) => {
    if (next === stood.current) return;
    stood.current = next;
    onChange(next);
  };

  const change = (event: ChangeEvent<HTMLInputElement>) => {
    const el = event.currentTarget;
    const step = stepTime(
      state,
      {
        shown: text,
        text: el.value,
        caret: el.selectionStart ?? el.value.length,
        inputType: (event.nativeEvent as InputEvent).inputType,
      },
      clock,
    );
    caret.current = step.caret;
    setState({ digits: step.digits, half: step.half, halfSet: step.halfSet });
    setLeft(false);
    rendered();
    send(step.value);
    if (step.done) onComplete?.();
  };

  const pick = (half: Half, tapped: boolean) => {
    const step = pickHalf(state, half, clock);
    setState({ digits: step.digits, half: step.half, halfSet: step.halfSet });
    send(step.value);
    // The browser clicks and focuses the radio after the tap's own handlers have run, so the form moves focus after that.
    if (tapped && step.done) window.setTimeout(() => onComplete?.());
  };

  return (
    <div className="grid min-w-0">
      {/* The field keeps a row of its own once the switch no longer fits beside it, so it never leaves its card. */}
      <div className="flex flex-wrap items-center gap-2">
        <Input
          ref={input}
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          spellCheck={false}
          placeholder={TIME_PATTERN}
          value={text}
          onChange={change}
          onBlur={() => setLeft(true)}
          aria-invalid={problem ? true : undefined}
          aria-describedby={describedBy ? `${noteId} ${describedBy}` : noteId}
          className={cn(ENTRY_FIELD, "min-w-0 flex-[1_1_150px]")}
        />
        {clock === 12 ? (
          <div
            role="radiogroup"
            aria-label="AM or PM"
            className="inline-flex h-12 shrink-0 overflow-hidden rounded-control border border-control-edge font-label text-xs font-medium"
          >
            {HALVES.map((half) => (
              <label
                key={half}
                // Only a tap lands on the label itself; the arrow keys move the radio inside it, and focus stays with them.
                onClick={(event) => {
                  if (!(event.target instanceof HTMLInputElement)) pick(half, true);
                }}
                // The ring is the paper colour, since an indigo one would vanish on the indigo of the chosen half.
                className={cn(
                  "flex cursor-pointer select-none items-center px-3.5 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:-outline-offset-2 has-[:focus-visible]:outline-paper",
                  state.half === half ? "bg-indigo text-on-indigo" : "text-paper-dim hover:text-paper",
                )}
              >
                <input
                  type="radio"
                  name={`${id}-half`}
                  value={half}
                  checked={state.half === half}
                  onChange={() => pick(half, false)}
                  className="sr-only"
                />
                {half === "am" ? "AM" : "PM"}
              </label>
            ))}
          </div>
        ) : null}
      </div>
      <p id={noteId} aria-live="polite" className={cn("text-[12.5px] leading-[18px] text-error", problem && "mt-1.5")}>
        {problem ?? ""}
      </p>
    </div>
  );
}


export interface BirthTimeControlProps {
  value: BirthTimeAnswer;
  onChange: (next: BirthTimeAnswer) => void;
  /** What the readout needs. Without a place the readout waits. */
  birthDate?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string | null;
  timezoneOffset?: number;
  /** From the geocoder, for the "where to find it" hint. */
  country?: string | null;
  /** The control is also the pass's entry, where the copy says so. */
  compact?: boolean;
  /** The typed time field's `id`, so a form can send focus to it; the form's own when left out. */
  timeId?: string;
  /** The time typed was whole: the form moves focus on, to the place field or the next control. */
  onTimeComplete?: () => void;
}

const MODES: BirthTimeMode[] = ["known", "roughly", "unknown"];
const PARTS: PartOfDay[] = ["morning", "afternoon", "evening", "night"];
const DEBOUNCE_MS = 350;

export function BirthTimeControl({
  value, onChange, birthDate, latitude, longitude, timezone, timezoneOffset, country, compact, timeId, onTimeComplete,
}: BirthTimeControlProps) {
  const own = useId();
  const fieldId = timeId ?? `${own}time`;
  const { clock } = useEntryFormat();
  const parts = partLabels(clock);
  const preview = usePreviewHorizon();
  const [horizon, setHorizon] = useState<Horizon | null>(null);
  const timer = useRef<number | null>(null);
  const mapped = useMemo(() => toValue(value), [value]);
  const ready = !!birthDate && latitude !== undefined && longitude !== undefined && (timezone || timezoneOffset !== undefined) && mapped !== null;

  useEffect(() => {
    if (timer.current) window.clearTimeout(timer.current);
    if (!ready || !mapped || !birthDate) { setHorizon(null); return; }
    timer.current = window.setTimeout(() => {
      preview.mutate({ data: {
        birthDate, birthTime: mapped.birthTime, birthTimeWindowMinutes: mapped.birthTimeWindowMinutes,
        latitude: latitude!, longitude: longitude!,
        ...(timezone ? { timezone } : { timezoneOffset }),
      } }, { onSuccess: (h) => setHorizon(h as unknown as Horizon), onError: () => setHorizon(null) });
    }, DEBOUNCE_MS);
    return () => { if (timer.current) window.clearTimeout(timer.current); };
    // The mutation object changes identity every render; the inputs are what matter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, birthDate, latitude, longitude, timezone, timezoneOffset, mapped?.birthTime, mapped?.birthTimeWindowMinutes]);

  const line = horizon ? readout(horizon, clock) : null;
  const hint = hintFor(country);
  const set = (patch: Partial<BirthTimeAnswer>) => onChange({ ...value, ...patch });

  return (
    <fieldset className="grid gap-3">
      <legend className={cn(FIELD_LABEL, "mb-3")}>Birth time</legend>
      <div className={`grid gap-2 ${compact ? "" : "sm:grid-cols-3"}`} role="radiogroup" aria-label="How well do you know the birth time?">
        {MODES.map((m) => (
          <label
            key={m}
            className={cn(
              "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus cursor-pointer rounded-card border px-4 py-3 transition-colors duration-(--dur-fast)",
              value.mode === m ? CHOSEN : "border-control-edge hover:border-indigo-lt",
            )}
          >
            <input type="radio" name="birth-time-mode" value={m} checked={value.mode === m} onChange={() => set({ mode: m })} className="sr-only" />
            <span className="block font-display text-base text-paper">{MODE_LABELS[m].title}</span>
            <span className="mt-0.5 block text-xs leading-snug text-paper-dim">{MODE_LABELS[m].hint}</span>
          </label>
        ))}
      </div>

      {value.mode === "known" && (
        <div className="grid max-w-xs gap-1">
          <label htmlFor={fieldId} className={FIELD_LABEL}>Time, as written on the record</label>
          <BirthTimeField id={fieldId} value={value.time} onChange={(time) => set({ time })} onComplete={onTimeComplete} />
        </div>
      )}

      {value.mode === "roughly" && (
        <div className="grid gap-2">
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Roughly how?">
            {(["part", "about"] as const).map((k) => (
              <label key={k} className={cn(PILL, value.kind === k ? CHOSEN : "border-control-edge text-paper-dim hover:border-indigo-lt")}>
                <input type="radio" name="birth-time-rough" value={k} checked={value.kind === k} onChange={() => set({ kind: k })} className="sr-only" />
                {k === "part" ? "A part of the day" : "A time, give or take an hour"}
              </label>
            ))}
          </div>
          {value.kind === "part" ? (
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Part of the day">
              {PARTS.map((p) => (
                <label key={p} className={cn(PILL, value.part === p ? CHOSEN : "border-control-edge text-paper-dim hover:border-indigo-lt")}>
                  <input type="radio" name="birth-time-part" value={p} checked={value.part === p} onChange={() => set({ part: p })} className="sr-only" />
                  {parts[p]}
                </label>
              ))}
            </div>
          ) : (
            <div className="grid max-w-xs gap-1">
              <label htmlFor={fieldId} className="sr-only">About what time</label>
              <BirthTimeField id={fieldId} value={value.time} onChange={(time) => set({ time })} onComplete={onTimeComplete} />
            </div>
          )}
        </div>
      )}

      {value.mode === "unknown" && (
        <p className="text-xs leading-relaxed text-paper-dim">
          <span className="font-label text-[11px] tracking-[0.16em] uppercase text-brass">Where to find it · </span>
          {hint.text}
        </p>
      )}

      <p className="min-h-[1.25rem] font-numeric text-xs text-paper-dim" aria-live="polite" data-testid="horizon-readout">
        {!ready
          ? "Enter the date and place, and the time you know, to see your rising sign."
          : preview.isPending && !line
            ? "Working it out…"
            : line
              ? <><span className="text-paper">{line.rising}</span> <span className="text-paper-dim">· {line.status === "unknown" ? "needs a birth time" : line.status === "approximate" ? "same across your time range" : "set"}</span></>
              : ""}
      </p>
    </fieldset>
  );
}


export interface PlaceFieldProps {
  id: string;
  value: GeocodeResult | null;
  onChange: (place: GeocodeResult | null) => void;
  label?: string;
  /** The form's birth date, "YYYY-MM-DD" or "": the card prints the zone's offset on that day, and none before (MB-179). */
  birthDate?: string;
  /** The form's birth time, "HH:MM", when it has one: the offset is the one at that time, else at noon (reading 2). */
  birthTime?: string | null;
}

// Longer than the server gives Nominatim, so a slow search ends in the server's own answer rather than the browser's.
const SEARCH_TIMEOUT_MS = 10_000;

/**
 * The one place field (ADR-109): the birth form's search, which the landing
 * and /sky render as it is. It asks our server, never an outside service, and
 * every place the server offers carries its zone (ADR-246). The chosen place is
 * the caller's, so a place it hands in (a prefill, the visitor's own city) shows
 * as chosen; the typed text and the list are the field's own.
 */
export function PlaceField({ id, value, onChange, label = "Birth Place", birthDate = "", birthTime = null }: PlaceFieldProps) {
  const [query, setQuery] = useState(value?.name ?? "");
  const [shown, setShown] = useState(value);
  const [candidates, setCandidates] = useState<GeocodeResult[]>([]);
  const still = useReducedMotion();
  const [placeError, setPlaceError] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isPendingSearch, setIsPendingSearch] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestSearch = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const reopenOnFocus = useRef(true);

  // The chosen place is the caller's: its prefill must show in the box, and its reset must not leave a name standing
  // with nothing chosen behind it. Text the reader has typed since is theirs and stays.
  if (value !== shown) {
    setShown(value);
    if (value) setQuery(value.name);
    else if (shown && query === shown.name) setQuery("");
  }

  const doSearch = useCallback(async (text: string) => {
    if (!searchable(text)) return;
    const search = ++latestSearch.current;
    const stale = () => search !== latestSearch.current;
    setIsPendingSearch(false);
    setIsSearching(true);
    setPlaceError("");
    try {
      const answer = await geocodePlace({ q: text.trim() }, { signal: AbortSignal.timeout(SEARCH_TIMEOUT_MS) });
      if (stale()) return;
      const { places, line } = searchResult(answer);
      if (line) {
        setPlaceError(line);
        setCandidates([]);
        setShowDropdown(false);
        return;
      }
      setCandidates(places);
      setShowDropdown(true);
    } catch (err) {
      if (stale()) return;
      setPlaceError(searchFailureLine(err));
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

  // Leaving the page must not send a search the reader will never see: each one is a call our server makes to Nominatim,
  // and counts toward the reader's own limit.
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
    if (searchable(text)) {
      setIsPendingSearch(true);
      searchTimer.current = setTimeout(() => doSearch(text), 600);
    } else {
      setCandidates([]);
      setShowDropdown(false);
    }
  };

  // MB-163 provisional: focus put back on the input must not reopen the list the reader just picked from or dismissed: onFocus reopens it for a
  // tab or a tap, and would do so here with the list's old closure.
  const focusInput = () => {
    reopenOnFocus.current = false;
    inputRef.current?.focus();
    reopenOnFocus.current = true;
  };

  const handleSearchButton = () => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (searchable(query)) doSearch(query);
  };

  const selectCandidate = (place: GeocodeResult) => {
    dropSearches();
    setQuery(place.name);
    setShowDropdown(false);
    setCandidates([]);
    focusInput();
    onChange(place);
  };

  const clearPlace = () => {
    dropSearches();
    setQuery("");
    setCandidates([]);
    if (value) onChange(null);
    setPlaceError("");
    setShowDropdown(false);
  };

  const offset = value ? offsetOn(value.timezone, birthDate, birthTime) : null;

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
    <div
      className="space-y-2"
      ref={containerRef}
      onKeyDown={(e) => {
        if (e.key !== "Escape" || !showDropdown) return;
        e.stopPropagation();
        setShowDropdown(false);
        focusInput();
      }}
    >
      <label htmlFor={id} className={cn(FIELD_LABEL, "block")}>
        {label}
      </label>
      <div className="relative">
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
          {isSearching || isPendingSearch ? (
            <Loader2 className="h-4 w-4 text-indigo-lt animate-spin motion-reduce:animate-none" />
          ) : value ? (
            <MapPin className="h-4 w-4 text-indigo-lt" />
          ) : (
            <Search className="h-4 w-4 text-paper-dim" />
          )}
        </div>
        {/* 16 px below md, whatever the page around it: iOS zooms into a smaller input on focus (landing, Fields fit). */}
        <Input
          id={id}
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handlePlaceInput(e.target.value)}
          onFocus={() => reopenOnFocus.current && candidates.length > 0 && setShowDropdown(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleSearchButton();
            }
          }}
          placeholder="Type a city name, e.g. Milan, Rome…"
          className="pl-10 pr-24"
          autoComplete="off"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {query && !isSearching && !isPendingSearch && (
            <button
              type="button"
              onClick={clearPlace}
              className="p-1.5 text-paper-dim hover:text-paper"
              aria-label="Clear"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          {searchable(query) && !value && (
            <Button
              size="compact"
              onClick={() => {
                if (!isSearching && !isPendingSearch) handleSearchButton();
              }}
              aria-disabled={isSearching || isPendingSearch || undefined}
              className="aria-disabled:opacity-40"
            >
              Search
            </Button>
          )}
        </div>

        <AnimatePresence>
          {showDropdown && candidates.length > 0 && (
            <motion.div
              initial={still ? false : { opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={still ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, y: -4 }}
              transition={{ duration: still ? 0 : 0.15 }}
              data-testid="city-dropdown"
              className="absolute left-0 right-0 top-full z-20 mt-1.5 max-h-80 overflow-hidden overflow-y-auto rounded-card border border-line-strong bg-raised shadow-raised"
            >
              <div className="flex items-center justify-between gap-3 border-b border-line px-3.5 py-2.5">
                <span className={FIELD_LABEL}>Pick the exact place</span>
                <button
                  type="button"
                  onClick={() => setShowDropdown(false)}
                  className="-m-1.5 p-1.5 text-paper-dim hover:text-paper"
                  aria-label="Close suggestions"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              {/* A match is one column, so a long name wraps in the list's full width instead of sharing its row with a zone. */}
              <ul>
                {candidates.map((m, idx) => (
                  <li key={`${m.latitude}-${m.longitude}-${idx}`} className="border-b border-line last:border-b-0">
                    <button
                      type="button"
                      onClick={() => selectCandidate(m)}
                      className="block w-full px-3.5 py-[11px] text-left transition-colors hover:bg-indigo/15 focus-visible:bg-indigo/15 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus"
                    >
                      <span className="block text-[15.5px] leading-snug text-paper break-words">{placeTitle(m)}</span>
                      <span className="mt-0.5 block font-numeric text-[11.5px] leading-snug tracking-[.04em] uppercase text-paper-dim break-words">
                        {placeLine(m)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              {/* Nominatim's policy asks for the credit wherever its places show (ADR-109); held at the foot so a scrolled list keeps it. */}
              <p className="sticky bottom-0 border-t border-line bg-raised px-3 py-2 text-[11px] font-numeric tracking-wide text-paper-dim">
                <a
                  href="https://www.openstreetmap.org/copyright"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-paper transition-colors"
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
            initial={still ? false : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={still ? { opacity: 0, height: 0, transition: { duration: 0 } } : { opacity: 0, height: 0 }}
            transition={{ duration: still ? 0 : 0.15 }}
            className="overflow-hidden"
          >
            <div data-testid="chosen-place" className="mt-2 flex items-start gap-2 rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm">
              <Check className="mt-1 h-3.5 w-3.5 flex-shrink-0 text-indigo-lt" />
              <div className="min-w-0 flex-1">
                <div className="font-medium text-paper break-words">{placeTitle(value)}</div>
                <div className="text-xs text-paper-dim break-words">
                  {placeWhere(value) ? `${placeWhere(value)} · ` : ""}
                  <span className="font-numeric">
                    {value.latitude.toFixed(2)}°, {value.longitude.toFixed(2)}°{offset === null ? "" : ` · ${utcLine(offset)}`}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
        {placeError && (
          <motion.p
            key="error"
            role="alert"
            initial={still ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={still ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0 }}
            transition={{ duration: still ? 0 : 0.15 }}
            className="mt-1 text-sm text-error"
          >
            {placeError}
          </motion.p>
        )}
      </AnimatePresence>

      {!value && !placeError && searchable(query) && !isSearching && !isPendingSearch && candidates.length === 0 && (
        <p className="mt-1 text-xs text-paper-dim">
          Press Enter or tap Search to find matching cities.
        </p>
      )}
    </div>
  );
}

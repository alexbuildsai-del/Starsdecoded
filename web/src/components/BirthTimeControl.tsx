/**
 * The three-way birth time (ADR-33): I know it, Roughly, I don't know, with
 * the live readout under it of what the answer settles, before anything is
 * paid. Every mapping and every string lives in lib/birth-time; this only
 * renders them and asks /horizon/preview, debounced, for the readout.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { usePreviewHorizon } from "@workspace/api-client-react";
import {
  MODE_LABELS, PART_LABELS, isTime, readout, toValue,
  type BirthTimeAnswer, type BirthTimeMode, type PartOfDay,
} from "@/lib/birth-time";
import { hintFor } from "@/lib/birth-record-hints";
import type { Horizon } from "@/types/chart";

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
}

const MODES: BirthTimeMode[] = ["known", "roughly", "unknown"];
const PARTS: PartOfDay[] = ["morning", "afternoon", "evening", "night"];
const DEBOUNCE_MS = 350;

export function BirthTimeControl({
  value, onChange, birthDate, latitude, longitude, timezone, timezoneOffset, country, compact,
}: BirthTimeControlProps) {
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

  const line = horizon ? readout(horizon) : null;
  const hint = hintFor(country);
  const set = (patch: Partial<BirthTimeAnswer>) => onChange({ ...value, ...patch });

  return (
    <fieldset className="grid gap-3">
      <legend className="font-label text-[10px] tracking-[0.2em] uppercase text-muted-foreground">Birth time</legend>
      <div className={`grid gap-2 ${compact ? "" : "sm:grid-cols-3"}`} role="radiogroup" aria-label="How well do you know the birth time?">
        {MODES.map((m) => (
          <label
            key={m}
            className={`cursor-pointer rounded-xl border px-4 py-3 transition-colors ${value.mode === m ? "border-primary/60 bg-primary/10" : "border-border/60 hover:border-border"}`}
          >
            <input type="radio" name="birth-time-mode" value={m} checked={value.mode === m} onChange={() => set({ mode: m })} className="sr-only" />
            <span className="block font-display text-base text-foreground">{MODE_LABELS[m].title}</span>
            <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">{MODE_LABELS[m].hint}</span>
          </label>
        ))}
      </div>

      {value.mode === "known" && (
        <label className="grid gap-1">
          <span className="text-xs text-muted-foreground">Time, as written on the record</span>
          <input
            type="time"
            value={value.time}
            onChange={(e) => set({ time: e.target.value })}
            required
            aria-invalid={value.time !== "" && !isTime(value.time)}
            className="w-40 rounded-md border border-input bg-background px-3 py-2 font-numeric text-sm"
          />
        </label>
      )}

      {value.mode === "roughly" && (
        <div className="grid gap-2">
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Roughly how?">
            {(["part", "about"] as const).map((k) => (
              <label key={k} className={`cursor-pointer rounded-full border px-3 py-1.5 text-xs ${value.kind === k ? "border-primary/60 bg-primary/10 text-foreground" : "border-border/60 text-muted-foreground"}`}>
                <input type="radio" name="birth-time-rough" value={k} checked={value.kind === k} onChange={() => set({ kind: k })} className="sr-only" />
                {k === "part" ? "A part of the day" : "A time, give or take an hour"}
              </label>
            ))}
          </div>
          {value.kind === "part" ? (
            <select
              value={value.part}
              onChange={(e) => set({ part: e.target.value as PartOfDay })}
              aria-label="Part of the day"
              className="w-64 rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {PARTS.map((p) => <option key={p} value={p}>{PART_LABELS[p]}</option>)}
            </select>
          ) : (
            <input
              type="time"
              value={value.time}
              onChange={(e) => set({ time: e.target.value })}
              aria-label="About what time"
              className="w-40 rounded-md border border-input bg-background px-3 py-2 font-numeric text-sm"
            />
          )}
        </div>
      )}

      {value.mode === "unknown" && (
        <p className="text-xs leading-relaxed text-muted-foreground">
          <span className="font-label text-[10px] tracking-[0.16em] uppercase text-brass/80">Where to find it · </span>
          {hint.text}
        </p>
      )}

      <p className="min-h-[1.25rem] font-numeric text-xs text-muted-foreground" aria-live="polite" data-testid="horizon-readout">
        {!ready
          ? "Enter the date and place, and the time you know, to see what it settles."
          : preview.isPending && !line
            ? "Sweeping the sky…"
            : line
              ? <><span className="text-foreground/85">{line.rising}</span> <span className="text-muted-foreground">· {line.status === "unknown" ? "horizon not drawn" : line.status === "approximate" ? "holds across the window" : "horizon drawn"}</span></>
              : ""}
      </p>
    </fieldset>
  );
}

export default BirthTimeControl;

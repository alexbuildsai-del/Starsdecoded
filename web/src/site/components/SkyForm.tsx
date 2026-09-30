/**
 * The sky form (landing scope 2, 4; ADR-108, 109): a birth date, the time if
 * known, and the birth form's own place field, which starts on the visitor's
 * city. The fields sit three, two or one to a row by the form's own width, the
 * time is wide enough for its AM or PM at every width, and on a phone every
 * input is 16 px so the browser does not zoom into it. Nothing typed here is
 * stored or sent; the place search is the field's own.
 */
import { useEffect, useId, useRef, useState, type FormEvent, type RefObject } from "react";
import { PlaceField } from "@/components/PlaceField";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { GeocodeResult } from "@/lib/places";
import { visitorZone } from "@/lib/sky-now";
import { EARLIEST_BIRTH, PLACE_PROBLEM, birthDateProblem, todayOf, visitorPlace, type SkyBirth } from "@/site/lib/sky";

// The place field's own label and input, so the three fields read as one form and their labels share a line.
const LABEL = "font-label text-xs tracking-wide uppercase text-muted-foreground";
const FIELD = "h-12 border-border/60 bg-card font-numeric text-base text-foreground [color-scheme:dark] md:text-sm";

export interface SkyFormProps {
  onShow: (birth: SkyBirth) => void;
  /** The date field, so a page can bring the reader back to it. */
  dateRef?: RefObject<HTMLInputElement | null>;
}

export function SkyForm({ onShow, dateRef }: SkyFormProps) {
  const id = useId();
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [place, setPlace] = useState<GeocodeResult | null>(null);
  // Today is the visitor's, so it is read after hydration; the prerender's day would be the build's.
  const [today, setToday] = useState<string | undefined>(undefined);
  const [problem, setProblem] = useState<{ field: "date" | "place"; text: string } | null>(null);
  const picked = useRef(false);
  const ownDate = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const now = new Date();
    setToday(todayOf(now));
    if (!picked.current) setPlace(visitorPlace(now, visitorZone()));
  }, []);

  const setDateEl = (el: HTMLInputElement | null) => {
    ownDate.current = el;
    if (dateRef) dateRef.current = el;
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const wrongDate = birthDateProblem(date, today ?? todayOf(new Date()));
    if (wrongDate) {
      setProblem({ field: "date", text: wrongDate });
      ownDate.current?.focus();
      return;
    }
    if (!place) {
      setProblem({ field: "place", text: PLACE_PROBLEM });
      document.getElementById(`${id}place`)?.focus();
      return;
    }
    setProblem(null);
    onShow({ date, time: time || null, place });
  };

  return (
    <form className="@container grid gap-3.5" onSubmit={submit} noValidate aria-labelledby={`${id}title`}>
      <div className="sd-row">
        <p className="sd-eyebrow" id={`${id}title`}>
          See your chart first
        </p>
        <span className="sd-tag">Free · nothing is saved</span>
      </div>
      <div className="grid grid-cols-1 items-start gap-2.5 @min-[380px]:grid-cols-2 @min-[480px]:grid-cols-[minmax(156px,1fr)_minmax(132px,.85fr)_minmax(0,1.5fr)]">
        <div className="min-w-0 space-y-2">
          <Label htmlFor={`${id}date`} className={LABEL}>
            Birth date
          </Label>
          <Input
            ref={setDateEl}
            id={`${id}date`}
            type="date"
            min={EARLIEST_BIRTH}
            max={today}
            value={date}
            onChange={(event) => {
              setDate(event.target.value);
              if (problem?.field === "date") setProblem(null);
            }}
            aria-invalid={problem?.field === "date" || undefined}
            aria-describedby={problem?.field === "date" ? `${id}problem` : undefined}
            className={FIELD}
          />
        </div>
        <div className="min-w-0 space-y-2">
          <Label htmlFor={`${id}time`} className={LABEL}>
            Birth time
          </Label>
          <Input
            id={`${id}time`}
            type="time"
            value={time}
            onChange={(event) => setTime(event.target.value)}
            aria-describedby={`${id}hint`}
            className={FIELD}
          />
        </div>
        {/* Room for the chosen place's card, which arrives with the visitor's city after hydration: the hero, which
            centres on its horizon, would otherwise move down under the reader. */}
        <div className="min-h-[144px] min-w-0 @min-[380px]:col-span-2 @min-[480px]:col-span-1">
          <PlaceField
            id={`${id}place`}
            label="Birth place"
            value={place}
            onChange={(next) => {
              picked.current = true;
              setPlace(next);
              if (next && problem?.field === "place") setProblem(null);
            }}
          />
        </div>
      </div>
      {problem ? (
        <p id={`${id}problem`} role="alert" className="text-[13px] leading-snug text-[#E9A0A0]">
          {problem.text}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2.5">
        <button type="submit" className="sd-btn">
          Show my chart
        </button>
        <p id={`${id}hint`} className="max-w-[46ch] flex-[1_1_180px] text-[12.5px] leading-snug text-[color:var(--sd-muted)]">
          If you don't know your birth time, leave it blank.
        </p>
      </div>
    </form>
  );
}

export default SkyForm;

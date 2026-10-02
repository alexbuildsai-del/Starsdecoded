/**
 * The sky form (landing scope 2, 4; ADR-108, 109): a birth date, the time if
 * known, and the birth form's own place field, which starts on the visitor's
 * city. The date and the time sit two to a row or, when the form is narrow, one;
 * the place has a row of its own, so a long name and the list of matches get the
 * form's whole width. The date and the time are typed straight through, in the
 * reader's order and clock, and focus follows them to the place (ADR-222); on a
 * phone every input is 16 px so the browser does not zoom into it.
 * Nothing typed here is stored or sent; the place search is the field's own.
 */
import { useEffect, useId, useRef, useState, type FormEvent, type RefObject } from "react";
import { BirthDateField } from "@/components/BirthDateField";
import { BirthTimeField } from "@/components/BirthTimeField";
import { PlaceField } from "@/components/PlaceField";
import { StatusDots } from "@/components/StatusDots";
import { Label } from "@/components/ui/label";
import type { GeocodeResult } from "@/lib/places";
import { visitorZone } from "@/lib/sky-now";
import { EARLIEST_BIRTH, PLACE_PROBLEM, birthDateProblem, todayOf, visitorPlace, type SkyBirth } from "@/site/lib/sky";

// The place field's own label, so the three fields read as one form.
const LABEL = "font-label text-xs tracking-wide uppercase text-muted-foreground";

const focusById = (id: string) => document.getElementById(id)?.focus();

export interface SkyFormProps {
  onShow: (birth: SkyBirth) => void;
  /** The date field, so a page can bring the reader back to it. */
  dateRef?: RefObject<HTMLInputElement | null>;
  /** The line over the fields; /sky leaves it out, since its heading and lede already say what the form is. */
  heading?: boolean;
  /**
   * While the page works out and draws a chart, the button says so and takes
   * no second birth (ADR-130). It stays focusable, so the reader keeps their
   * place in the form.
   */
  busy?: boolean;
}

export function SkyForm({ onShow, dateRef, heading = true, busy = false }: SkyFormProps) {
  const id = useId();
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [place, setPlace] = useState<GeocodeResult | null>(null);
  // Today is the visitor's, so it is read after hydration; the prerender's day would be the build's.
  const [today, setToday] = useState<string | undefined>(undefined);
  const [problem, setProblem] = useState<{ field: "date" | "place"; text: string } | null>(null);
  const picked = useRef(false);

  useEffect(() => {
    const now = new Date();
    setToday(todayOf(now));
    if (!picked.current) setPlace(visitorPlace(now, visitorZone()));
  }, []);

  // The date field is a component that takes an id, not a ref, so the page's handle is found by that id.
  useEffect(() => {
    if (dateRef) dateRef.current = document.getElementById(`${id}date`) as HTMLInputElement | null;
  }, [dateRef, id]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    const wrongDate = birthDateProblem(date, today ?? todayOf(new Date()));
    if (wrongDate) {
      setProblem({ field: "date", text: wrongDate });
      focusById(`${id}date`);
      return;
    }
    if (!place) {
      setProblem({ field: "place", text: PLACE_PROBLEM });
      focusById(`${id}place`);
      return;
    }
    setProblem(null);
    onShow({ date, time: time || null, place });
  };

  return (
    <form className="@container grid gap-3.5" onSubmit={submit} noValidate aria-labelledby={heading ? `${id}title` : undefined}>
      {heading ? (
        <div className="sd-row">
          <p className="sd-eyebrow" id={`${id}title`}>
            See your chart first
          </p>
          <span className="sd-tag">Free · nothing is saved</span>
        </div>
      ) : null}
      <div className="grid grid-cols-1 items-start gap-2.5 @min-[380px]:grid-cols-2">
        <div className="min-w-0 space-y-2">
          <Label htmlFor={`${id}date`} className={LABEL}>
            Birth date
          </Label>
          <BirthDateField
            id={`${id}date`}
            value={date}
            min={EARLIEST_BIRTH}
            max={today}
            onChange={(next) => {
              setDate(next);
              if (problem?.field === "date") setProblem(null);
            }}
            onComplete={() => focusById(`${id}time`)}
          />
        </div>
        <div className="min-w-0 space-y-2">
          <Label htmlFor={`${id}time`} className={LABEL}>
            Birth time
          </Label>
          <BirthTimeField
            id={`${id}time`}
            value={time}
            onChange={setTime}
            onComplete={() => focusById(`${id}place`)}
            describedBy={`${id}hint`}
          />
        </div>
        {/* Room for the chosen place's card, which arrives with the visitor's city after hydration: the hero, which
            centres on its horizon, would otherwise move down under the reader. */}
        <div className="col-span-full min-h-[144px] min-w-0">
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
        <button type="submit" className="sd-btn aria-disabled:cursor-progress" aria-disabled={busy || undefined}>
          {busy ? <StatusDots label="Working out your chart" /> : "Show my chart"}
        </button>
        <p id={`${id}hint`} className="max-w-[46ch] flex-[1_1_180px] text-[12.5px] leading-snug text-[color:var(--sd-muted)]">
          If you don't know your birth time, leave it blank.
        </p>
      </div>
    </form>
  );
}

export default SkyForm;

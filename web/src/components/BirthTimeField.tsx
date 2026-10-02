/**
 * The birth time as one typed field (ADR-222, review-02-10 §5): "0300" reads
 * "03 : 00" as it goes in, and "HH:MM" on the 24-hour clock comes out whatever
 * clock the reader sees. On a 12-hour clock an AM/PM switch sits beside it,
 * set by a tap or by an A or P typed in the field, and it starts on AM
 * (reading 9). The form owns the label, through `id`, and where focus goes
 * once the time is whole.
 */
import { useEffect, useLayoutEffect, useReducer, useRef, useState, type ChangeEvent } from "react";
import { Input } from "@/components/ui/input";
import { ENTRY_FIELD } from "@/components/BirthDateField";
import { useEntryFormat } from "@/hooks/useEntryFormat";
import { TIME_PATTERN, stepTime, timeNote, timeState, timeText, timeValue, type Half, type TimeState } from "@/lib/date-entry";
import { cn } from "@/lib/utils";

export interface BirthTimeFieldProps {
  id: string;
  /** "HH:MM" on the 24-hour clock, or "" while the field holds no real time. */
  value: string;
  onChange: (value: string) => void;
  /** Typing or pasting finished a valid time: the form moves focus on to the place. */
  onComplete?: () => void;
}

const HALVES: readonly Half[] = ["am", "pm"];

export function BirthTimeField({ id, value, onChange, onComplete }: BirthTimeFieldProps) {
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
    setState({ digits: step.digits, half: step.half });
    setLeft(false);
    rendered();
    send(step.value);
    if (step.done) onComplete?.();
  };

  const pick = (half: Half) => {
    const next = { digits: state.digits, half };
    setState(next);
    send(timeValue(next, clock));
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
          aria-describedby={noteId}
          className={cn(ENTRY_FIELD, "min-w-0 flex-[1_1_150px]")}
        />
        {clock === 12 ? (
          <div
            role="radiogroup"
            aria-label="AM or PM"
            className="inline-flex h-12 shrink-0 overflow-hidden rounded-md border border-border/60 font-label text-xs font-medium"
          >
            {HALVES.map((half) => (
              <label
                key={half}
                // The ring is the foreground colour, since an indigo one would vanish on the indigo of the chosen half.
                className={cn(
                  "flex cursor-pointer select-none items-center px-3.5 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:-outline-offset-2 has-[:focus-visible]:outline-foreground",
                  state.half === half ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <input
                  type="radio"
                  name={`${id}-half`}
                  value={half}
                  checked={state.half === half}
                  onChange={() => pick(half)}
                  className="sr-only"
                />
                {half === "am" ? "AM" : "PM"}
              </label>
            ))}
          </div>
        ) : null}
      </div>
      <p id={noteId} aria-live="polite" className={cn("text-[12.5px] leading-[18px] text-[#E9A0A0]", problem && "mt-1.5")}>
        {problem ?? ""}
      </p>
    </div>
  );
}

export default BirthTimeField;

/**
 * The birth date as one typed field (ADR-222, review-02-10 §5): digits on the
 * number pad, laid out in the reader's order as they go in, the date in words
 * under it so it cannot be misread, and "YYYY-MM-DD" out. The rules live in
 * lib/date-entry; this keeps the caret where the reader expects it. The form
 * owns the label, through `id`, and where focus goes once the date is whole.
 */
import { useEffect, useLayoutEffect, useReducer, useRef, useState, type ChangeEvent } from "react";
import { Input } from "@/components/ui/input";
import { useEntryFormat } from "@/hooks/useEntryFormat";
import { dateDigits, dateNote, datePattern, dateText, localDay, stepDate } from "@/lib/date-entry";

// 16 px at every width, so a phone never zooms into the field (ADR-171); the time field wears the same.
export const ENTRY_FIELD =
  "h-12 border-border/60 bg-card font-numeric text-base md:text-base text-foreground placeholder:text-muted-foreground/50 aria-invalid:border-[#E9A0A0]/70";

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
  const note = dateNote(digits, order, { range, today: localDay(new Date()), left });
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
        <span id={noteId} aria-live="polite" className={note?.kind === "problem" ? "text-[#E9A0A0]" : "text-muted-foreground"}>
          {note && note.kind !== "order" ? note.text : ""}
        </span>
        {/* The placeholder has gone by the first digit, so the order stays in sight while the rest go in. Screen
            readers heard it as the placeholder, and the readout follows. */}
        {note?.kind === "order" ? <span aria-hidden="true" className="text-muted-foreground">{note.text}</span> : null}
      </p>
    </div>
  );
}

export default BirthDateField;

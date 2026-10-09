/**
 * Your first steps (sharing-and-circle §2, ADR-330, 390): the dashboard's guide from the reader's own Personal report to
 * their first Compatibility report, in the idle panel until that pair exists. It replaces the path sheet that showed
 * once after a bundle (ADR-125). The server says which step the reader is on (`GET /home`'s `firstSteps`, reading 18),
 * so a step ticks when the page reads it again, never on a guess here; one button shows at a time. Step 2 opens
 * today's Add someone sheet, step 3 the Share window, and step 4 is the either/or: You & {name}, which opens the picker
 * with both picked, or Add someone else, back to step 2. Hide is the page's, which keeps it in the browser and puts
 * Make a report in the card's place.
 */
import { useId, useState, type ReactNode } from "react";
import { useLocation } from "wouter";
import { Check } from "lucide-react";
import type { FirstSteps as Steps } from "@workspace/api-client-react";
import { StatusDots } from "@/components/StatusDots";
import { ShareWindow } from "@/components/share/ShareWindow";
import { useHome } from "@/hooks/useHome";
import { FIRST_STEPS, canPair, firstStepsView, type FirstStepAction, type FirstStepRow } from "@/lib/home-view";
import { cn } from "@/lib/utils";

export interface FirstStepsProps {
  steps: Steps;
  /** Step 2's Add someone and step 4's Add someone else: today's Add someone sheet. */
  onAddSomeone: () => void;
  /** Step 4's You & {name}: the picker with the reader and that person picked. */
  onMakePair: (profileId: string) => void;
  onHide: () => void;
}

const FOCUS = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#AEB8F0]";

export interface ChoiceButtonProps {
  title: string;
  line: string;
  /** The group's one main action, which differs by colour only (ADR-333). */
  main?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

/**
 * One of two actions of the same weight, side by side at one width and height, a title over its small line: Make a
 * report's two and step 4's either/or are the same kind of thing, so they share one look.
 */
export function ChoiceButton({ title, line, main = false, disabled = false, onClick }: ChoiceButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "grid min-h-14 min-w-0 content-center gap-0.5 rounded-[10px] border px-3 py-2.5 text-left transition duration-200",
        "active:scale-[.98] motion-reduce:transition-none motion-reduce:active:scale-100 disabled:cursor-default disabled:active:scale-100",
        FOCUS,
        main
          ? "border-primary bg-primary text-white hover:brightness-110"
          : "border-[#2E3646] bg-transparent text-[#E8EBF2] hover:border-[#9FA8DA]/55 disabled:hover:border-[#2E3646]",
      )}
    >
      <span className={cn("font-label text-[13.5px] font-medium leading-tight", disabled && "text-[#AEB6C6]")}>{title}</span>
      <span className={cn("text-xs leading-snug", main ? "text-white" : "text-[#9AA3B5]")}>{line}</span>
    </button>
  );
}

function Mark({ row }: { row: FirstStepRow }) {
  if (row.done) {
    return (
      <span role="img" aria-label="Done" className="grid h-[26px] w-[26px] place-items-center rounded-full bg-[#3FA796] text-[#0D1117]">
        <Check aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={2.5} />
      </span>
    );
  }
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid h-[26px] w-[26px] place-items-center rounded-full border font-numeric text-xs",
        row.current ? "border-[#5C6BC0] text-[#9FA8DA]" : "border-[#3A4560] text-[#9AA3B5]",
      )}
    >
      {row.step}
    </span>
  );
}

function Action({ action, name, onAct }: { action: FirstStepAction; name: string; onAct: (action: FirstStepAction) => void }) {
  if (action.kind === "after") return <span className="whitespace-nowrap text-xs text-[#9AA3B5]">{action.label}</span>;
  if (action.kind === "writing") {
    return (
      <span className="inline-flex min-h-8 items-center rounded-md border border-[rgba(92,107,192,.35)] bg-[rgba(92,107,192,.14)] px-2.5 font-label text-xs font-medium text-[#9FA8DA]">
        <StatusDots label={action.label} />
      </span>
    );
  }
  // The visible verb leads each name, so a voice command that says what it sees still finds the button.
  const named = action.kind === "start" ? "Start your Personal report" : action.kind === "share" ? `Share ${name}'s report` : undefined;
  return (
    <button
      type="button"
      onClick={() => onAct(action)}
      aria-label={named}
      className={cn(
        "inline-flex min-h-8 shrink-0 items-center whitespace-nowrap rounded-md bg-primary px-3 font-label text-xs font-medium text-white",
        "transition duration-200 hover:brightness-110 active:scale-[.97] motion-reduce:transition-none motion-reduce:active:scale-100",
        FOCUS,
      )}
    >
      {action.label}
    </button>
  );
}

function Step({ row, name, onAct, children }: { row: FirstStepRow; name: string; onAct: (action: FirstStepAction) => void; children?: ReactNode }) {
  return (
    <li className="grid grid-cols-[26px_minmax(0,1fr)_auto] items-start gap-x-3">
      <Mark row={row} />
      <div className="min-w-0 pt-[3px]">
        <p className={cn("text-[14px] font-medium leading-snug [overflow-wrap:anywhere]", row.done || row.current ? "text-[#E8EBF2]" : "text-[#AEB6C6]")}>
          {row.title}
        </p>
        {row.line && <p className="mt-0.5 text-[12.5px] leading-snug text-[#9AA3B5]">{row.line}</p>}
      </div>
      <div className="self-center">{row.action && <Action action={row.action} name={name} onAct={onAct} />}</div>
      {children && <div className="col-span-2 col-start-2 mt-2.5">{children}</div>}
    </li>
  );
}

export function FirstSteps({ steps, onAddSomeone, onMakePair, onHide }: FirstStepsProps) {
  const [, navigate] = useLocation();
  const home = useHome().data;
  const headingId = useId();
  const [sharing, setSharing] = useState(false);

  const person = steps.person?.profileId ? (home?.people.find((p) => p.profileId === steps.person?.profileId) ?? null) : null;
  const view = firstStepsView(steps, { own: home?.you?.status ?? null, person, pairable: !!home && canPair(home) });
  const name = steps.person?.name.trim() || "them";
  const sharable = !steps.gift && !!steps.person?.profileId;

  function act(action: FirstStepAction) {
    if (action.kind === "start") navigate("/chart?self=1");
    else if (action.kind === "add") onAddSomeone();
    else if (action.kind === "share") setSharing(true);
  }

  return (
    <section aria-labelledby={headingId} className="grid gap-3" data-testid="first-steps">
      <div className="flex items-center justify-between gap-3">
        <h3 id={headingId} className="font-label text-[14px] font-medium leading-tight text-[#E8EBF2]">
          {FIRST_STEPS.title}
        </h3>
        <div className="flex shrink-0 items-center gap-1">
          <span className="font-numeric text-xs text-[#9AA3B5]">{view.count}</span>
          <span aria-hidden="true" className="text-xs text-[#6B7385]">·</span>
          <button
            type="button"
            onClick={onHide}
            aria-label="Hide your first steps"
            className={cn("-mr-1.5 inline-flex min-h-8 items-center rounded-md px-1.5 font-label text-xs font-medium text-[#9FA8DA] underline-offset-4 hover:text-[#E8EBF2] hover:underline", FOCUS)}
          >
            {FIRST_STEPS.hide}
          </button>
        </div>
      </div>
      <div aria-hidden="true" className="h-1 overflow-hidden rounded-full bg-[#242C3B]">
        <div
          className="h-full rounded-full bg-[#5C6BC0] transition-[width] duration-500 ease-[cubic-bezier(.16,1,.3,1)] motion-reduce:transition-none"
          style={{ width: `${view.done * 25}%` }}
        />
      </div>
      <ol className="grid gap-3.5">
        {view.rows.map((row) => (
          <Step key={row.step} row={row} name={name} onAct={act}>
            {row.step === 4 && view.either && (
              <div className="grid grid-cols-2 gap-2">
                <ChoiceButton
                  main={view.either.pair.ready}
                  disabled={!view.either.pair.ready}
                  title={view.either.pair.label}
                  line={view.either.pair.line}
                  onClick={() => view.either && onMakePair(view.either.pair.profileId)}
                />
                <ChoiceButton title={view.either.more.label} line={view.either.more.line} onClick={onAddSomeone} />
              </div>
            )}
          </Step>
        ))}
      </ol>
      {sharable && steps.person && (
        <ShareWindow
          open={sharing}
          onClose={() => setSharing(false)}
          target={{ kind: "person", profileId: steps.person.profileId, name: steps.person.name }}
        />
      )}
    </section>
  );
}

export default FirstSteps;

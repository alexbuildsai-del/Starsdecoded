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
import { Button } from "@/ds/atoms/Button";
import { StatusDots } from "@/ds/atoms/StatusDots";
import { TextButton } from "@/ds/atoms/TextButton";
import { ChoiceTile } from "@/ds/molecules/ChoiceTile";
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

function Mark({ row }: { row: FirstStepRow }) {
  if (row.done) {
    return (
      <span role="img" aria-label="Done" className="grid size-[26px] place-items-center rounded-pill bg-teal text-ground">
        <Check aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={2.5} />
      </span>
    );
  }
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid size-[26px] place-items-center rounded-pill border font-mono text-data tabular-nums",
        row.current ? "border-indigo text-indigo-lt" : "border-line-strong text-paper-dim",
      )}
    >
      {row.step}
    </span>
  );
}

function Action({ action, name, onAct }: { action: FirstStepAction; name: string; onAct: (action: FirstStepAction) => void }) {
  if (action.kind === "after") return <span className="whitespace-nowrap text-caption text-paper-dim">{action.label}</span>;
  if (action.kind === "writing") {
    return (
      <span className="inline-flex min-h-8 items-center rounded-inner border border-indigo/35 bg-indigo-tint px-2.5 font-label text-caption text-indigo-lt">
        <StatusDots label={action.label} />
      </span>
    );
  }
  // The visible verb leads each name, so a voice command that says what it sees still finds the button.
  const named = action.kind === "start" ? "Start your Personal report" : action.kind === "share" ? `Share ${name}'s report` : undefined;
  return (
    <Button size="compact" onClick={() => onAct(action)} aria-label={named} className="shrink-0">
      {action.label}
    </Button>
  );
}

function Step({ row, name, onAct, children }: { row: FirstStepRow; name: string; onAct: (action: FirstStepAction) => void; children?: ReactNode }) {
  return (
    <li className="grid grid-cols-[26px_minmax(0,1fr)_auto] items-start gap-x-3">
      <Mark row={row} />
      <div className="min-w-0 pt-[3px]">
        <p className={cn("text-ui font-medium [overflow-wrap:anywhere]", row.done || row.current ? "text-paper" : "text-paper-dim")}>
          {row.title}
        </p>
        {row.line && <p className="mt-0.5 text-caption text-paper-dim">{row.line}</p>}
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
        <h3 id={headingId} className="font-label text-ui font-medium text-paper">
          {FIRST_STEPS.title}
        </h3>
        <div className="flex shrink-0 items-center gap-1">
          <span className="font-mono text-data tabular-nums text-paper-dim">{view.count}</span>
          <span aria-hidden="true" className="text-caption text-muted">·</span>
          <TextButton onClick={onHide} aria-label="Hide your first steps" className="-mr-1.5 px-1.5 font-label text-caption underline-offset-4 hover:underline">
            {FIRST_STEPS.hide}
          </TextButton>
        </div>
      </div>
      <div aria-hidden="true" className="h-1 overflow-hidden rounded-pill bg-line">
        <div
          className="h-full rounded-pill bg-indigo transition-[width] duration-slow ease-[var(--ease)] motion-reduce:transition-none"
          style={{ width: `${view.done * 25}%` }}
        />
      </div>
      <ol className="grid gap-3.5">
        {view.rows.map((row) => (
          <Step key={row.step} row={row} name={name} onAct={act}>
            {row.step === 4 && view.either && (
              <div className="grid grid-cols-2 gap-2">
                <ChoiceTile
                  main={view.either.pair.ready}
                  disabled={!view.either.pair.ready}
                  title={view.either.pair.label}
                  line={view.either.pair.line}
                  onClick={() => view.either && onMakePair(view.either.pair.profileId)}
                />
                <ChoiceTile title={view.either.more.label} line={view.either.more.line} onClick={onAddSomeone} />
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

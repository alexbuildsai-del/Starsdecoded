/**
 * The one way into a compatibility report (ADR-40, ADR-42): two natal reports
 * the viewer can see, any two, own not required; a complete one selectable and
 * a writing one visible and disabled; the lens required, parent and child
 * asking who the parent is, two people asking how they know each other
 * (ADR-68); one call to action. No birth form, ever.
 *
 * The dashboard's Generate hands it a pair (MB-86), which enters as the picked
 * selection once the list vouches for both reports. There it never leaves the
 * page after creating: the button reads Generating until the list holds the
 * pair, whose own row then reads Writing and opens when finished (reading 6,
 * ADR-131).
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import {
  useCreateCompatibilityReport, useGetCredits, useListReports, getGetCreditsQueryKey, getListReportsQueryKey, type ReportSummary,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { StatusDots } from "@/components/StatusDots";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { PERSONAL_REPORT } from "@/lib/product";
import { HOW_OPTIONS, HOW_QUESTION, LENSES, PARENT_QUESTION, lensInfo } from "@/lib/lenses";
import {
  enterPreselect, forgetSelection, readSelection, reconcileSelection, rememberSelection, unpickable, type PairSelection,
} from "@/lib/pair-selection";

export interface CompatibilityPickerProps {
  /** The list the page already holds; undefined while it loads, so a remembered or preselected pair waits for it. */
  reports?: ReportSummary[];
  /** A pair chosen elsewhere, from `preselectPair`. Each press passes a new object, so a second press brings the picker back. */
  preselect?: Partial<PairSelection> | null;
  /** Opens the new report once it exists; the dashboard passes false and the pair's own row takes over (reading 6). */
  openOnCreate?: boolean;
  /** The pair being written, from the press until the list holds it, then null: the dashboard row's Generating (ADR-130). */
  onGenerating?: (pair: Pick<PairSelection, "a" | "b"> | null) => void;
  /** `creditsEnforced()` (ADR-138): at zero the button becomes Get credits. False keeps the soft pass. */
  enforced?: boolean;
  onGetCredits?: () => void;
}

/** Outside the picker, so a render never remounts the select and drops the keyboard's place in it. */
function ReportSelect({ label, value, onChange, exclude, reports }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  exclude: string;
  reports: readonly ReportSummary[];
}) {
  return (
    <label className="grid gap-1">
      <span className="font-label text-[10px] tracking-[0.18em] uppercase text-muted-foreground">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="rounded-md border border-input bg-background px-3 py-2 text-sm">
        <option value="">Choose a report</option>
        {reports.map((r) => {
          const why = unpickable(r);
          return (
            <option key={r.id} value={r.id} disabled={!!why || r.id === exclude}>
              {r.name}{why ? ` · ${why}` : ""}
            </option>
          );
        })}
      </select>
    </label>
  );
}

export function CompatibilityPicker({
  reports: given, preselect = null, openOnCreate = true, onGenerating, enforced = false, onGetCredits,
}: CompatibilityPickerProps) {
  const [, navigate] = useLocation();
  const client = useQueryClient();
  const reduced = useReducedMotion();
  const section = useRef<HTMLElement>(null);
  const listed = useListReports({ query: { queryKey: getListReportsQueryKey(), enabled: !given } });
  const credits = useGetCredits();
  // On the hook, not the call: a call's callbacks are skipped once the viewer has left the page.
  const create = useCreateCompatibilityReport({ mutation: { onSuccess: () => forgetSelection() } });
  const loaded = useMemo(() => {
    const all = given ?? listed.data;
    return Array.isArray(all) ? all.filter((r) => r.kind === "natal") : undefined;
  }, [given, listed.data]);
  const reports = loaded ?? [];

  const remembered = useMemo(() => readSelection(), []);
  const restored = useMemo(() => reconcileSelection(remembered, loaded), [remembered, loaded]);
  // Derived rather than copied into state, so the remembered pair shows in the
  // same render the list vouches for it, and a pick made while it loads wins.
  const [picked, setPicked] = useState<Partial<PairSelection> | null>(null);
  const shown = picked ?? (restored.state === "kept" ? restored.selection : {});
  const pick = (change: Partial<PairSelection>) => setPicked({ ...shown, ...change });
  const a = shown.a ?? "";
  const b = shown.b ?? "";
  const lens = shown.lens ?? "";
  const parent = shown.parent ?? "A";
  const how = shown.how ?? "";
  useEffect(() => {
    if (picked) rememberSelection(picked);
  }, [picked]);
  useEffect(() => {
    if (!picked && restored.state === "dropped") forgetSelection();
  }, [picked, restored.state]);

  // A preselect answers to the remembered pair's checks (ADR-105): it waits for
  // the list, and enters only while the list holds both of its reports.
  const entered = useRef<Partial<PairSelection> | null>(null);
  useEffect(() => {
    if (!preselect || entered.current === preselect) return;
    const check = reconcileSelection(preselect, loaded);
    if (check.state === "waiting") return;
    entered.current = preselect;
    if (check.state === "kept") {
      const incoming = check.selection;
      const before = restored.state === "kept" ? restored.selection : {};
      setPicked((prev) => enterPreselect(prev ?? before, incoming));
    }
    // A pair the list dropped still brings the picker into view, so a press is never lost.
    section.current?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
    section.current?.focus({ preventScroll: true });
  }, [preselect, loaded, restored, reduced]);

  const info = lens ? lensInfo(lens) : null;
  const nameOf = (id: string) => reports.find((r) => r.id === id)?.name ?? "";
  const ready = a && b && a !== b && lens && (!info?.asksHow || how) && !unpickable(reports.find((r) => r.id === a)) && !unpickable(reports.find((r) => r.id === b));
  const [settling, setSettling] = useState(false);
  const busy = settling || create.isPending;
  const balance = credits.data?.available;
  // MB-6 provisional: zero reads Get credits only where credits are enforced
  // (ADR-138); elsewhere the soft pass still writes the report.
  const outOfCredits = enforced && balance === 0;
  const noCredit = !enforced && balance === 0;

  function submit() {
    if (!ready || !lens || busy) return;
    setSettling(true);
    onGenerating?.({ a, b });
    const settle = () => {
      setSettling(false);
      onGenerating?.(null);
    };
    create.mutate({ data: { reportAId: a, reportBId: b, lens, ...(info?.asksParent ? { parent } : {}), ...(info?.asksHow && how ? { label: how } : {}) } }, {
      onSuccess: (res) => {
        void client.invalidateQueries({ queryKey: getGetCreditsQueryKey() });
        const listedAgain = client.invalidateQueries({ queryKey: getListReportsQueryKey() });
        if (openOnCreate) {
          settle();
          navigate(`/compatibility/${res.id}`);
          return;
        }
        // Generating holds until the list carries the pair, so its row turns
        // Writing with no idle Generate in between (reading 6).
        void listedAgain.then(() => {
          setPicked({});
          settle();
        }, settle);
      },
      onError: settle,
    });
  }

  return (
    <section
      ref={section}
      tabIndex={-1}
      className="scroll-mt-20 rounded-xl border border-border/60 bg-card/30 p-5 outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
      aria-label="New compatibility report"
    >
      <p className="font-label text-[10px] tracking-[0.2em] uppercase text-primary/80">New compatibility report</p>
      <h3 className="mt-1 font-display text-xl">Two finished reports in, one report out.</h3>
      <p className="mt-1 text-sm text-muted-foreground">How compatible you are, and why. Any two {PERSONAL_REPORT.toLowerCase()}s you can see.</p>
      {reports.length < 2 && (
        <p className="mt-3 text-sm text-muted-foreground">You need two finished {PERSONAL_REPORT.toLowerCase()}s first. Add the other person the normal way.</p>
      )}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <ReportSelect label="Report A" value={a} onChange={(v) => pick({ a: v })} exclude={b} reports={reports} />
        <ReportSelect label="Report B" value={b} onChange={(v) => pick({ b: v })} exclude={a} reports={reports} />
      </div>
      <div className="mt-4" role="radiogroup" aria-label="Lens">
        <span className="font-label text-[10px] tracking-[0.18em] uppercase text-muted-foreground">Lens</span>
        <div className="mt-1 grid gap-2 sm:grid-cols-3">
          {LENSES.map((l) => (
            <label key={l.lens} className={`cursor-pointer rounded-xl border px-3 py-2 ${lens === l.lens ? "border-primary/60 bg-primary/10" : "border-border/60 hover:border-border"}`}>
              <input type="radio" name="lens" value={l.lens} checked={lens === l.lens} onChange={() => pick({ lens: l.lens })} className="sr-only" />
              <span className="block font-display text-base">{l.title}</span>
              <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">{l.door}</span>
            </label>
          ))}
        </div>
      </div>
      {info?.asksParent && a && b && (
        <div className="mt-4" role="radiogroup" aria-label={PARENT_QUESTION}>
          <span className="font-label text-[10px] tracking-[0.18em] uppercase text-muted-foreground">{PARENT_QUESTION}</span>
          <div className="mt-1 flex flex-wrap gap-2">
            {(["A", "B"] as const).map((side) => (
              <label key={side} className={`cursor-pointer rounded-full border px-3 py-1.5 text-xs ${parent === side ? "border-primary/60 bg-primary/10" : "border-border/60 text-muted-foreground"}`}>
                <input type="radio" name="parent" value={side} checked={parent === side} onChange={() => pick({ parent: side })} className="sr-only" />
                {nameOf(side === "A" ? a : b) || `Report ${side}`}
              </label>
            ))}
          </div>
        </div>
      )}
      {info?.asksHow && (
        <div className="mt-4" role="radiogroup" aria-label={HOW_QUESTION}>
          <span className="font-label text-[10px] tracking-[0.18em] uppercase text-muted-foreground">{HOW_QUESTION}</span>
          <div className="mt-1 flex flex-wrap gap-2">
            {HOW_OPTIONS.map((option) => (
              <label key={option} className={`cursor-pointer rounded-full border px-3 py-1.5 text-xs capitalize ${how === option ? "border-primary/60 bg-primary/10" : "border-border/60 text-muted-foreground"}`}>
                <input type="radio" name="how" value={option} checked={how === option} onChange={() => pick({ how: option })} className="sr-only" />
                {option}
              </label>
            ))}
          </div>
        </div>
      )}
      <div className="mt-5 flex flex-wrap items-center gap-3">
        {busy ? (
          // ADR-130: under way, the control is a status with dots, never its idle verb.
          <Button disabled className="font-label border-primary/35 bg-primary/10 text-[#9FA8DA] disabled:opacity-100">
            <StatusDots label="Generating" />
          </Button>
        ) : outOfCredits ? (
          <>
            <Button variant="outline" onClick={onGetCredits} className="font-label [border-color:hsl(var(--primary)/0.6)] text-[#9FA8DA]">Get credits</Button>
            <span className="text-xs text-muted-foreground">No credits left</span>
          </>
        ) : (
          <Button disabled={!ready} onClick={submit} className="font-label">Write the report</Button>
        )}
        {noCredit && (
          // MB-6 provisional: the no-credit state names itself and still runs on the soft pass until checkout exists.
          <span className="text-xs text-muted-foreground">No credit on your account yet; the report is written on the house until pricing lands.</span>
        )}
        {create.isError && <span className="text-xs text-destructive">Could not start the report. Try again in a minute.</span>}
      </div>
    </section>
  );
}

export default CompatibilityPicker;

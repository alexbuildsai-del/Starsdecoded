/**
 * The one way into a compatibility report (ADR-40, ADR-42): two natal reports
 * the viewer can see, any two, own not required; a complete one selectable and
 * a writing one visible and disabled; the lens required, parent and child
 * asking who the parent is, two people asking how they know each other
 * (ADR-68); one call to action. No birth form, ever.
 */
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useCreateCompatibilityReport, useGetCredits, useListReports, getListReportsQueryKey, type ReportSummary } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { PERSONAL_REPORT } from "@/lib/product";
import { HOW_OPTIONS, HOW_QUESTION, LENSES, PARENT_QUESTION, lensInfo } from "@/lib/lenses";
import { forgetSelection, readSelection, reconcileSelection, rememberSelection, unpickable, type PairSelection } from "@/lib/pair-selection";

export function CompatibilityPicker({ reports: given }: { reports?: ReportSummary[] }) {
  const [, navigate] = useLocation();
  const client = useQueryClient();
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

  const info = lens ? lensInfo(lens) : null;
  const nameOf = (id: string) => reports.find((r) => r.id === id)?.name ?? "";
  const ready = a && b && a !== b && lens && (!info?.asksHow || how) && !unpickable(reports.find((r) => r.id === a)) && !unpickable(reports.find((r) => r.id === b));
  const noCredit = credits.data ? credits.data.available === 0 : false;

  function submit() {
    if (!ready || !lens) return;
    create.mutate({ data: { reportAId: a, reportBId: b, lens, ...(info?.asksParent ? { parent } : {}), ...(info?.asksHow && how ? { label: how } : {}) } }, {
      onSuccess: (res) => {
        client.invalidateQueries({ queryKey: getListReportsQueryKey() });
        navigate(`/compatibility/${res.id}`);
      },
    });
  }

  const Select = ({ label, value, onChange, exclude }: { label: string; value: string; onChange: (v: string) => void; exclude: string }) => (
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

  return (
    <section className="rounded-xl border border-border/60 bg-card/30 p-5" aria-label="New compatibility report">
      <p className="font-label text-[10px] tracking-[0.2em] uppercase text-primary/80">New compatibility report</p>
      <h3 className="mt-1 font-display text-xl">Two finished reports in, one report out.</h3>
      <p className="mt-1 text-sm text-muted-foreground">How compatible you are, and why. Any two {PERSONAL_REPORT.toLowerCase()}s you can see.</p>
      {reports.length < 2 && (
        <p className="mt-3 text-sm text-muted-foreground">You need two finished {PERSONAL_REPORT.toLowerCase()}s first. Add the other person the normal way.</p>
      )}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Select label="Report A" value={a} onChange={(v) => pick({ a: v })} exclude={b} />
        <Select label="Report B" value={b} onChange={(v) => pick({ b: v })} exclude={a} />
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
        <Button disabled={!ready || create.isPending} onClick={submit} className="font-label">
          {create.isPending ? "Starting…" : "Write the report"}
        </Button>
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

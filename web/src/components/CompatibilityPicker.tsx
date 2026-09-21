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
import { HOW_OPTIONS, HOW_QUESTION, LENSES, PARENT_QUESTION, lensInfo, type HowKnown } from "@/lib/lenses";
import type { Lens } from "@/types/chart";

// MB-6 provisional: with no checkout yet the report runs on the soft credit
// pass; the selection is kept here so the payments round can attach checkout
// and return to it.
const SELECTION_KEY = "sd.pair.selection";

interface Selection { a: string; b: string; lens: Lens; parent: "A" | "B"; how: HowKnown }

function readSelection(): Partial<Selection> {
  try {
    return JSON.parse(window.sessionStorage.getItem(SELECTION_KEY) ?? "{}") as Partial<Selection>;
  } catch {
    return {};
  }
}

function rememberSelection(s: Partial<Selection>): void {
  try {
    window.sessionStorage.setItem(SELECTION_KEY, JSON.stringify(s));
  } catch {
    // Nothing else depends on it.
  }
}

/** Why a report cannot be picked, or null when it can. */
export function unpickable(r: ReportSummary): string | null {
  if (r.kind !== "natal") return "not a natal report";
  if (r.status === "complete") return null;
  if (r.status === "failed") return "could not be written";
  return "still writing";
}

export function CompatibilityPicker({ reports: given }: { reports?: ReportSummary[] }) {
  const [, navigate] = useLocation();
  const client = useQueryClient();
  const listed = useListReports({ query: { queryKey: getListReportsQueryKey(), enabled: !given } });
  const credits = useGetCredits();
  const create = useCreateCompatibilityReport();
  const reports = useMemo(() => (given ?? listed.data ?? []).filter((r) => r.kind === "natal"), [given, listed.data]);

  const remembered = useMemo(readSelection, []);
  const [a, setA] = useState(remembered.a ?? "");
  const [b, setB] = useState(remembered.b ?? "");
  const [lens, setLens] = useState<Lens | "">(remembered.lens ?? "");
  const [parent, setParent] = useState<"A" | "B">(remembered.parent ?? "A");
  const [how, setHow] = useState<HowKnown | "">(remembered.how ?? "");
  useEffect(() => { rememberSelection({ a, b, lens: lens || undefined, parent, how: how || undefined }); }, [a, b, lens, parent, how]);

  const info = lens ? lensInfo(lens) : null;
  const nameOf = (id: string) => reports.find((r) => r.id === id)?.name ?? "";
  const ready = a && b && a !== b && lens && (!info?.asksHow || how) && !unpickable(reports.find((r) => r.id === a)!) && !unpickable(reports.find((r) => r.id === b)!);
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
      <p className="mt-1 text-sm text-muted-foreground">How compatible you are, and why. Any two natal reports you can see.</p>
      {reports.length < 2 && (
        <p className="mt-3 text-sm text-muted-foreground">You need two finished natal reports first. Add the other person the normal way.</p>
      )}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Select label="Report A" value={a} onChange={setA} exclude={b} />
        <Select label="Report B" value={b} onChange={setB} exclude={a} />
      </div>
      <div className="mt-4" role="radiogroup" aria-label="Lens">
        <span className="font-label text-[10px] tracking-[0.18em] uppercase text-muted-foreground">Lens</span>
        <div className="mt-1 grid gap-2 sm:grid-cols-3">
          {LENSES.map((l) => (
            <label key={l.lens} className={`cursor-pointer rounded-xl border px-3 py-2 ${lens === l.lens ? "border-primary/60 bg-primary/10" : "border-border/60 hover:border-border"}`}>
              <input type="radio" name="lens" value={l.lens} checked={lens === l.lens} onChange={() => setLens(l.lens)} className="sr-only" />
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
                <input type="radio" name="parent" value={side} checked={parent === side} onChange={() => setParent(side)} className="sr-only" />
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
                <input type="radio" name="how" value={option} checked={how === option} onChange={() => setHow(option)} className="sr-only" />
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

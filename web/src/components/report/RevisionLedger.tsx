/**
 * The ledger at the top after a horizon pass (ADR-35): what the hour settled,
 * what was added, sentences per chapter, "Before · kept · compare any time",
 * and the toggle "Show what changed", on at first visit and remembered per
 * browser. The counts are the report's own; nothing is recounted here.
 */
import type { ChartData, HorizonPass, Interpretation } from "@/types/chart";

// MB-43 provisional: one localStorage key per report, no consent gate, as the explorer hint.
const KEY = (reportId: string) => `sd.marks.${reportId}`;

export function marksShown(reportId: string): boolean {
  try {
    return window.localStorage.getItem(KEY(reportId)) !== "0";
  } catch {
    return true;
  }
}

export function rememberMarks(reportId: string, shown: boolean): void {
  try {
    window.localStorage.setItem(KEY(reportId), shown ? "1" : "0");
  } catch {
    // A browser that refuses storage shows the marks again next time. Nothing else depends on it.
  }
}

/** The chapter each amended section belongs to, by number and name. */
const CHAPTER_OF: Record<string, string> = {
  overview: "01 Overview", triad: "02 Chart", mind: "03 Mind", career: "04 Career", money: "05 Money",
  relationships: "06 Relationships", family: "07 Family", superpowers: "08 Superpowers", discoveries: "09 Paradoxes", focus: "10 Closing",
};

export function RevisionLedger({
  pass, chart, meta, shown, onToggle,
}: {
  pass: HorizonPass;
  chart: ChartData;
  meta: Interpretation["meta"];
  shown: boolean;
  onToggle: (next: boolean) => void;
}) {
  const asc = chart.angles?.ascendant;
  const mc = chart.angles?.midheaven;
  const when = new Date(pass.at);
  const date = Number.isNaN(when.getTime()) ? pass.at : when.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const perChapter = Object.entries(pass.sections)
    .filter(([, s]) => s.amended.length || s.added.length)
    .map(([id, s]) => `${CHAPTER_OF[id] ?? id} ${s.amended.length}${s.added.length ? ` +${s.added.length}` : ""}`);

  return (
    <aside className="rp-ledger" aria-label="What your birth time changed">
      <p className="font-label text-[10px] tracking-[0.24em] uppercase text-brass/85">Birth time added · {date}</p>
      <div className="row mt-3">
        {asc && <span>Rising <b>{asc.degree.toFixed(1)}° {asc.sign}</b></span>}
        {mc && <span>Midheaven <b>{mc.degree.toFixed(1)}° {mc.sign}</b></span>}
        {meta.sect && <span><b>{meta.sect === "day" ? "Day" : "Night"}</b> chart</span>}
      </div>
      <div className="row mt-2">
        <span>Added <b>the rising sign, twelve house readings and the angles</b></span>
        <span><b>{pass.sentencesRevised}</b> sentences revised · <b>{pass.paragraphsAdded}</b> paragraphs added</span>
      </div>
      {perChapter.length > 0 && (
        <div className="row mt-2">
          <span className="text-[var(--muted)]">Per chapter</span>
          {perChapter.map((line) => <span key={line}>{line}</span>)}
        </div>
      )}
      <div className="row mt-2">
        <span>Before · <b>kept</b> · compare any time</span>
      </div>
      <button type="button" className="toggle no-print" aria-pressed={shown} onClick={() => onToggle(!shown)}>
        <span aria-hidden className={`inline-block h-3 w-3 rounded-sm border border-brass ${shown ? "bg-brass" : ""}`} />
        Show what changed
      </button>
    </aside>
  );
}

export default RevisionLedger;

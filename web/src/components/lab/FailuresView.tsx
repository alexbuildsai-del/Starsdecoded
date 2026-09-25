import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { labApi, type FailuresResponse } from "@/lib/labApi";
import { annexRow, groupBySection, rateLabel } from "@/lib/failureCounts";

/**
 * Failures (ADR-85): every rule that fired, counted per section, with the
 * red flag on a rule firing on more than 1 in 10 of a section's last 20
 * writes. That flag is the next round's prompt fix; nothing here edits a
 * prompt (R-5.4). Counts only, never a message and never report text.
 */
export function FailuresView() {
  const [data, setData] = useState<FailuresResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    labApi.failures().then(setData).catch((e: Error) => setError(e.message));
  }, []);

  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!data) return <Loader2 className="h-5 w-5 animate-spin text-primary/40" />;
  const sections = groupBySection(data.counts);
  const flagged = data.counts.filter((c) => c.flagged);

  return (
    <div className="flex flex-col gap-4 text-sm">
      <p className="text-muted-foreground">{data.writes} section writes logged, {data.rows} rows, {flagged.length ? <span className="text-destructive">{flagged.length} rule(s) flagged</span> : "no rule flagged"}. A flag is a rule firing on more than 2 of a section's last 20 writes: a prompt fix for the next round.</p>
      {sections.length === 0 && <p className="text-muted-foreground">Nothing logged yet. Every check a section write meets lands here as a row.</p>}
      {sections.map((s) => (
        <div key={s.section} className="rounded-lg border border-border/60 bg-card/40 p-3">
          <p className="font-label text-xs tracking-wide mb-2"><span className={s.flagged ? "text-destructive" : "text-primary"}>{s.section}</span> <span className="text-muted-foreground">· {s.total} check(s){s.flagged ? ` · ${s.flagged} flagged` : ""}</span></p>
          <table className="w-full text-xs font-numeric">
            <thead className="text-muted-foreground"><tr><th className="text-left">rule</th><th>row</th><th>class</th><th>count</th><th>last 20 writes</th><th className="text-left">last</th></tr></thead>
            <tbody>
              {s.rules.map((r) => (
                <tr key={r.rule} className={`border-t border-border/30 ${r.flagged ? "text-destructive" : ""}`}>
                  <td>{r.flagged ? "● " : ""}{r.rule}</td>
                  <td className="text-center">{annexRow(r.rule) ?? "-"}</td>
                  <td className="text-center">{r.cls}</td>
                  <td className="text-center">{r.count}</td>
                  <td className="text-center">{rateLabel(r.rate)}</td>
                  <td className="text-muted-foreground">{r.lastAt.slice(0, 16).replace("T", " ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

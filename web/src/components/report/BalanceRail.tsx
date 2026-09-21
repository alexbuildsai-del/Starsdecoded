/**
 * The Deepdive's second picture: what the chart is made of and what it does
 * with it. Element bars carry the element hues, because that is the one place
 * those hues mean anything; modality bars take the chapter accent (§9, ADR-23).
 */
import { ELEMENT_HEX } from "@/lib/chapter-accent";
import type { ChartData } from "@/types/chart";

function Bar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="rp-lab capitalize" style={{ color }}>{label}</span>
        <span className="font-numeric text-xs" style={{ color: "var(--muted)" }}>{count} / {total}</span>
      </div>
      <div className="h-1 overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,.07)" }}>
        <div className="h-full rounded-full" style={{ width: `${(count / total) * 100}%`, background: color }} />
      </div>
    </div>
  );
}

export function BalanceRail({ chartData }: { chartData: ChartData }) {
  const total = Object.values(chartData.elements).reduce((a, b) => a + b, 0);
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="rp-box" style={{ marginTop: 0, maxWidth: "none" }}>
        <span className="rp-lab mb-4 block">Elements</span>
        <div className="space-y-3">
          {Object.entries(chartData.elements).map(([el, count]) => (
            <Bar key={el} label={el} count={count} total={total} color={ELEMENT_HEX[el] ?? "var(--accent)"} />
          ))}
        </div>
      </div>
      <div className="rp-box" style={{ marginTop: 0, maxWidth: "none" }}>
        <span className="rp-lab mb-4 block">Modalities</span>
        <div className="space-y-3">
          {Object.entries(chartData.modalities).map(([mod, count]) => (
            <Bar key={mod} label={mod} count={count} total={total} color="var(--accent)" />
          ))}
        </div>
        <div className="mt-4 pt-4" style={{ borderTop: "1px solid var(--line-soft)" }}>
          <div className="flex justify-between font-numeric text-xs">
            <span style={{ color: "var(--muted)" }}>Dominant</span>
            <span className="capitalize" style={{ color: "var(--paper-dim)" }}>
              {chartData.dominance.dominantElement} · {chartData.dominance.dominantModality}
            </span>
          </div>
          {chartData.chartShape && (
            <div className="mt-1.5 flex justify-between font-numeric text-xs">
              <span style={{ color: "var(--muted)" }}>Chart shape</span>
              <span className="capitalize" style={{ color: "var(--paper-dim)" }}>{chartData.chartShape}</span>
            </div>
          )}
        </div>
        <a
          href="#chapter-3"
          className="mt-4 block font-label text-[9px] uppercase tracking-[0.2em] text-[var(--accent)]"
        >
          Read more in Mind →
        </a>
      </div>
    </div>
  );
}

export default BalanceRail;

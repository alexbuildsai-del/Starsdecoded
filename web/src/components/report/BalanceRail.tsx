/**
 * The Deepdive's second picture: what the chart is made of and what it does
 * with it. Element bars carry the element hues, because that is the one place
 * those hues mean anything; modality bars take the chapter accent (§9, ADR-23).
 */
import { tokens } from "@workspace/design";
import { leaders } from "@/lib/leaders";
import type { ChartData } from "@/types/chart";

// Element hues are data and belong to these bars alone (ADR-23).
const ELEMENT_COLOUR: Record<string, string> = {
  fire: tokens.color["element-fire"],
  earth: tokens.color["element-earth"],
  air: tokens.color["element-air"],
  water: tokens.color["element-water"],
};

function Bar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="rp-lab capitalize" style={{ color }}>{label}</span>
        <span className="font-numeric text-data text-muted">{count} / {total}</span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-paper/10">
        <div className="h-full rounded-full" style={{ width: `${(count / total) * 100}%`, background: color }} />
      </div>
    </div>
  );
}

/** "Fire, Earth and Water": each name capitalised, the joining word not. */
function Names({ list }: { list: string[] }) {
  return (
    <>
      {list.map((name, i) => (
        <span key={name}>
          {i === 0 ? "" : i === list.length - 1 ? " and " : ", "}
          <span className="capitalize">{name}</span>
        </span>
      ))}
    </>
  );
}

export function BalanceRail({ chartData }: { chartData: ChartData }) {
  const total = Object.values(chartData.elements).reduce((a, b) => a + b, 0);
  // The engine's dominance names the first of a tie; the counts on the bars say who shares the top (MB-124 provisional).
  const element = leaders(chartData.elements);
  const modality = leaders(chartData.modalities);
  const alone = (list: string[], named: string) => (list.length ? list : [named]);
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="rp-box" style={{ marginTop: 0, maxWidth: "none" }}>
        <span className="rp-lab mb-4 block">Elements</span>
        <div className="space-y-3">
          {Object.entries(chartData.elements).map(([el, count]) => (
            <Bar key={el} label={el} count={count} total={total} color={ELEMENT_COLOUR[el] ?? "var(--accent)"} />
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
        <div className="mt-4 border-t border-line-soft pt-4">
          <div className="flex justify-between gap-4 font-numeric text-data">
            <span className="text-muted">Dominant</span>
            <span className="min-w-0 text-right text-paper-dim">
              <Names list={alone(element, chartData.dominance.dominantElement)} /> · <Names list={alone(modality, chartData.dominance.dominantModality)} />
            </span>
          </div>
          {chartData.chartShape && (
            <div className="mt-1.5 flex justify-between font-numeric text-data">
              <span className="text-muted">Chart shape</span>
              <span className="capitalize text-paper-dim">{chartData.chartShape}</span>
            </div>
          )}
        </div>
        <a
          href="#chapter-3"
          className="mt-4 block font-label text-label uppercase text-(--accent)"
        >
          Read more in Mind →
        </a>
      </div>
    </div>
  );
}

export default BalanceRail;

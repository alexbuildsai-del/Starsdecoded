import { RetrogradeBadge } from "./RetrogradeBadge";

export default function RetrogradeBadgeExample() {
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <section>
        <h3 className="mb-2 text-xs text-muted">Today: P12 the Rx text, P9 and P10 badges in other reds</h3>
        <p className="flex items-center gap-2 text-sm text-paper-dim">
          Mercury 12° Libra <span className="font-label text-xs text-amber-400">Rx</span>
        </p>
      </section>
      <section className="grid gap-3">
        <h3 className="text-xs text-muted">After: P9, P10, P12 become one badge. P13 stays drawn on the dial.</h3>
        <p className="flex items-center gap-2 text-sm text-paper-dim">
          Mercury 12° Libra <RetrogradeBadge size="small" />
        </p>
        <p className="flex items-center gap-2 text-sm text-paper-dim">
          <RetrogradeBadge /> Mercury going back
        </p>
        <p className="flex items-center gap-2 text-sm text-paper-dim">
          <RetrogradeBadge label="Retrograde" /> alone, with a name
        </p>
      </section>
    </div>
  );
}

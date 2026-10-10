import { PIN_LIMIT, localTicks, type TickStore } from "@/lib/workbook";
import { SAMPLE } from "@/site/data/sample";
import { Checklist, type ChecklistItem } from "./Checklist";

// The things to try are the stored sample run's own, so the words are a report's, not invented here.
const items: ChecklistItem[] = (SAMPLE.run.money?.actions ?? []).slice(0, 3).map((a, i) => ({ key: `ds-example-${i}`, action: a.action, why: a.why }));
// A page-only store that can pin, so the pin, its tooltip and its status line show without a report behind them.
const pins = new Set<string>();
const store: TickStore = {
  ...localTicks(),
  pinned: (key) => pins.has(key),
  togglePin: (key) => {
    if (pins.delete(key)) return true;
    if (pins.size >= PIN_LIMIT) return false;
    pins.add(key);
    return true;
  },
};

export default function ChecklistExample() {
  return (
    <div className="rp-root grid gap-6 p-4">
      <section className="grid gap-2">
        <p className="m-0 font-label text-label uppercase text-label-dim">Today · RP22, CP13</p>
        <p className="m-0 max-w-prose text-small text-paper-dim">
          The same rows: a 20 px box ticked in the list's colour, the why on its own line, the pin with its tooltip and the limit
          line. After, the box is TickBox with a 44 px tap, the pin has a 44 px tap, and labels at 9.5 and 10 px move to 11.
        </p>
      </section>
      <section className="grid max-w-xl gap-2">
        <p className="m-0 font-label text-label uppercase text-label-dim">After · its own store (teal): tick, untick, pin, hover the pin</p>
        <Checklist heading="What to do" items={items} store={store} pinnable />
      </section>
    </div>
  );
}

import { Chip } from "./Chip";
import { RetrogradeBadge } from "./RetrogradeBadge";
import { ToneDot } from "./ToneDot";

// Stands in for PlanetBody (R20-10): the icon slot takes any node.
const planet = <span aria-hidden="true" className="size-4 rounded-full bg-brass" />;

export default function ChipExample() {
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <section className="grid content-start gap-3">
        <h3 className="text-xs text-muted">Today: 13 recipes, text 9.5 to 11.5 px, no icon slot</h3>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-line px-2.5 py-1 text-[9.5px] uppercase tracking-widest text-paper-dim">Age 29</span>
          <span className="rounded-full border border-indigo px-2.5 py-1 text-[10px] uppercase text-paper">Now</span>
          <span className="rounded-full border border-line px-2.5 py-1 font-mono text-[11.5px] text-brass">Stellium</span>
        </div>
      </section>
      <section className="grid content-start gap-3">
        <h3 className="text-xs text-muted">After: one Chip, 11 px, corners full</h3>
        <div className="flex flex-wrap items-center gap-2">
          <Chip>P3 Age 29</Chip>
          <Chip tone="now">P4 Now</Chip>
          <Chip tone="now" icon={<ToneDot tone="credit" />}>P7 3 credits</Chip>
          <Chip icon={<ToneDot tone="light" />}>P5 Both read</Chip>
          <Chip tone="teal">P6 This is me</Chip>
          <Chip tone="brass">P8 Stellium</Chip>
          <Chip tone="back" icon={<RetrogradeBadge size="small" />}>P11 Venus going back</Chip>
          <Chip href="#03">P14 03 How you love</Chip>
          <Chip quiet icon={planet}>Quiet, with a planet</Chip>
        </div>
        <h3 className="text-xs text-muted">States: control, selected, disabled</h3>
        <div className="flex flex-wrap items-center gap-2">
          <Chip onClick={() => undefined}>Button</Chip>
          <Chip onClick={() => undefined} selected>Selected</Chip>
          <Chip onClick={() => undefined} disabled>Disabled</Chip>
        </div>
      </section>
    </div>
  );
}

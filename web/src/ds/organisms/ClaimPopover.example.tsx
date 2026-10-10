import { calculateNatalChart } from "@workspace/engine";
import audrey from "../../../../fixtures/charts/audrey-hepburn.json";
import type { Claim } from "@/types/chart";
import { ClaimPopover } from "./ClaimPopover";

// The evidence is read off the chart computed at run time, never typed in.
const chart = calculateNatalChart(audrey.birthDate, audrey.birthTime, audrey.latitude, audrey.longitude, audrey.timezone);
const moon = chart.planets.moon;
const label = `Moon in ${moon.sign}${moon.house ? `, house ${moon.house}` : ""}`;
const claim: Claim = {
  quote: "You weigh everything before you say yes",
  evidence: [{ label, ref: { kind: "placement", body: "moon", sign: moon.sign, house: moon.house } }],
};

export default function ClaimPopoverExample() {
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <section className="grid content-start gap-3">
        <h3 className="text-xs text-muted">Today: a hand-made card placed by measuring, a CSS-only sheet on touch</h3>
        <p className="m-0 max-w-prose text-sm text-paper-dim">Closed and open look the same as After; the card is a fixed div, not a Radix layer.</p>
      </section>
      <section className="grid content-start gap-3">
        <h3 className="text-xs text-muted">After: hover, focus or tap the number (a Sheet on a phone)</h3>
        <p className="m-0 max-w-prose font-serif text-base text-paper">
          <mark className="rp-claimed">You weigh everything before you say yes</mark>
          <ClaimPopover index={1} claim={claim} />
          , and then you stay the course.
        </p>
      </section>
    </div>
  );
}

/**
 * Chapter 10. The two nodes are one axis: what is already fluent at one end,
 * what is unpractised at the other. Chiron is the tender spot. The explainer is
 * fixed vocabulary, never written about this reader (ADR-18); everything after
 * it is the report's own words.
 */
import { CitedText, newCitationCounter } from "@/components/report/Citation";
import type { PathSection } from "@/types/chart";

/** Two sentences, the same for everyone, so the chapter can be read cold. */
const EXPLAINER = "The lunar nodes are the two points where the Moon's path crosses the Sun's, "
  + "and they are read as one axis rather than as two places. Chiron is a small body between "
  + "Saturn and Uranus, read by house as the place that stays tender.";

export function PathBlock({ s }: { s: PathSection }) {
  const k = newCitationCounter();
  return (
    <div className="rp-prose">
      <p className="text-[var(--paper-dim)]">{EXPLAINER}</p>
      <div className="rp-lblk">
        <span className="rp-lab">What you fall back on</span>
        <p>{CitedText({ text: s.fallBackOn, claims: s.claims, counter: k })}</p>
      </div>
      <div className="rp-lblk">
        <span className="rp-lab">Where you are headed</span>
        <p>{CitedText({ text: s.headedToward, claims: s.claims, counter: k })}</p>
      </div>
      <div className="rp-lblk">
        <span className="rp-lab">The tender spot</span>
        <p>{CitedText({ text: s.tenderSpot, claims: s.claims, counter: k })}</p>
      </div>
    </div>
  );
}

export default PathBlock;

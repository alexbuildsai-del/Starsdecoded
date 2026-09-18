/**
 * Chapter 10. The two nodes are one axis: what is already fluent at one end,
 * what is unpractised at the other. Chiron is the tender spot. The explainer is
 * fixed vocabulary, never written about this reader (ADR-18); everything after
 * it is the report's own words.
 */
import { CitedText, newCitationCounter } from "@/components/report/Citation";
import type { PathSection } from "@/types/chart";

/** Fixed vocabulary, the same for everyone, so the chapter can be read cold. */
const EXPLAINER = "One way of reading the Moon's nodes says we each arrive with some parts of our "
  + "character already well developed and others barely used. The South Node marks the developed "
  + "side: the traits you fall back on without thinking. You are genuinely good there, and leaning "
  + "on that side for safety is also what stalls you. The North Node marks the qualities you still "
  + "have to work at, and building them is what brings the balance. Chiron sits apart from that "
  + "axis: it marks the place that stays tender, and where that tenderness can turn into skill.";

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

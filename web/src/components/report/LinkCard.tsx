/**
 * One card per drawn link and per notable overlay (ADR-43): the two bodies,
 * the aspect and its orb, or the body and the house, its generated reading
 * of 40 to 70 words ending on a behaviour check, and its tag. No number
 * describes the pair; the orb is geometry.
 */
import { PLANET_LABELS, type PairLink } from "@/types/chart";
import { ORDINALS } from "@/lib/evidence-glossary";

const TAG: Record<PairLink["kind"], string> = { flows: "flows", rubs: "rubs", overlay: "overlay" };

export function linkTitle(link: PairLink, nameA: string, nameB: string): string {
  if (link.kind === "overlay") {
    const owner = link.of === "A" ? nameA : nameB;
    const host = link.of === "A" ? nameB : nameA;
    const house = link.house ? ORDINALS[link.house - 1] : "";
    return `${owner}'s ${PLANET_LABELS[link.planet ?? ""] ?? link.planet} in ${host}'s ${house} house`;
  }
  return `${nameA}'s ${PLANET_LABELS[link.planetA ?? ""] ?? link.planetA} ${link.aspect} ${nameB}'s ${PLANET_LABELS[link.planetB ?? ""] ?? link.planetB}`;
}

export function LinkCard({ link, nameA, nameB }: { link: PairLink; nameA: string; nameB: string }) {
  const [body, check] = splitCheck(link.reading);
  return (
    <article className="rp-link">
      <div className="t">
        <span className={`k ${link.kind}`}>{TAG[link.kind]}</span>
        {link.kind !== "overlay" && link.orb !== undefined && <span className="o">{link.orb.toFixed(1)}° orb</span>}
      </div>
      <h4>{linkTitle(link, nameA, nameB)}</h4>
      <p>{body}</p>
      {check && <p><span className="rp-lab">Behaviour check</span> {check}</p>}
    </article>
  );
}

/** The reading and its closing behaviour check, apart, so the check can carry its label. */
export function splitCheck(reading: string): [string, string | null] {
  const i = reading.indexOf("Behaviour check:");
  if (i < 0) return [reading, null];
  return [reading.slice(0, i).trim(), reading.slice(i + "Behaviour check:".length).trim()];
}

export function LinkCards({ links, nameA, nameB }: { links: PairLink[]; nameA: string; nameB: string }) {
  if (!links.length) return null;
  return (
    <div className="rp-links">
      {links.map((l, i) => <LinkCard key={i} link={l} nameA={nameA} nameB={nameB} />)}
    </div>
  );
}

export default LinkCard;

/**
 * One card per drawn link and per notable overlay (ADR-43): the two bodies,
 * the aspect and its orb, or the body and the house with its word (ADR-98),
 * its generated reading of 40 to 70 words ending on a behaviour check, and
 * its tag. No number describes the pair; the orb is geometry. An aspect card
 * carries the id the ledger's glyph scrolls to (ADR-101).
 */
import { PLANET_LABELS, type PairLink } from "@/types/chart";
import { ORDINALS, houseWord } from "@/lib/evidence-glossary";
import { linkAnchor } from "@/lib/ledger";

const TAG: Record<PairLink["kind"], string> = { flows: "flows", rubs: "rubs", overlay: "overlay" };

export function linkTitle(link: PairLink, nameA: string, nameB: string): string {
  if (link.kind === "overlay") {
    const owner = link.of === "A" ? nameA : nameB;
    const host = link.of === "A" ? nameB : nameA;
    const house = link.house ? ORDINALS[link.house - 1] : "";
    const word = link.house ? houseWord(link.house) : "";
    return `${owner}'s ${PLANET_LABELS[link.planet ?? ""] ?? link.planet} in ${host}'s ${house} house${word ? ` (${word})` : ""}`;
  }
  return `${nameA}'s ${PLANET_LABELS[link.planetA ?? ""] ?? link.planetA} ${link.aspect} ${nameB}'s ${PLANET_LABELS[link.planetB ?? ""] ?? link.planetB}`;
}

/** The card's element id, for an aspect card; an overlay has no glyph pointing at it. */
export function linkCardId(link: PairLink): string | undefined {
  if (link.kind === "overlay" || !link.planetA || !link.aspect || !link.planetB) return undefined;
  return linkAnchor({ planetA: link.planetA, aspect: link.aspect, planetB: link.planetB });
}

export function LinkCard({ link, nameA, nameB }: { link: PairLink; nameA: string; nameB: string }) {
  const [body, check] = splitCheck(link.reading);
  return (
    <article className="rp-link scroll-mt-24 focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent)]" id={linkCardId(link)} tabIndex={-1}>
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

/**
 * The reading room's pure rules (ADR-54): letters from a stored order, tie
 * groups, the next unjudged card with career first, and a section's JSON
 * rendered as the paragraphs a reader would see. No fetch, no React.
 */
export const LETTERS = "ABCDEFGHIJ";

export interface Picks {
  best: number[];
  notShip: number[];
  same: number[][];
}

export const EMPTY_PICKS: Picks = { best: [], notShip: [], same: [] };

/** The room's order: career first, then the session's sections as listed, fixtures inside each section. */
export const ROOM_ORDER = ["career", "overview", "superpowers", "discoveries", "mind", "money", "relationships", "family", "triad", "focus", "houses", "foundation"];

export function sectionRank(section: string): number {
  const i = ROOM_ORDER.indexOf(section);
  return i === -1 ? ROOM_ORDER.length : i;
}

export interface CardRef {
  id: string;
  index: number;
  fixture: string;
  section: string;
  judged: boolean;
}

/** The cards in reading order: by section rank, then by stored index. */
export function orderCards<T extends CardRef>(cards: T[]): T[] {
  return [...cards].sort((a, b) => sectionRank(a.section) - sectionRank(b.section) || a.index - b.index);
}

/** Where the room reopens: the first unjudged card in reading order, or null when every card is judged. */
export function nextCard<T extends CardRef>(cards: T[]): T | null {
  return orderCards(cards).find((c) => !c.judged) ?? null;
}

/** Toggle a letter in a group; a variant marked best cannot also be would-not-ship. */
export function toggleBest(picks: Picks, i: number): Picks {
  const best = picks.best.includes(i) ? picks.best.filter((x) => x !== i) : [...picks.best, i];
  return { ...picks, best, notShip: picks.notShip.filter((x) => x !== i) };
}

export function toggleNotShip(picks: Picks, i: number): Picks {
  const notShip = picks.notShip.includes(i) ? picks.notShip.filter((x) => x !== i) : [...picks.notShip, i];
  return { ...picks, notShip, best: picks.best.filter((x) => x !== i) };
}

/**
 * "Same as": ties two variants. Groups merge when either is already tied, so
 * A=B then B=C is one group of three. Tying a variant with itself is a no-op.
 */
export function tie(picks: Picks, a: number, b: number): Picks {
  if (a === b) return picks;
  const touching = picks.same.filter((g) => g.includes(a) || g.includes(b));
  const rest = picks.same.filter((g) => !g.includes(a) && !g.includes(b));
  const merged = [...new Set([a, b, ...touching.flat()])].sort((x, y) => x - y);
  return { ...picks, same: [...rest, merged] };
}

/** Remove a variant from whatever group it sits in; a group of one dissolves. */
export function untie(picks: Picks, i: number): Picks {
  const same = picks.same.map((g) => g.filter((x) => x !== i)).filter((g) => g.length > 1);
  return { ...picks, same };
}

export function groupOf(picks: Picks, i: number): number[] | null {
  return picks.same.find((g) => g.includes(i)) ?? null;
}

/** A card counts as judged once something was picked: a best, a would-not-ship, or a tie. */
export function isJudged(picks: Picks | null): boolean {
  return !!picks && (picks.best.length > 0 || picks.notShip.length > 0 || picks.same.length > 0);
}

/** "growingEdge" reads as "Growing edge". */
export function humanize(key: string): string {
  const s = key.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export type Block = { kind: "heading"; text: string } | { kind: "paragraph"; text: string } | { kind: "bullet"; text: string };

/**
 * A section's stored JSON as blocks: every string leaf in stored order, the
 * key names as small headings, arrays of items as bullets, the claims and
 * the labels left out. What the Owner reads is the prose, nothing else.
 */
export function blocksOf(value: unknown, depth = 0, out: Block[] = []): Block[] {
  if (typeof value === "string") { out.push({ kind: "paragraph", text: value }); return out; }
  if (Array.isArray(value)) {
    for (const item of value) {
      if (typeof item === "string") out.push({ kind: "bullet", text: item });
      else if (item && typeof item === "object") {
        const o = item as Record<string, unknown>;
        const parts = Object.entries(o).filter(([k, v]) => k !== "claims" && typeof v === "string").map(([, v]) => v as string);
        if (parts.length) out.push({ kind: "bullet", text: parts.join(" ") });
        else blocksOf(item, depth + 1, out);
      }
    }
    return out;
  }
  if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (k === "claims" || k === "label") continue;
      if (typeof v === "string" && ["intro", "text", "body"].includes(k)) { out.push({ kind: "paragraph", text: v }); continue; }
      if (typeof v === "string" && ["title", "name"].includes(k)) { out.push({ kind: "heading", text: v }); continue; }
      if (Array.isArray(v) && ["bullets", "items", "actions"].includes(k)) { blocksOf(v, depth + 1, out); continue; }
      if (typeof v === "string") { out.push({ kind: "heading", text: humanize(k) }, { kind: "paragraph", text: v }); continue; }
      out.push({ kind: "heading", text: humanize(k) });
      blocksOf(v, depth + 1, out);
    }
  }
  return out;
}

export function wordsOf(blocks: Block[]): number {
  return blocks.reduce((n, b) => n + (b.text.trim() ? b.text.trim().split(/\s+/).length : 0), 0);
}

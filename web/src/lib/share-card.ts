/**
 * A pair's story, pure: ADR-102's type-only words at ADR-175's 9:16, where each
 * line sits, which buttons this browser gets, and who the block names. No wheel,
 * no placement, no number; nothing is stored or hosted. Chapter 01 and the
 * dashboard build the same words, so they draw the same story.
 */
import { lensInfo } from "@/lib/lenses";
import type { Lens } from "@/types/chart";

export const SHARE_CARD = { width: 1080, height: 1920 } as const;

export const first = (name: string): string => name.trim().split(/\s+/)[0] ?? name;

export interface ShareCardText {
  eyebrow: string;
  /** Both first names, for the share sheet, the file name and the alt text. */
  title: string;
  /** The names as the story sets them, broken after the first. */
  titleLines: [string, string];
  headline: string;
  strengthsLabel: string;
  strengths: string[];
  foot: [string, string];
  wordmark: string;
}

/**
 * Trimmed, empty strengths dropped, as `GET /home` keeps them, so chapter 01's raw
 * words and the dashboard's copy of them give one story.
 */
export function shareCardText({ names, lens, headline, strengths }: { names: { a: string; b: string }; lens: Lens; headline: string; strengths: readonly string[] }): ShareCardText {
  const a = first(names.a);
  const b = first(names.b);
  return {
    eyebrow: `Compatibility report · ${lensInfo(lens).title}`,
    title: `${a} and ${b}`,
    titleLines: [a, `and ${b}`],
    headline: headline.trim(),
    strengthsLabel: "Your three strengths as a pair",
    strengths: strengths.map((s) => s.trim()).filter(Boolean).slice(0, 3),
    foot: ["Computed from two birth charts.", "No score, no prediction."],
    wordmark: "Stars Decoded",
  };
}

/** The dashboard's story for a pair from `GET /home` alone, no report fetched; null until chapter 01 is written. */
export function pairStoryText(pair: { lens: Lens; a: { name: string }; b: { name: string }; story: { headline: string; strengths: readonly string[] } | null }): ShareCardText | null {
  if (!pair.story) return null;
  return shareCardText({ names: { a: pair.a.name, b: pair.b.name }, lens: pair.lens, headline: pair.story.headline, strengths: pair.story.strengths });
}

export type ShareAction = "share" | "copy" | "save";

/** "Share story" gives the image and "Share with {name}" the report, so the two never read alike (ADR-181). */
export const SHARE_LABELS: Record<ShareAction, string> = { share: "Share story", copy: "Copy image", save: "Save" };

export const STORY_CAPTION = "Story · 9:16";

/** Web Share with the PNG where the browser can share files, else Copy image where ClipboardItem exists; Save always. */
export function shareActions({ canShareFiles, canCopyImage }: { canShareFiles: boolean; canCopyImage: boolean }): ShareAction[] {
  const actions: ShareAction[] = [];
  if (canShareFiles) actions.push("share");
  else if (canCopyImage) actions.push("copy");
  actions.push("save");
  return actions;
}

/** The other person, by first name: B, or A when B is the reader's own profile. */
export function recipientOf(a: { name: string; isSelf: boolean }, b: { name: string; isSelf: boolean }): string {
  return first(b.isSelf && !a.isSelf ? a.name : b.name);
}

export const shareLine = (recipient: string): string => `Share it with ${recipient}.`;

/** Giving the report says share, as the rows and the emails do (ADR-181). */
export const shareWith = (name: string): string => `Share with ${name}`;

/** Letters in any script stay, so a Zoë keeps her name; what a file system refuses goes. */
export const storyFilename = (text: ShareCardText): string =>
  `${text.title} - Stars Decoded.png`.replace(/[^\p{L}\p{M}\p{N} .-]+/gu, "");

/**
 * Lines no wider than `max`, at most `limit` of them. Report text is quoted, never
 * edited (ADR-18), so a line that would not fit is cut at a word and says so.
 */
export function wrapLines(text: string, max: number, limit: number, measure: (s: string) => number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word;
    if (line && measure(next) > max) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  if (lines.length <= limit) return lines;
  const kept = lines.slice(0, limit);
  let last = kept[limit - 1];
  while (last.includes(" ") && measure(`${last}…`) > max) last = last.slice(0, last.lastIndexOf(" "));
  kept[limit - 1] = `${last}…`;
  return kept;
}

/**
 * Instagram and WhatsApp lay their own bars over a story's top and bottom 250 px
 * (Meta's 14%), so no word sits there.
 */
export const STORY_SAFE = { top: 250, bottom: SHARE_CARD.height - 250 } as const;

/** The most lines each part may take; at these the longest story still fits the safe area. */
export const STORY_LINES = { title: 3, headline: 6, strength: 3 } as const;

// Baseline steps at the portrait card's type sizes (ADR-102), kept until the story's look has its session.
const EYEBROW_CAP = 16;
const TITLE = { cap: 55, step: 84, descent: 16 };
const HEADLINE = { after: 98, step: 58, descent: 11 };
const STRENGTHS = { label: 58, first: 56, step: 42, between: 62, descent: 8 };
const FOOT = { cap: 16, step: 32, descent: 5 };
const MIN_GAP = 56;

/** Baselines rather than tops, in canvas pixels, since a canvas sets text on its baseline. */
export interface StoryLayout {
  eyebrow: number;
  title: number[];
  headline: number[];
  /** The brass rule over the strengths; null with no strength to show, and the label with it. */
  rule: number | null;
  label: number | null;
  strengths: number[][];
  foot: [number, number];
}

/**
 * The eyebrow opens the safe area and the foot closes it; the names with the
 * verdict and the strengths sit between, every gap the same, so a short verdict
 * and a long one both fill the 9:16 frame the way the dashboard's mock does.
 */
export function storyLayout(lines: { title: number; headline: number; strengths: readonly number[] }): StoryLayout {
  const titleCount = Math.max(1, lines.title);
  const counts = lines.strengths.map((n) => Math.max(1, n));
  const titleSpan = TITLE.cap + (titleCount - 1) * TITLE.step;
  const verdict = lines.headline > 0
    ? titleSpan + HEADLINE.after + (lines.headline - 1) * HEADLINE.step + HEADLINE.descent
    : titleSpan + TITLE.descent;
  const strengths = counts.length === 0
    ? 0
    : STRENGTHS.label + STRENGTHS.first + counts.reduce((sum, n) => sum + (n - 1) * STRENGTHS.step, 0)
      + (counts.length - 1) * STRENGTHS.between + STRENGTHS.descent;
  const foot = FOOT.cap + FOOT.step + FOOT.descent;
  const groups = strengths ? [EYEBROW_CAP, verdict, strengths, foot] : [EYEBROW_CAP, verdict, foot];
  const free = STORY_SAFE.bottom - STORY_SAFE.top - groups.reduce((sum, h) => sum + h, 0);
  const gap = Math.max(MIN_GAP, Math.floor(free / (groups.length - 1)));

  let top = STORY_SAFE.top;
  const eyebrow = top + EYEBROW_CAP;
  top += EYEBROW_CAP + gap;
  const title = Array.from({ length: titleCount }, (_, i) => top + TITLE.cap + i * TITLE.step);
  const opening = top + titleSpan + HEADLINE.after;
  const headline = Array.from({ length: Math.max(0, lines.headline) }, (_, i) => opening + i * HEADLINE.step);
  top += verdict + gap;

  let rule: number | null = null;
  let label: number | null = null;
  const strengthLines: number[][] = [];
  if (strengths) {
    rule = top;
    label = top + STRENGTHS.label;
    let y = label + STRENGTHS.first;
    for (const n of counts) {
      strengthLines.push(Array.from({ length: n }, (_, i) => y + i * STRENGTHS.step));
      y += (n - 1) * STRENGTHS.step + STRENGTHS.between;
    }
    top += strengths + gap;
  }
  const footFirst = top + FOOT.cap;
  return { eyebrow, title, headline, rule, label, strengths: strengthLines, foot: [footFirst, footFirst + FOOT.step] };
}

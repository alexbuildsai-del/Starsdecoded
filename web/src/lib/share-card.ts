/**
 * The share card's words and its offer (ADR-102), pure: what the portrait
 * card says, which buttons this browser gets, and who it is sent to. Type
 * only: no wheel, no placement, no number. Nothing is stored or hosted.
 */
import { lensInfo } from "@/lib/lenses";
import type { Lens } from "@/types/chart";

export const SHARE_CARD = { width: 1080, height: 1350 } as const;

export const first = (name: string): string => name.trim().split(/\s+/)[0] ?? name;

export interface ShareCardText {
  eyebrow: string;
  title: string;
  headline: string;
  strengthsLabel: string;
  strengths: string[];
  foot: [string, string];
  wordmark: string;
}

export function shareCardText({ names, lens, headline, strengths }: { names: { a: string; b: string }; lens: Lens; headline: string; strengths: string[] }): ShareCardText {
  return {
    eyebrow: `Compatibility report · ${lensInfo(lens).title}`,
    title: `${first(names.a)} and ${first(names.b)}`,
    headline,
    strengthsLabel: "Your three strengths as a pair",
    strengths: strengths.slice(0, 3),
    foot: ["Computed from two birth charts.", "No score, no prediction."],
    wordmark: "Stars Decoded",
  };
}

export type ShareAction = "share" | "copy" | "save";

/** Web Share with the PNG where the browser can share files, else Copy image where ClipboardItem exists; Save image always. */
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

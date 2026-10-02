/**
 * The section after the home page's hero and again at the end of /sample (ADR-173, review-02-10 scope 1): one line of
 * the sample's stored run, its placement and one thing to try, read here and never typed, so the section can only say
 * what her report says (ADR-18).
 */
import type { ChecklistItem } from "@/components/report/Checklist";
import { itemKey } from "@/lib/workbook";
import { SAMPLE } from "./sample";

export interface Differences {
  /** The relationships chapter's first claim that carries a placement, as the report quotes it. */
  line: string;
  /** That claim's placement, kind and label as the report's evidence card prints them. */
  placement: { kind: string; label: string };
  /** The chapter's first action under the key the report ticks it by, with its why as the run stores it. */
  action: ChecklistItem;
}

const relationships = SAMPLE.run.relationships;

// Each throws at import, so a sample run without the line fails the prerender rather than the section quoting less.
function pick(): Pick<Differences, "line" | "placement"> {
  for (const claim of relationships?.claims ?? []) {
    const evidence = claim.evidence.find((e) => e.ref.kind === "placement");
    if (evidence) return { line: claim.quote, placement: { kind: evidence.ref.kind, label: evidence.label } };
  }
  throw new Error("The sample run's relationships chapter has no claim with a placement in its evidence.");
}

function firstAction(): ChecklistItem {
  const item = relationships?.actions[0];
  if (!item) throw new Error("The sample run's relationships chapter has no action.");
  return { key: itemKey("relationships", "actions", 0), action: item.action, why: item.why };
}

export const DIFFERENCES: Differences = { ...pick(), action: firstAction() };

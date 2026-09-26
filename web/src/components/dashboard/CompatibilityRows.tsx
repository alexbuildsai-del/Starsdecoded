/**
 * The Compatibility rows of a person's card and of the list below the orbit
 * (dashboard-sky, Compatibility): one row per pair and state, named by its two
 * people and never by its lens (ADR-93). A pair the reader can open is one
 * tappable row whose send and stop controls sit inside it, never a second
 * button (ADR-132); anything under way is a status with dots, never its idle
 * verb (ADR-130). The page owns every call; a row only draws and calls back.
 */
import { useId, type MouseEvent, type ReactNode } from "react";
import { Heart, Share } from "lucide-react";
import type { ReportSummary, ReportSummaryStatus } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { StatusDots } from "@/components/StatusDots";
import { pairTitle } from "@/lib/lenses";
import { PAIR_ROW_COPY, pairRowState, type PairReportStatus, type PairRowState } from "@/lib/pair-row";
import { preselectPair, type PairSelection } from "@/lib/pair-selection";
import { COMPATIBILITY_REPORT } from "@/lib/product";
import { first } from "@/lib/share-card";

/** A compatibility report as GET /reports lists it; only what a row reads. */
export type PairReport = Pick<
  ReportSummary,
  "id" | "name" | "status" | "participants" | "access" | "send" | "sharedBy" | "stoppedBy" | "failureReason"
>;

/** One of the two people on a card's own row. */
export interface PairPerson {
  /** Absent while the reader has no chart of their own. */
  profileId?: string;
  name: string;
  /** Their latest natal report that did not fail, as listed. Absent or still writing reads as not finished. */
  report?: Pick<ReportSummary, "id" | "status"> | null;
}

/** The row a person's card always has: the reader and that person, before and after a pair of the two exists. */
export interface PairProposal {
  self: PairPerson;
  other: PairPerson;
  /** The balance Generate spends from. */
  credits: number;
  /** `creditsEnforced()` (ADR-138); false keeps the soft pass, where zero never reads Get credits. */
  enforced: boolean;
  /** The picker is writing this pair and the list does not hold it yet (the picker's `onGenerating`). */
  generating?: boolean;
}

export interface CompatibilityRowsProps {
  /** The pairs to list, in the page's order: on a card, those with its person; below the orbit, all of them. */
  pairs: readonly PairReport[];
  /** Given on a person's card. A pair of the two listed in `pairs` takes this row's place. */
  propose?: PairProposal;
  /** The list below the orbit keeps a failed pair with its reason; a card leaves it out, since Generate runs again there. */
  showFailed?: boolean;
  onOpen: (reportId: string) => void;
  /** Hands over the picker's `preselect`, a new object per press. */
  onGenerate: (selection: Partial<PairSelection>) => void;
  onSend: (pair: PairReport) => void;
  onStopSharing: (pair: PairReport) => void;
  onGetCredits: () => void;
}

// A report under a revision pass keeps its text and reads as it stands (progress.ts), as the orbit reads it.
const ROW_STATUS: Record<ReportSummaryStatus, PairReportStatus> = {
  pending: "pending",
  computing: "computing",
  interpreting: "interpreting",
  revising: "complete",
  complete: "complete",
  failed: "failed",
};

// The design system's light indigo: the plain indigo is under AA for text this small on the dark ground.
const INDIGO_TEXT = "text-[#9FA8DA]";
const ROW = "rounded-xl border border-border/60 bg-card/60 px-3 py-2.5";

type Row =
  | { key: string; kind: "pair"; state: PairRowState; pair: PairReport }
  | { key: string; kind: "failed"; pair: PairReport }
  | { key: string; kind: "proposal"; state: PairRowState; proposal: PairProposal };

function finished(report: PairPerson["report"]): boolean {
  return !!report && ROW_STATUS[report.status] === "complete";
}

function ofTheTwo(pair: PairReport, a: string | undefined, b: string | undefined): boolean {
  if (!a || !b) return false;
  const ids = (pair.participants ?? []).map((p) => p.id);
  return ids.includes(a) && ids.includes(b);
}

function pairRow(pair: PairReport): Row {
  // With a pair present only the pair decides its row (pair-row.ts), so the proposal's inputs are moot here.
  // MB-103 provisional: a pair reads while no one it came from has stopped sharing, the orbit's rule for its violet ring.
  const state = pairRowState({
    ownReportReady: true,
    otherReportReady: true,
    credits: 0,
    pair: { status: ROW_STATUS[pair.status], readable: !pair.stoppedBy },
  });
  return { key: pair.id, kind: "pair", state, pair };
}

function rowsOf(pairs: readonly PairReport[], proposal: PairProposal | undefined, showFailed: boolean): Row[] {
  const rows: Row[] = [];
  const theTwo = proposal ? pairs.filter((p) => ofTheTwo(p, proposal.self.profileId, proposal.other.profileId)) : [];
  if (proposal) {
    // A failed pair clears like it never happened, so the two get Generate again (pair-row.ts).
    const live = theTwo.filter((p) => p.status !== "failed");
    if (live.length > 0) rows.push(...live.map(pairRow));
    else {
      const state = pairRowState({
        ownReportReady: finished(proposal.self.report),
        otherReportReady: finished(proposal.other.report),
        // MB-6 provisional: off the enforced hosts the soft pass writes at zero, so zero never reads Get credits there (ADR-138).
        credits: proposal.enforced ? proposal.credits : Math.max(proposal.credits, 1),
        generating: proposal.generating,
      });
      rows.push({ key: "proposal", kind: "proposal", state, proposal });
    }
  }
  for (const p of pairs) {
    if (theTwo.includes(p)) continue;
    if (p.status === "failed") {
      if (showFailed) rows.push({ key: p.id, kind: "failed", pair: p });
      continue;
    }
    rows.push(pairRow(p));
  }
  return rows;
}

function creditsLeft(n: number): string | null {
  if (n <= 0) return null;
  return `Uses 1 credit · ${n} ${n === 1 ? "credit" : "credits"} left`;
}

function Eyebrow() {
  return (
    <span className="mb-1 flex items-center gap-1.5 font-label text-[10px] font-medium uppercase tracking-[0.16em] text-secondary">
      <Heart aria-hidden="true" className="h-3 w-3 shrink-0" />
      {COMPATIBILITY_REPORT}
    </span>
  );
}

function Busy({ label }: { label: string }) {
  return (
    <span className={`inline-flex h-8 shrink-0 items-center rounded-md border border-primary/35 bg-primary/10 px-3 font-label text-xs font-medium ${INDIGO_TEXT}`}>
      <StatusDots label={label} />
    </span>
  );
}

/** A row that does not open: its copy on the left, its one control or status on the right. */
function StillRow({ title, titleId, why, cost, control, closed }: {
  title: string;
  titleId?: string;
  why?: string | null;
  cost?: string | null;
  control?: ReactNode;
  closed?: boolean;
}) {
  return (
    <li className={`flex items-center justify-between gap-3 ${ROW}`}>
      <div className="min-w-0">
        <Eyebrow />
        <p id={titleId} className={`font-display text-[15px] leading-snug ${closed ? "text-muted-foreground" : ""}`}>{title}</p>
        {why && <p className="mt-0.5 text-xs text-muted-foreground">{why}</p>}
        {cost && <p className="mt-0.5 font-mono text-[11.5px] text-muted-foreground">{cost}</p>}
      </div>
      {control}
    </li>
  );
}

function ProposalRow({ proposal, state, onGenerate, onGetCredits }: {
  proposal: PairProposal;
  state: PairRowState;
  onGenerate: CompatibilityRowsProps["onGenerate"];
  onGetCredits: CompatibilityRowsProps["onGetCredits"];
}) {
  const titleId = useId();
  const title = pairTitle(proposal.self.name, proposal.other.name);
  const cost = creditsLeft(proposal.credits);
  const generate = () => {
    const a = proposal.self.report?.id;
    const b = proposal.other.report?.id;
    if (a && b) onGenerate(preselectPair(a, b));
  };

  switch (state) {
    case "generate":
      return (
        <StillRow title={title} titleId={titleId} why={PAIR_ROW_COPY.generate} cost={cost} control={
          <Button size="sm" onClick={generate} aria-describedby={titleId} className="shrink-0 font-label">Generate</Button>
        } />
      );
    case "get_credits":
      return (
        <StillRow title={title} titleId={titleId} why={PAIR_ROW_COPY.get_credits} cost="No credits left" control={
          <Button size="sm" variant="outline" onClick={onGetCredits} className={`shrink-0 [border-color:hsl(var(--primary)/0.6)] font-label ${INDIGO_TEXT}`}>Get credits</Button>
        } />
      );
    case "generating":
      return <StillRow title={title} why={PAIR_ROW_COPY.generating} cost={cost} control={<Busy label="Generating" />} />;
    case "their_writing":
      // No control of its own: the card's primary carries the Writing status (dashboard-sky, the table).
      return <StillRow title={title} why={PAIR_ROW_COPY.their_writing.replace("{name}", first(proposal.other.name))} />;
    case "needs_yours":
      return (
        <StillRow title={title} why={PAIR_ROW_COPY.needs_yours} control={
          <Button size="sm" variant="outline" disabled className="shrink-0 font-label">Generate</Button>
        } />
      );
    default:
      return null;
  }
}

/** The first name a send names: the server's, else the pair's other person as the send points at them. */
function sendName(pair: PairReport): string {
  const send = pair.send;
  if (!send) return "";
  if (send.firstName) return send.firstName;
  const them = pair.participants?.find((p) => p.id === send.profileId);
  return them ? first(them.name) : "";
}

function OpenRow({ pair, onOpen, onSend, onStopSharing }: {
  pair: PairReport;
  onOpen: CompatibilityRowsProps["onOpen"];
  onSend: CompatibilityRowsProps["onSend"];
  onStopSharing: CompatibilityRowsProps["onStopSharing"];
}) {
  const send = pair.send ?? null;
  const them = sendName(pair);
  // An older server sends no access, and listed only what the viewer made.
  const sender = (pair.access ?? "owner") === "owner";
  const open = (e: MouseEvent<HTMLAnchorElement>) => {
    // A modified click keeps the browser's own new tab or window.
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    onOpen(pair.id);
  };
  const control = "relative z-10 inline-flex items-center gap-1.5 rounded-sm py-1 font-label text-xs font-medium outline-hidden transition-colors focus-visible:ring-1 focus-visible:ring-ring";

  // SendLine's words for each send state, so the row agrees with the report page; a sent pair offers no second Send.
  const meta: ReactNode[] = [];
  if (pair.sharedBy) meta.push(<span key="by">Shared by {pair.sharedBy}</span>);
  if (send && them && (send.state === "can_send" || send.state === "can_grant")) {
    meta.push(
      <button key="send" type="button" onClick={() => onSend(pair)} className={`${control} ${INDIGO_TEXT} hover:text-foreground`}>
        <Share aria-hidden="true" className="h-3 w-3 shrink-0" />
        Send to {them}
      </button>,
    );
  }
  if (send && them && send.state === "sent") meta.push(<span key="sent">Sent · waiting for {them}</span>);
  if (send && them && send.state === "joined") {
    meta.push(<span key="joined">{them} can read it too</span>);
    if (sender) {
      // MB-103 provisional: the sender ends the other person's reading at once; nothing is deleted.
      meta.push(
        <button key="stop" type="button" onClick={() => onStopSharing(pair)} aria-label={`Stop sharing with ${them}`}
          className={`${control} text-muted-foreground underline-offset-4 hover:text-foreground hover:underline`}>
          Stop sharing
        </button>,
      );
    }
  }

  return (
    <li className={`group relative flex items-center justify-between gap-3 ${ROW} transition-colors duration-200 hover:border-[#9FA8DA]/45 hover:bg-primary/[0.07] has-[a:focus-visible]:ring-1 has-[a:focus-visible]:ring-ring`}>
      <div className="min-w-0">
        {/* The link's box stretches over the whole row, so any tap on it opens; the controls sit above it. */}
        <a href={`/compatibility/${pair.id}`} onClick={open} className="block outline-hidden after:absolute after:inset-0 after:rounded-xl">
          <Eyebrow />
          <span className="block font-display text-[15px] leading-snug">{pair.name}</span>
        </a>
        {meta.length > 0 && (
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3.5 gap-y-0.5 text-xs text-muted-foreground">{meta}</div>
        )}
      </div>
      <span aria-hidden="true" className="shrink-0 font-display text-[22px] leading-none text-muted-foreground transition-[transform,color] duration-200 ease-[cubic-bezier(.16,1,.3,1)] group-hover:translate-x-[3px] group-hover:text-[#9FA8DA] motion-reduce:transition-none motion-reduce:group-hover:translate-x-0">
        ›
      </span>
    </li>
  );
}

export function CompatibilityRows({ pairs, propose, showFailed = false, onOpen, onGenerate, onSend, onStopSharing, onGetCredits }: CompatibilityRowsProps) {
  const rows = rowsOf(pairs, propose, showFailed);
  if (rows.length === 0) return null;
  return (
    <ul className="grid gap-2">
      {rows.map((row) => {
        if (row.kind === "proposal") {
          return <ProposalRow key={row.key} proposal={row.proposal} state={row.state} onGenerate={onGenerate} onGetCredits={onGetCredits} />;
        }
        if (row.kind === "failed") {
          return <StillRow key={row.key} title={row.pair.name} why={row.pair.failureReason?.line ?? "Could not be written."} />;
        }
        if (row.state === "open") {
          return <OpenRow key={row.key} pair={row.pair} onOpen={onOpen} onSend={onSend} onStopSharing={onStopSharing} />;
        }
        if (row.state === "pair_writing") {
          return <StillRow key={row.key} title={row.pair.name} why={PAIR_ROW_COPY.pair_writing} control={<Busy label="Writing" />} />;
        }
        if (row.state === "closed") {
          // MB-103 provisional: a closed pair keeps its row and its name but no longer opens.
          return <StillRow key={row.key} title={row.pair.name} why={PAIR_ROW_COPY.closed} closed />;
        }
        return null;
      })}
    </ul>
  );
}

export default CompatibilityRows;

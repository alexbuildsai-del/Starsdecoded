/**
 * Compatibility (ADR-174): every pair the reader can see, newest first, one
 * row each named by its two people, "You & Mamca", with who the two are under
 * it (review-01-10, scope 3). A pair that opens is one tap to its report and
 * keeps its actions: Share story and Share with {name} in view, Stop sharing
 * and Delete report behind "⋯", no hearts. One still being written, closed by
 * a stop (MB-103 provisional) or failed keeps its row and says so. Drawn from
 * GET /home, with each pair's share state from GET /reports (reading 4); the
 * page mounts it bare, so it holds its own dialogs.
 */
import { useState, type ReactNode } from "react";
import {
  getGetHomeQueryKey,
  getListReportsQueryKey,
  useGetHome,
  useListReports,
  type HomePair,
  type ReportSummary,
} from "@workspace/api-client-react";
import { DeleteReportDialog } from "@/components/DeleteReportDialog";
import { SendDialog, type SendTarget } from "@/components/SendDialog";
import { StatusDots } from "@/components/StatusDots";
import { ListRow, MENU_DANGER, MenuItem, ROW_ACTION, ROW_STATUS, useOpenerFocus } from "@/components/dashboard/RowMenu";
import { StopSharingDialog, type StopTarget } from "@/components/dashboard/StopSharingDialog";
import { StoryPreview } from "@/components/report/ShareCard";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { lensWords, ownIds } from "@/lib/home-view";
import { initials } from "@/lib/orbit";
import { PAIR_ROW_COPY, pairRowState, pairRowTitle, sharedWaiting, storyTitle } from "@/lib/pair-row";
import { COMPATIBILITY_REPORT } from "@/lib/product";
import { SHARE_LABELS, first, pairStoryText, shareWith, type ShareCardText } from "@/lib/share-card";

type Story = { title: string; text: ShareCardText };

/**
 * A pair the list holds before GET /home is read again, so the picker's
 * Writing hands straight to the pair's own row (ADR-130, ADR-131).
 */
function fromList(report: ReportSummary): HomePair | null {
  const [a, b] = report.participants ?? [];
  if (!a || !b || !report.lens) return null;
  return {
    reportId: report.id,
    lens: report.lens,
    label: null,
    a: { profileId: a.id, name: a.name },
    b: { profileId: b.id, name: b.name },
    status: report.status,
    stoppedBy: report.stoppedBy ?? null,
    strong: [],
    challenge: null,
    story: null,
  };
}

interface PairRowProps {
  pair: HomePair;
  report: ReportSummary | undefined;
  own: ReadonlySet<string>;
  onShare: (target: SendTarget) => void;
  onStop: (target: StopTarget) => void;
  onStory: (story: Story) => void;
}

function PairRow({ pair, report, own, onShare, onStop, onStory }: PairRowProps) {
  const { title, other } = pairRowTitle(pair.a, pair.b, own);
  // The page polls the list while a report is under way; GET /home keeps the status it was read with.
  const status = report?.status ?? pair.status;
  const state = status === "failed" ? null : pairRowState({ status, readable: !pair.stoppedBy });
  const send = report?.send ?? null;
  const them = send ? send.firstName || first([pair.a, pair.b].find((p) => p.profileId === send.profileId)?.name ?? "") : "";
  // Only its maker can stop or delete a pair; the other of its two only reads it (MB-103 provisional).
  const maker = !!report && (report.access ?? "owner") === "owner";
  const text = state === "open" ? pairStoryText(pair) : null;

  const actions: ReactNode[] = [];
  if (state === "open") {
    if (text) {
      actions.push(
        <button key="story" type="button" onClick={() => onStory({ title: storyTitle(pair.a, pair.b, other), text })} className={ROW_ACTION}>
          {SHARE_LABELS.share}
        </button>,
      );
    }
    if (send && them && (send.state === "can_send" || send.state === "can_grant")) {
      actions.push(
        <button key="share" type="button" onClick={() => onShare({ kind: "pair", send, reportId: pair.reportId })} className={ROW_ACTION}>
          {shareWith(them)}
        </button>,
      );
    }
    if (send && them && send.state === "sent") actions.push(<span key="sent" className={ROW_STATUS}>{sharedWaiting(them)}</span>);
    if (send && them && send.state === "joined") actions.push(<span key="joined" className={ROW_STATUS}>{them} can read it too</span>);
    if (report?.sharedBy) actions.push(<span key="by" className={ROW_STATUS}>Shared by {report.sharedBy}</span>);
  } else if (state === "pair_writing") {
    actions.push(
      <span key="writing" className="font-label text-xs text-[#9FA8DA]">
        <StatusDots label="Writing" />
      </span>,
      <span key="why" className={ROW_STATUS}>{PAIR_ROW_COPY.pair_writing}</span>,
    );
  } else if (state === "closed") {
    actions.push(<span key="closed" className={ROW_STATUS}>{PAIR_ROW_COPY.closed}</span>);
  } else {
    actions.push(<span key="failed" className={ROW_STATUS}>{report?.failureReason?.line ?? "Could not be written."}</span>);
  }

  const stopping = maker && state === "open" && send?.state === "joined" && !!them;
  return (
    <ListRow
      initials={other ? initials(other.name) : initials(`${first(pair.a.name)} ${first(pair.b.name)}`)}
      violet={state === "open" || state === "pair_writing"}
      title={title}
      href={state === "open" ? `/compatibility/${pair.reportId}` : undefined}
      sub={lensWords(pair)}
      moreLabel={`More for ${title}`}
      actions={actions.length > 0 ? actions : null}
      muted={state === "closed"}
      menu={
        maker ? (
          <>
            {stopping && (
              <MenuItem onSelect={() => onStop({ kind: "pair", id: pair.reportId, name: them })}>Stop sharing with {them}</MenuItem>
            )}
            <DeleteReportDialog reportId={pair.reportId} personName={`${first(pair.a.name)} and ${first(pair.b.name)}`} className={MENU_DANGER} />
          </>
        ) : null
      }
    />
  );
}

/** "Share story" shows the story first and shares it from there, drawn ahead, so the share sheet opens on the tap itself. */
function StoryDialog({ story, onClose }: { story: Story | null; onClose: () => void }) {
  const focus = useOpenerFocus();
  return (
    <Dialog open={!!story} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="gap-4 border-[#3A4560] bg-[#171D29] sm:max-w-sm sm:rounded-[20px]" {...focus}>
        {story && (
          <>
            <DialogHeader className="text-left">
              <DialogTitle className="font-display text-[22px] font-normal leading-[1.2]">{story.title}</DialogTitle>
              <DialogDescription>Nothing from either birth chart is on it, and nothing is uploaded.</DialogDescription>
            </DialogHeader>
            <StoryPreview text={story.text} />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function CompatibilityRows() {
  const home = useGetHome({ query: { queryKey: getGetHomeQueryKey() } }).data;
  const reports = useListReports({ query: { queryKey: getListReportsQueryKey() } }).data;
  const [sendTarget, setSendTarget] = useState<SendTarget | null>(null);
  const [stopTarget, setStopTarget] = useState<StopTarget | null>(null);
  const [story, setStory] = useState<Story | null>(null);

  if (!home) return null;
  const listed = Array.isArray(reports) ? new Map(reports.map((r) => [r.id, r])) : null;
  const held = new Set(home.pairs.map((p) => p.reportId));
  const fresh = (Array.isArray(reports) ? reports : [])
    .filter((r) => r.kind === "compatibility" && !held.has(r.id))
    .sort((x, y) => y.createdAt.localeCompare(x.createdAt))
    .flatMap((r) => fromList(r) ?? []);
  // A delete refreshes the list, not GET /home, so a pair gone from it leaves the rows before home catches up.
  const pairs = [...fresh, ...home.pairs.filter((p) => !listed || listed.has(p.reportId))];
  const own = ownIds(home);

  return (
    <>
      {pairs.length === 0 ? (
        <p className="text-[13px] leading-snug text-[#9AA3B5]">No {COMPATIBILITY_REPORT}s yet.</p>
      ) : (
        <div className="@container">
          <ul className="grid gap-2 @min-[620px]:grid-cols-2">
            {pairs.map((pair) => (
              <PairRow
                key={pair.reportId}
                pair={pair}
                report={listed?.get(pair.reportId)}
                own={own}
                onShare={setSendTarget}
                onStop={setStopTarget}
                onStory={setStory}
              />
            ))}
          </ul>
        </div>
      )}
      <SendDialog open={!!sendTarget} onClose={() => setSendTarget(null)} target={sendTarget} />
      <StopSharingDialog target={stopTarget} onClose={() => setStopTarget(null)} />
      <StoryDialog story={story} onClose={() => setStory(null)} />
    </>
  );
}

export default CompatibilityRows;

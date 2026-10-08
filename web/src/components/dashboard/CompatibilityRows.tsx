/**
 * Compatibility (ADR-174): every pair the reader can see, newest first, one
 * row each named by its two people, "You & Mamca", with who the two are under
 * it (review-01-10, scope 3). A pair that opens is one tap to its report and
 * wears one chip for who can read it, from GET /home's `share` alone (ADR-337,
 * 341); Share and Delete report sit behind "⋯", no buttons on the row, no
 * story (ADR-338). One still being written, closed by a stop (MB-103
 * provisional) or failed keeps its row and says so. The page mounts it bare,
 * so it holds its own dialogs.
 */
import { useState, type ReactNode } from "react";
import {
  getListReportsQueryKey,
  useListReports,
  type HomePair,
  type ReportSummary,
} from "@workspace/api-client-react";
import { DeleteReportDialog } from "@/components/DeleteReportDialog";
import { StatusDots } from "@/components/StatusDots";
import { ListRow, MENU_DANGER, MenuItem, ROW_STATUS, RowChip } from "@/components/dashboard/RowMenu";
import { ShareWindow, type ShareTarget } from "@/components/share/ShareWindow";
import { useHome } from "@/hooks/useHome";
import { lensWords, ownIds } from "@/lib/home-view";
import { initials } from "@/lib/orbit";
import { PAIR_ROW_COPY, pairChipText, pairRowState, pairRowTitle } from "@/lib/pair-row";
import { COMPATIBILITY_REPORT } from "@/lib/product";
import { first } from "@/lib/share-card";

/**
 * A pair the list holds before GET /home is read again, so a pair being
 * written shows as its own row on the way back from its page (ADR-130, ADR-131).
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
    share: report.sharedBy ? { state: "shared-by", name: report.sharedBy } : { state: "only-you", name: "" },
    readers: [],
  };
}

interface PairRowProps {
  pair: HomePair;
  report: ReportSummary | undefined;
  own: ReadonlySet<string>;
  onShare: (target: ShareTarget) => void;
}

function PairRow({ pair, report, own, onShare }: PairRowProps) {
  const { title, other } = pairRowTitle(pair.a, pair.b, own);
  // The page polls the list while a report is under way; GET /home keeps the status it was read with.
  const status = report?.status ?? pair.status;
  const state = status === "failed" ? null : pairRowState({ status, readable: !pair.stoppedBy });
  // Only its maker can share or delete a pair; the other of its two only reads it (MB-103 provisional).
  const maker = !!report && (report.access ?? "owner") === "owner";
  // The list names the pair's other person when the reader is neither of the two; no send there means none is offered.
  const them = report?.send?.firstName || (other ? first(other.name) : "");
  const sharable = maker && state === "open" && !!them && (!report || report.send != null);

  const actions: ReactNode[] = [];
  if (state === "open") {
    actions.push(
      <RowChip key="chip" tone={pair.share.state === "can-read" || pair.share.state === "shared-by" ? "reading" : pair.share.state === "waiting" ? "waiting" : "quiet"}>
        {pairChipText(pair.share)}
      </RowChip>,
    );
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
            {sharable && <MenuItem onSelect={() => onShare({ kind: "pair", reportId: pair.reportId, name: them })}>Share</MenuItem>}
            <DeleteReportDialog reportId={pair.reportId} personName={`${first(pair.a.name)} and ${first(pair.b.name)}`} className={MENU_DANGER} />
          </>
        ) : null
      }
    />
  );
}

export function CompatibilityRows() {
  const home = useHome().data;
  const reports = useListReports({ query: { queryKey: getListReportsQueryKey() } }).data;
  // The target stays after a close so the window can finish leaving with its own words.
  const [sharing, setSharing] = useState<{ target: ShareTarget; open: boolean } | null>(null);

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
                onShare={(target) => setSharing({ target, open: true })}
              />
            ))}
          </ul>
        </div>
      )}
      {sharing && <ShareWindow open={sharing.open} onClose={() => setSharing({ ...sharing, open: false })} target={sharing.target} />}
    </>
  );
}

export default CompatibilityRows;

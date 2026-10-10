/**
 * Stop sharing ends the other person's reading at once (ADR-139), so it asks
 * first and names everything it does before it does it (review-01-10, scope
 * 3), naming the chart's person when it isn't the reader's own (ADR-238). The
 * subject's stop moves the report to them and cannot be taken back; a pair's
 * sender, and a reader who shared their own report (ADR-235), can share again.
 * GET /home is read again afterwards, so the circle, People and the quick look
 * follow at once (ADR-182).
 */
import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetHomeQueryKey,
  getListProfilesQueryKey,
  getListReportsQueryKey,
  getListSharesQueryKey,
  useListShares,
  useStopShare,
  useStopSharingCompatibility,
  useStopSharingProfile,
} from "@workspace/api-client-react";
import { StatusDots } from "@/ds/atoms/StatusDots";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/ds/organisms/Confirm";
import { InlineError } from "@/ds/molecules/Alert";
import { useToast } from "@/hooks/use-toast";
import { stopPairLine, stopShareLines, stopSharingLines, stopSharingTitle } from "@/lib/pair-row";

/**
 * What stops; `name` is whoever loses it. A profile: the reader stops the
 * giver of a chart sent to them, and `subject`, the chart's first name, is set
 * when it isn't the reader's own (ADR-238). A pair: its sender stops its other
 * person. A share: the reader stops a share of their own Personal report, by
 * the share's id (ADR-235).
 */
export type StopTarget = { kind: "profile" | "pair" | "share"; id: string; name: string; subject?: string | null };

// ShareWindow draws its own Stop sharing title in the same type.
export const CONSENT_TITLE = "font-display text-card-title font-normal text-paper";

/**
 * Ask answers written from a report are hidden for whoever can no longer read it (ADR-182, B-32), and a stop
 * takes the report from `name`. A link still waiting was never read, so it hides nothing.
 */
function withAskLine(lines: string[], name: string): string[] {
  const ask = `Ask answers that used this report are hidden for ${name}.`;
  return lines.length > 1 ? [...lines.slice(0, -1), ask, lines[lines.length - 1]] : [...lines, ask];
}

/**
 * `onStopped` takes the "can no longer read it" line in place of a toast. The Share window opens this dialog over
 * itself, and a toast stays a layer for a while, so its Escape would close it before the window.
 */
export function StopSharingDialog({
  target,
  onClose,
  onStopped,
}: {
  target: StopTarget | null;
  onClose: () => void;
  onStopped?: (line: string) => void;
}) {
  const client = useQueryClient();
  const { toast } = useToast();
  // The last target stays drawn while the dialog closes, so its words do not vanish mid-fade.
  const kept = useRef<StopTarget | null>(target);
  if (target) kept.current = target;
  const shown = target ?? kept.current;

  // A share's own list says whether its link still waits, which changes what stopping it does; the sheet that
  // opened it has already read the list, so this is that copy.
  const shares = useListShares({ query: { queryKey: getListSharesQueryKey(), enabled: shown?.kind === "share" } }).data;
  const share = shown?.kind === "share" && Array.isArray(shares) ? shares.find((s) => s.id === shown.id) : undefined;
  const waitingAt = share?.state === "waiting" ? share.email : null;

  const done = () => {
    void client.invalidateQueries({ queryKey: getListReportsQueryKey() });
    void client.invalidateQueries({ queryKey: getListProfilesQueryKey() });
    void client.invalidateQueries({ queryKey: getGetHomeQueryKey() });
    if (shown?.kind === "share") void client.invalidateQueries({ queryKey: getListSharesQueryKey() });
    const line = waitingAt ? "The link no longer works" : `${shown?.name} can no longer read it`;
    if (shown) (onStopped ?? ((title: string) => toast({ title })))(line);
    onClose();
  };
  const profile = useStopSharingProfile({ mutation: { onSuccess: done } });
  const pair = useStopSharingCompatibility({ mutation: { onSuccess: done } });
  // A share already gone (404) has stopped all the same, so it closes as stopped and the list drops it.
  const stopShare = useStopShare({ mutation: { onSuccess: done, onError: (err) => err.status === 404 && done() } });
  const { reset: resetProfile } = profile;
  const { reset: resetPair } = pair;
  const { reset: resetShare } = stopShare;
  const pending = profile.isPending || pair.isPending || stopShare.isPending;
  const failed = profile.isError || pair.isError || (stopShare.isError && stopShare.error?.status !== 404);

  useEffect(() => {
    if (!target) return;
    resetProfile();
    resetPair();
    resetShare();
  }, [target, resetProfile, resetPair, resetShare]);

  if (!shown) return null;
  const stopped =
    shown.kind === "profile" ? stopSharingLines(shown.name, shown.subject)
    : shown.kind === "share" ? stopShareLines(shown.name, waitingAt)
    : [stopPairLine(shown.name)];
  const lines = waitingAt ? stopped : withAskLine(stopped, shown.name);
  return (
    <AlertDialog open={!!target} onOpenChange={(next) => !next && !pending && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {stopSharingTitle(shown.name, shown.kind === "profile" ? shown.subject : null)}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            {lines.length > 1 ? (
              <ul className="grid list-disc gap-2 pl-[18px] text-ui text-paper-dim">
                {lines.map((line) => <li key={line}>{line}</li>)}
              </ul>
            ) : (
              <p className="text-ui text-paper-dim">{lines[0]}</p>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {failed && (
          <InlineError>
            We couldn't stop sharing. Try again in a minute.
          </InlineError>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>
            Keep sharing
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            onClick={(e) => {
              e.preventDefault();
              if (shown.kind === "profile") profile.mutate({ id: shown.id });
              else if (shown.kind === "share") stopShare.mutate({ id: shown.id });
              // MB-103 provisional: its sender ends the other person's reading of a pair; nothing is deleted.
              else pair.mutate({ id: shown.id });
            }}
          >
            {pending ? <StatusDots label="Stopping" /> : "Stop sharing"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default StopSharingDialog;

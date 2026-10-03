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
import { StatusDots } from "@/components/StatusDots";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useOpenerFocus } from "@/components/dashboard/RowMenu";
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

// The approved mock's dialog: a sheet from the bottom on a phone, where the thumb is; centred from 640 px.
export const CONSENT_SHEET = [
  "gap-3.5 border-[#3A4560] bg-[#171D29] px-[18px] pb-[max(22px,env(safe-area-inset-bottom))] pt-5 shadow-[0_-18px_44px_rgba(0,0,0,.65)]",
  "max-sm:top-auto max-sm:bottom-0 max-sm:translate-y-0 max-sm:rounded-t-[20px]",
  "max-sm:data-[state=open]:slide-in-from-left-0 max-sm:data-[state=open]:slide-in-from-bottom-8",
  "max-sm:data-[state=closed]:slide-out-to-left-0 max-sm:data-[state=closed]:slide-out-to-bottom-8",
  "motion-reduce:data-[state=open]:animate-none motion-reduce:data-[state=closed]:animate-none",
  "sm:max-w-md sm:rounded-[20px] sm:p-6 sm:shadow-lg",
].join(" ");
export const CONSENT_BUTTON = "mt-0 min-h-9 rounded-[10px] px-3 font-label text-[13px] font-medium";
export const CONSENT_TITLE = "font-display text-[22px] font-normal leading-[1.2] text-[#E8EBF2]";
export const CONSENT_BODY = "text-[14px] leading-[1.5] text-[#C9CEDA]";
export const CONSENT_CANCEL = `${CONSENT_BUTTON} bg-transparent text-[#E8EBF2] [border-color:#242C3B]`;

export function StopSharingDialog({ target, onClose }: { target: StopTarget | null; onClose: () => void }) {
  const client = useQueryClient();
  const { toast } = useToast();
  const focus = useOpenerFocus();
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
    if (shown) toast({ title: waitingAt ? "The link no longer works" : `${shown.name} can no longer read it` });
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
  const lines =
    shown.kind === "profile" ? stopSharingLines(shown.name, shown.subject)
    : shown.kind === "share" ? stopShareLines(shown.name, waitingAt)
    : [stopPairLine(shown.name)];
  return (
    <AlertDialog open={!!target} onOpenChange={(next) => !next && !pending && onClose()}>
      <AlertDialogContent className={CONSENT_SHEET} {...focus}>
        <AlertDialogHeader className="text-left">
          <AlertDialogTitle className={CONSENT_TITLE}>
            {stopSharingTitle(shown.name, shown.kind === "profile" ? shown.subject : null)}
          </AlertDialogTitle>
          <AlertDialogDescription asChild className={CONSENT_BODY}>
            {lines.length > 1 ? (
              <ul className="grid list-disc gap-2 pl-[18px]">
                {lines.map((line) => <li key={line}>{line}</li>)}
              </ul>
            ) : (
              <p>{lines[0]}</p>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {failed && (
          <p role="alert" className="text-sm text-[#E79AB2]">
            We couldn't stop sharing. Try again in a minute.
          </p>
        )}
        <AlertDialogFooter className="flex-row flex-wrap justify-end gap-2 sm:space-x-0">
          <AlertDialogCancel disabled={pending} className={CONSENT_CANCEL}>
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
            className={`${CONSENT_BUTTON} border-[#9A3D52] bg-[#7A2E3F] text-[#F2F4F9] hover:bg-[#8A3448]`}
          >
            {pending ? <StatusDots label="Stopping" /> : "Stop sharing"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default StopSharingDialog;

/**
 * Stop sharing ends the other person's reading at once (ADR-139), so it asks
 * first and names everything it does before it does it (review-01-10, scope
 * 3). The subject's stop moves the report to them and cannot be taken back; a
 * pair's sender can share it again. GET /home is read again afterwards, so the
 * circle, People and the quick look follow at once (ADR-182).
 */
import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetHomeQueryKey,
  getListProfilesQueryKey,
  getListReportsQueryKey,
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
import { stopPairLine, stopSharingLines, stopSharingTitle } from "@/lib/pair-row";

/** A profile's subject stopping its giver, or a pair's sender stopping its other person; `name` is whoever loses it. */
export type StopTarget = { kind: "profile" | "pair"; id: string; name: string };

// The approved mock's dialog: a sheet from the bottom on a phone, where the thumb is; centred from 640 px.
const SHEET = [
  "gap-3.5 border-[#3A4560] bg-[#171D29] px-[18px] pb-[max(22px,env(safe-area-inset-bottom))] pt-5 shadow-[0_-18px_44px_rgba(0,0,0,.65)]",
  "max-sm:top-auto max-sm:bottom-0 max-sm:translate-y-0 max-sm:rounded-t-[20px]",
  "max-sm:data-[state=open]:slide-in-from-left-0 max-sm:data-[state=open]:slide-in-from-bottom-8",
  "max-sm:data-[state=closed]:slide-out-to-left-0 max-sm:data-[state=closed]:slide-out-to-bottom-8",
  "motion-reduce:data-[state=open]:animate-none motion-reduce:data-[state=closed]:animate-none",
  "sm:max-w-md sm:rounded-[20px] sm:p-6 sm:shadow-lg",
].join(" ");
const BUTTON = "mt-0 min-h-9 rounded-[10px] px-3 font-label text-[13px] font-medium";

export function StopSharingDialog({ target, onClose }: { target: StopTarget | null; onClose: () => void }) {
  const client = useQueryClient();
  const { toast } = useToast();
  const focus = useOpenerFocus();
  // The last target stays drawn while the dialog closes, so its words do not vanish mid-fade.
  const kept = useRef<StopTarget | null>(target);
  if (target) kept.current = target;
  const shown = target ?? kept.current;

  const done = () => {
    void client.invalidateQueries({ queryKey: getListReportsQueryKey() });
    void client.invalidateQueries({ queryKey: getListProfilesQueryKey() });
    void client.invalidateQueries({ queryKey: getGetHomeQueryKey() });
    if (shown) toast({ title: `${shown.name} can no longer read it` });
    onClose();
  };
  const profile = useStopSharingProfile({ mutation: { onSuccess: done } });
  const pair = useStopSharingCompatibility({ mutation: { onSuccess: done } });
  const { reset: resetProfile } = profile;
  const { reset: resetPair } = pair;
  const pending = profile.isPending || pair.isPending;
  const failed = profile.isError || pair.isError;

  useEffect(() => {
    if (!target) return;
    resetProfile();
    resetPair();
  }, [target, resetProfile, resetPair]);

  if (!shown) return null;
  const lines = shown.kind === "profile" ? stopSharingLines(shown.name) : [stopPairLine(shown.name)];
  return (
    <AlertDialog open={!!target} onOpenChange={(next) => !next && !pending && onClose()}>
      <AlertDialogContent className={SHEET} {...focus}>
        <AlertDialogHeader className="text-left">
          <AlertDialogTitle className="font-display text-[22px] font-normal leading-[1.2] text-[#E8EBF2]">{stopSharingTitle(shown.name)}</AlertDialogTitle>
          <AlertDialogDescription asChild className="text-[14px] leading-[1.5] text-[#C9CEDA]">
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
          <AlertDialogCancel disabled={pending} className={`${BUTTON} bg-transparent text-[#E8EBF2] [border-color:#242C3B]`}>
            Keep sharing
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            onClick={(e) => {
              e.preventDefault();
              if (shown.kind === "profile") profile.mutate({ id: shown.id });
              // MB-103 provisional: its sender ends the other person's reading of a pair; nothing is deleted.
              else pair.mutate({ id: shown.id });
            }}
            className={`${BUTTON} border-[#9A3D52] bg-[#7A2E3F] text-[#F2F4F9] hover:bg-[#8A3448]`}
          >
            {pending ? <StatusDots label="Stopping" /> : "Stop sharing"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default StopSharingDialog;

/**
 * Not me on a report sent to the reader (ADR-236): it isn't about them, so
 * they hand it back to whoever sent it, or cancel, and nothing else. Handing
 * back ends the claim and gives the report and its pairs back to its writer,
 * who can send it to the right person; the lists and GET /home are read again,
 * so it leaves People and the circle at once. The People row and the claim
 * page both open it, so it holds its own call.
 */
import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetHomeQueryKey,
  getListProfilesQueryKey,
  getListRelationshipsQueryKey,
  getListReportsQueryKey,
  useHandBackProfile,
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
import { HAND_BACK_TITLE, handBackLine } from "@/lib/pair-row";

/** The chart sent to the reader, and the first name of whoever sent it; empty when the reader no longer learns it. */
export interface HandBackTarget {
  profileId: string;
  giverFirstName: string;
}

export interface HandBackDialogProps {
  target: HandBackTarget | null;
  onClose: () => void;
}

export function HandBackDialog({ target, onClose }: HandBackDialogProps) {
  const client = useQueryClient();
  const { toast } = useToast();
  // The last target stays drawn while the dialog closes, so its words do not vanish mid-fade.
  const kept = useRef<HandBackTarget | null>(target);
  if (target) kept.current = target;
  const shown = target ?? kept.current;

  // Its pairs go back to the writer too, so the pair lists move with the people.
  const refresh = () => {
    void client.invalidateQueries({ queryKey: getListProfilesQueryKey() });
    void client.invalidateQueries({ queryKey: getListReportsQueryKey() });
    void client.invalidateQueries({ queryKey: getListRelationshipsQueryKey() });
    void client.invalidateQueries({ queryKey: getGetHomeQueryKey() });
  };
  const handBack = useHandBackProfile({
    mutation: {
      onSuccess: () => {
        refresh();
        toast({ title: shown?.giverFirstName ? `Handed back to ${shown.giverFirstName}` : "Handed back" });
        onClose();
      },
      onError: (err) => {
        // 404 or 409: no longer a claim of the reader's, as when another tab handed it back first, so the lists say where it is.
        if (err.status !== 404 && err.status !== 409) return;
        refresh();
        onClose();
      },
    },
  });
  const { reset } = handBack;
  const failed = handBack.isError && handBack.error?.status !== 404 && handBack.error?.status !== 409;

  useEffect(() => {
    if (target) reset();
  }, [target, reset]);

  if (!shown) return null;
  return (
    <AlertDialog open={!!target} onOpenChange={(next) => !next && !handBack.isPending && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{HAND_BACK_TITLE}</AlertDialogTitle>
          <AlertDialogDescription>{handBackLine(shown.giverFirstName)}</AlertDialogDescription>
        </AlertDialogHeader>
        {failed && (
          <InlineError>
            We couldn't hand it back. Try again in a minute.
          </InlineError>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={handBack.isPending}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={handBack.isPending}
            onClick={(e) => {
              e.preventDefault();
              handBack.mutate({ id: shown.profileId });
            }}
            data-testid="button-hand-back"
          >
            {handBack.isPending ? <StatusDots label="Handing it back" /> : "Hand it back"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default HandBackDialog;

import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useDeleteReport,
  useListShares,
  getGetHomeQueryKey,
  getListReportsQueryKey,
  getListProfilesQueryKey,
  getListSharesQueryKey,
  type Home,
  type Share,
} from "@workspace/api-client-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useHome } from "@/hooks/useHome";
import { ownIds } from "@/lib/home-view";

export const ENDS_SHARING_LINE = "Anyone you shared it with can no longer read it.";

/**
 * Deleting the reader's own Personal report ends their sharing of it in the
 * same transaction (ADR-235), and the dialog names every consequence
 * (ADR-182). Their shares are read only where their quick look has listed
 * them already, so on their own report the line is said unless that list is
 * known to be empty.
 */
export function endsSharing(home: Pick<Home, "you" | "people"> | null | undefined, shares: Share[] | null | undefined, reportId: string): boolean {
  if (!home) return false;
  const person = [...(home.you ? [home.you] : []), ...home.people].find((p) => p.reportId === reportId);
  if (!person || !ownIds(home).has(person.profileId)) return false;
  return !Array.isArray(shares) || shares.length > 0;
}

export function deleteLine(sharing: boolean): string {
  return [
    "This deletes the report and its birth data if nothing else uses it.",
    sharing ? ENDS_SHARING_LINE : null,
    "Any purchase record is kept. This cannot be undone.",
  ].filter(Boolean).join(" ");
}

// MB-32 provisional: the copy promises what the server decides today, the
// report plus its birth data when nothing else uses it. A report its subject
// has claimed is theirs, so the writer's delete hands it over instead of
// deleting it (ADR-139), and `handsOver` says so.
export function DeleteReportDialog({
  reportId,
  personName,
  handsOver = false,
  className,
}: {
  reportId: string;
  personName: string;
  handsOver?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const { toast } = useToast();
  // The copies the page and the quick look hold: a delete's dialog asks the server for neither.
  const home = useHome({ enabled: false }).data;
  const shares = useListShares({ query: { queryKey: getListSharesQueryKey(), enabled: false } }).data;

  const deleteReport = useDeleteReport({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListReportsQueryKey() });
        qc.invalidateQueries({ queryKey: getListProfilesQueryKey() });
        // GET /home seats each person at one of their reports and lists the pairs, so a delete can move a seat, empty it or take a pair away.
        qc.invalidateQueries({ queryKey: getGetHomeQueryKey() });
        setOpen(false);
        toast(
          handsOver
            ? { title: "Removed", description: `${personName}'s report is no longer on your dashboard.` }
            : { title: "Report deleted", description: `${personName}'s report is gone.` },
        );
      },
      onError: (err) => {
        setOpen(false);
        toast({
          variant: "destructive",
          title: err.status === 409 ? "This report cannot be deleted yet" : "Could not delete the report",
          description: err.data?.message ?? "Please try again.",
        });
      },
    },
  });

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          size="sm"
          variant="ghost"
          className={className ?? "font-label gap-1.5 text-muted-foreground hover:text-destructive"}
          onClick={(e) => e.stopPropagation()}
          data-testid={`button-delete-report-${reportId}`}
        >
          <Trash2 className="h-3 w-3" />
          {handsOver ? "Remove" : "Delete report"}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent onClick={(e) => e.stopPropagation()}>
        <AlertDialogHeader>
          <AlertDialogTitle className="font-display">
            {handsOver ? `Remove ${personName}'s report?` : `Delete ${personName}'s report?`}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {handsOver
              ? `It stays with ${personName}, who owns it now. You won't be able to read it again.`
              : deleteLine(endsSharing(home, shares, reportId))}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteReport.isPending}>Keep it</AlertDialogCancel>
          <AlertDialogAction
            disabled={deleteReport.isPending}
            onClick={(e) => {
              e.preventDefault();
              deleteReport.mutate({ id: reportId });
            }}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            data-testid="button-confirm-delete-report"
          >
            {deleteReport.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {handsOver ? "Remove" : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useDeleteReport,
  getListReportsQueryKey,
  getListProfilesQueryKey,
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

// MB-32 provisional: the copy promises what the server decides today, the
// report plus its birth data when nothing else uses it.
export function DeleteReportDialog({
  reportId,
  personName,
  className,
}: {
  reportId: string;
  personName: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const { toast } = useToast();

  const deleteReport = useDeleteReport({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListReportsQueryKey() });
        qc.invalidateQueries({ queryKey: getListProfilesQueryKey() });
        setOpen(false);
        toast({ title: "Report deleted", description: `${personName}'s report is gone.` });
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
          Delete report
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent onClick={(e) => e.stopPropagation()}>
        <AlertDialogHeader>
          <AlertDialogTitle className="font-display font-light">Delete {personName}'s report?</AlertDialogTitle>
          <AlertDialogDescription>
            This deletes the report and its birth data if nothing else uses it. Any purchase record
            is kept. This cannot be undone.
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
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

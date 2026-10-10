import { Button } from "@/ds/atoms/Button";
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
} from "./Confirm";

export default function ConfirmExample() {
  return (
    <div className="flex flex-col gap-3 bg-ground p-6 text-paper">
      <p className="text-small text-paper-dim">Focus starts on Cancel. Escape returns it to the button.</p>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="danger" size="compact">Delete report</Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this report?</AlertDialogTitle>
            <AlertDialogDescription>Any purchase record is kept. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

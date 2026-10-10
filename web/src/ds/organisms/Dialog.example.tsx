import { Button } from "@/ds/atoms/Button";
import { Input } from "@/ds/atoms/Input";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "./Dialog";

export default function DialogExample() {
  return (
    <div className="flex flex-col gap-3 bg-ground p-6 text-paper">
      <p className="text-small text-paper-dim">Open it, press Escape: focus returns to the button. Enter in the field does not close it.</p>
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="secondary" size="compact">Add birth time</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sam's birth time</DialogTitle>
            <DialogDescription>With the time, we can place the houses.</DialogDescription>
          </DialogHeader>
          <Input aria-label="Birth time" placeholder="14:30" />
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary" size="compact">Not now</Button>
            </DialogClose>
            <Button size="compact">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

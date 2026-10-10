import { useState } from "react";
import { Button } from "@/ds/atoms/Button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "./Sheet";

function Frame({ title, note, children }: { title: string; note: string; children: React.ReactNode }) {
  return (
    <div className="grid content-start gap-2">
      <p className="m-0 font-label text-label uppercase text-label-dim">{title}</p>
      {children}
      <p className="m-0 text-caption text-muted">{note}</p>
    </div>
  );
}

function Live({ label, side, peek }: { label: string; side?: "bottom" | "right"; peek?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="secondary" size="compact" onClick={() => setOpen(true)}>{label}</Button>
      {peek ? (
        <Sheet peek open={open} onOpenChange={setOpen} label="Quick look">
          <p className="m-0 text-ui text-paper">A quick look. Drag up for the rest, down to close.</p>
        </Sheet>
      ) : (
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent side={side} className="flex flex-col gap-4">
            <SheetHeader className="text-left">
              <SheetDescription className="font-label text-label uppercase text-label-dim">Add someone</SheetDescription>
              <SheetTitle>Who is it for?</SheetTitle>
            </SheetHeader>
            <p className="m-0 text-ui text-paper-dim">Escape or the scrim closes it; focus goes back to the button.</p>
          </SheetContent>
        </Sheet>
      )}
    </>
  );
}

export default function SheetExample() {
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <Frame title="Today" note="O1 PhoneSheet 45% / 96%, border #3A4560, fill #171D29; O5 to O10 shadcn sheet, 500 ms in, black 80% scrim, O8 fill #11161F">
        <div className="rounded-t-[20px] border border-[#3A4560] bg-[#171D29] p-4 text-[13px] text-[#E8EBF2]">Quick look, drawn by hand in the dashboard</div>
        <div className="border-t border-[#242C3B] bg-[#11161F] p-4 text-[13px] text-[#E8EBF2]">Timeline reading, its own darker fill</div>
      </Frame>
      <Frame title="After" note="One Sheet: raised fill, line edge, 20 px corners, 300 ms in and 200 ms out, one scrim. O1 is the peek version.">
        <div className="flex flex-wrap gap-2">
          <Live label="O5 Bottom (phone)" side="bottom" />
          <Live label="O6 Right (desktop)" side="right" />
          <Live label="O1 Peek" peek />
        </div>
        <div className="rounded-t-sheet border border-b-0 border-line bg-raised p-4 text-small text-paper shadow-raised">Static: the sheet at rest</div>
      </Frame>
    </div>
  );
}

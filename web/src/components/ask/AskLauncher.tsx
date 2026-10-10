/**
 * Ask in the corner (ADR-213): its mark, bottom right, opening the chat on the
 * dashboard, on Timeline and in the reader's own reports. It is drawn only for
 * a reader with Timeline (ADR-262) and a finished Personal report of their own,
 * which Ask reads (Review 05/10 §1). A report page passes its id, so a question
 * asked there can read that report (reading 16).
 */
import { useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/ds/atoms/Button";
import { AskMark } from "@/components/ask/AskMark";
import { AskPanel } from "@/components/ask/AskPanel";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTimelineAccess } from "@/lib/timeline-access";

export function AskLauncher({ reportId }: { reportId?: string }) {
  const { access, hasPersonalReport, ask } = useTimelineAccess();
  const phone = useIsMobile();
  const [open, setOpen] = useState(false);
  const launcher = useRef<HTMLButtonElement>(null);
  const asks = access && hasPersonalReport;

  // A chat already open stays until the reader closes it, so a refusal it shows can still be read.
  if (!asks && !open) return null;

  return (
    // A phone's sheet covers the page, so it holds focus there; a desktop's panel leaves the page beside it to use.
    <Dialog.Root open={open} onOpenChange={setOpen} modal={phone}>
      {asks ? (
        <Dialog.Trigger asChild>
          <Button
            ref={launcher}
            className="fixed bottom-[max(18px,env(safe-area-inset-bottom))] right-[18px] z-30 h-auto min-h-11 gap-0 rounded-full py-2.5 pl-3 pr-[18px] shadow-raised print:hidden [&_svg]:size-[22px]"
          >
            <AskMark size={22} />
          </Button>
        </Dialog.Trigger>
      ) : null}
      <AskPanel open={open} phone={phone} reportId={reportId} usage={ask} launcher={launcher} />
    </Dialog.Root>
  );
}

export default AskLauncher;

/**
 * The waitlist over the page (reading 1; the Owner, 2026-09-30): before launch
 * every call to write a report or sign in opens it, a dialog on a desktop and
 * a bottom sheet on a phone, and /waitlist is its page. The provider holds the
 * address the form was given, so a visitor who joined and opens it again reads
 * where they stand instead of an empty field.
 */
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import { useLocation } from "wouter";
import { WaitlistForm } from "@/components/waitlist/WaitlistForm";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/ds/organisms/Dialog";
import { SheetContent } from "@/ds/organisms/Sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { PRODUCT } from "@/lib/product";
import { cn } from "@/lib/utils";

export interface WaitlistDialogApi {
  /** `source` is the tag the address is stored with: where on the site the visitor asked. */
  open(source: string): void;
}

const DialogContext = createContext<WaitlistDialogApi | null>(null);

interface Shown {
  open: boolean;
  source: string;
}

interface WaitlistDialogProps extends Shown {
  joined: string | null;
  onJoined: (email: string) => void;
  onClose: () => void;
  opener: RefObject<HTMLElement | null>;
}

function WaitlistDialog({ open, source, joined, onJoined, onClose, opener }: WaitlistDialogProps) {
  const phone = useIsMobile();
  const panel = useRef<HTMLDivElement>(null);

  // Portalled outside the page's root, so the form's own rules read the tokens from sd-tokens and its link and focus ring are restated.
  const body = (
    <div
      className={cn(
        "sd-tokens min-h-0 overflow-y-auto overscroll-contain",
        "[&_a]:text-indigo-lt [&_a]:underline [&_a]:underline-offset-[3px] [&_a:hover]:text-paper",
        "[&_:focus-visible]:outline-2 [&_:focus-visible]:outline-offset-[3px] [&_:focus-visible]:outline-indigo-lt",
        phone && "pt-3",
      )}
    >
      <DialogTitle className="pr-10 text-sheet-title text-balance">{PRODUCT} hasn't launched yet</DialogTitle>
      <DialogDescription className="mt-2 text-prose">Get an email when we launch.</DialogDescription>
      <div className="mt-5">
        <WaitlistForm source={source} joined={joined} onJoined={onJoined} />
      </div>
    </div>
  );

  // The buttons that open it are not Radix triggers, so focus goes back to whichever one was used.
  const returnFocus = (event: Event) => {
    event.preventDefault();
    opener.current?.focus();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      {phone ? (
        <SheetContent
          side="bottom"
          ref={panel}
          tabIndex={-1}
          className="flex max-h-[90dvh] flex-col pb-[max(1.5rem,env(safe-area-inset-bottom))]"
          onOpenAutoFocus={(event) => {
            // On a phone the sheet takes focus, not the field, so the keyboard does not rise over it as it slides in.
            event.preventDefault();
            panel.current?.focus();
          }}
          onCloseAutoFocus={returnFocus}
        >
          {body}
        </SheetContent>
      ) : (
        <DialogContent onCloseAutoFocus={returnFocus}>{body}</DialogContent>
      )}
    </Dialog>
  );
}

/** Wraps a page (SiteLayout does) so any button in it can open the waitlist over it. */
export function WaitlistDialogProvider({ children }: { children: ReactNode }) {
  const [shown, setShown] = useState<Shown>({ open: false, source: "" });
  const [joined, setJoined] = useState<string | null>(null);
  const opener = useRef<HTMLElement | null>(null);

  const open = useCallback((source: string) => {
    const active = document.activeElement;
    opener.current = active instanceof HTMLElement && active !== document.body ? active : null;
    setShown({ open: true, source });
  }, []);
  // The source stays while the dialog slides away, so the form it holds does not change under it.
  const close = useCallback(() => setShown((was) => (was.open ? { ...was, open: false } : was)), []);
  const api = useMemo(() => ({ open }), [open]);

  return (
    <DialogContext.Provider value={api}>
      {children}
      <WaitlistDialog open={shown.open} source={shown.source} joined={joined} onJoined={setJoined} onClose={close} opener={opener} />
    </DialogContext.Provider>
  );
}

/** Outside a provider a button still reaches the waitlist: its page, rather than a click that does nothing. */
export function useWaitlistDialog(): WaitlistDialogApi {
  const api = useContext(DialogContext);
  const [, navigate] = useLocation();
  return api ?? { open: () => navigate("/waitlist") };
}

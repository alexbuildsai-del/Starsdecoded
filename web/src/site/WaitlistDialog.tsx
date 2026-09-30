/**
 * The waitlist over the page (reading 1; the Owner, 2026-09-30): before launch
 * every call to write a report or sign in opens it, a dialog on a desktop and
 * a bottom sheet on a phone, and /waitlist is its page. The provider holds the
 * address the form was given, so a visitor who joined and opens it again reads
 * where they stand instead of an empty field.
 */
import { createContext, useCallback, useContext, useMemo, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion, useDragControls, type PanInfo } from "framer-motion";
import { X } from "lucide-react";
import { useLocation } from "wouter";
import { WaitlistForm } from "@/components/waitlist/WaitlistForm";
import { useIsMobile } from "@/hooks/use-mobile";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { PRODUCT } from "@/lib/product";
import { cn } from "@/lib/utils";

export interface WaitlistDialogApi {
  /** `source` is the tag the address is stored with: where on the site the visitor asked. */
  open(source: string): void;
}

const DialogContext = createContext<WaitlistDialogApi | null>(null);

/** The report's easing, the one the site moves on; R10's phone sheet slides up on it too. */
const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * Portalled to <body>, outside the page's root, so the dialog carries the
 * tokens the site's rules read, as the report's evidence card does.
 */
const TOKENS = {
  "--void": "#06080C", "--bg": "#0D1117", "--surface": "#11161F", "--raised": "#171D29",
  "--line": "#242C3B", "--line-soft": "#1A202C",
  "--paper": "#E8EBF2", "--paper-hi": "#F2F4F9", "--paper-dim": "#AEB6C6", "--muted": "#7E889A", "--muted-2": "#6E7789",
  "--indigo": "#5C6BC0", "--indigo-lt": "#9FA8DA",
  "--f-display": "'Newsreader', Georgia, 'Times New Roman', serif",
  "--f-body": "'Inter', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",
  "--f-label": "'Space Grotesk', ui-sans-serif, system-ui, sans-serif",
  "--f-mono": "'IBM Plex Mono', ui-monospace, 'SFMono-Regular', Menlo, monospace",
  "--ease": "cubic-bezier(.16, 1, .3, 1)",
} as CSSProperties;

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
  const reduced = useReducedMotion();
  const drag = useDragControls();
  const panel = useRef<HTMLDivElement>(null);
  const move = (duration: number) => (reduced ? { duration: 0 } : { duration, ease: EASE });

  // A firm pull on the handle closes the sheet; a short one springs back.
  const settle = (_: PointerEvent | MouseEvent | TouchEvent, info: PanInfo) => {
    if (info.offset.y > 96 || info.velocity.y > 600) onClose();
  };

  // Outside the page's root the form's privacy link and focus ring lose the site's rules, so the dialog restates them.
  const body = (
    <div
      style={TOKENS}
      className={cn(
        "min-h-0 overflow-y-auto overscroll-contain",
        "[&_a]:text-[#9FA8DA] [&_a]:underline [&_a]:underline-offset-[3px] [&_a:hover]:text-[#E8EBF2]",
        "[&_:focus-visible]:outline-2 [&_:focus-visible]:outline-offset-[3px] [&_:focus-visible]:outline-[#9FA8DA]",
        phone ? "px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-1" : "p-6",
      )}
    >
      <Dialog.Title
        className={cn(
          "font-display text-[26px] font-normal leading-[1.15] tracking-[-0.02em] text-balance text-[#E8EBF2]",
          !phone && "pr-10",
        )}
      >
        {PRODUCT} hasn't launched yet
      </Dialog.Title>
      <Dialog.Description className="mt-2 text-[15px] leading-relaxed text-[#AEB6C6]">
        Get an email when we launch.
      </Dialog.Description>
      <div className="mt-5">
        <WaitlistForm source={source} joined={joined} onJoined={onJoined} />
      </div>
    </div>
  );

  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount key="waitlist">
            <Dialog.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-[70] bg-[rgba(6,8,12,.72)]"
                initial={reduced ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: move(0.25) }}
                transition={move(0.3)}
              />
            </Dialog.Overlay>
            <Dialog.Content
              asChild
              forceMount
              onOpenAutoFocus={(event) => {
                // On a phone the sheet takes focus, not the field, so the keyboard does not rise over it as it slides in.
                if (!phone) return;
                event.preventDefault();
                panel.current?.focus();
              }}
              onCloseAutoFocus={(event) => {
                // The buttons that open it are not Radix triggers, so focus goes back to whichever one was used.
                event.preventDefault();
                opener.current?.focus();
              }}
            >
              {phone ? (
                <motion.div
                  key="sheet"
                  ref={panel}
                  drag="y"
                  dragControls={drag}
                  dragListener={false}
                  dragConstraints={{ top: 0, bottom: 0 }}
                  dragElastic={{ top: 0, bottom: 0.6 }}
                  dragMomentum={false}
                  onDragEnd={settle}
                  initial={reduced ? false : { y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "100%", transition: move(0.35) }}
                  transition={move(0.5)}
                  className="fixed inset-x-0 bottom-0 z-[70] flex max-h-[90dvh] flex-col rounded-t-[20px] border border-b-0 border-[#242C3B] bg-[#0E1219] text-[#E8EBF2] shadow-[0_-12px_40px_rgba(0,0,0,.45)] outline-none"
                >
                  <div
                    onPointerDown={(event) => drag.start(event)}
                    className="relative flex h-11 shrink-0 touch-none items-center justify-center"
                  >
                    <span aria-hidden="true" className="block h-1 w-9 rounded-full bg-[#3A4356]" />
                    <Dialog.Close className="absolute right-3 top-1/2 -translate-y-1/2 rounded px-2 py-2 font-label text-[10.5px] font-medium uppercase tracking-[0.14em] text-[#AEB6C6] transition-colors hover:text-[#E8EBF2] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#9FA8DA]">
                      Close
                    </Dialog.Close>
                  </div>
                  {body}
                </motion.div>
              ) : (
                <motion.div
                  key="dialog"
                  ref={panel}
                  initial={reduced ? false : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8, transition: move(0.2) }}
                  transition={move(0.45)}
                  className="fixed inset-0 z-[70] m-auto flex h-fit max-h-[calc(100dvh-48px)] w-[min(440px,calc(100vw-32px))] flex-col rounded-[16px] border border-[#242C3B] bg-[#11161F] text-[#E8EBF2] shadow-[0_22px_60px_rgba(0,0,0,.6)] outline-none"
                >
                  {body}
                  <Dialog.Close
                    aria-label="Close"
                    className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full border border-[#242C3B] text-[#AEB6C6] transition-colors hover:border-[rgba(159,168,218,.6)] hover:text-[#E8EBF2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9FA8DA]"
                  >
                    <X aria-hidden="true" className="h-4 w-4" />
                  </Dialog.Close>
                </motion.div>
              )}
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
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

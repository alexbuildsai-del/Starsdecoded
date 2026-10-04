/**
 * The sky screen (landing scope 3; ADR-108): Show my chart lifts the wheel off
 * the page into a screen of its own (0.75 s), rewinds the sky to the birth
 * minute (2.9 s), then names the Sun, Moon and Rising. Close flies the wheel
 * back and the page keeps that sky; Try another date flies it back to the sky
 * now. It is a dialog portalled to <body>, under the waitlist's layer, so
 * before launch its Get my report can still open the waitlist over it
 * (reading 1). Nothing is stored; after launch that button keeps the date,
 * time and place for the birth form, the tab's own (ADR-140, reading 14).
 */
import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { LAUNCHED } from "@workspace/launch";
import { useEntryFormat } from "@/hooks/useEntryFormat";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { CHAPTERS } from "@/lib/chapters";
import { saveFormDraft } from "@/lib/form-draft";
import { usePrelaunchView } from "@/lib/prelaunch";
import { PERSONAL_REPORT } from "@/lib/product";
import { ReportCta } from "@/site/cta";
import { HorizonWheel } from "@/site/components/HorizonWheel";
import {
  EASE_CSS,
  LIFT_MS,
  draftOf,
  placementLine,
  plainLine,
  prepareRewind,
  risingLine,
  summaryLine,
  type PreparedRewind,
  type Sky,
  type SkyBirth,
} from "@/site/lib/sky";

const CLOSE_MS = 650;
const COUNTS = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];

/** After launch, Get my report carries the birth to the form through sign-in; before it, the waitlist opens and nothing is kept. */
export function useKeepForForm(birth: SkyBirth | undefined): () => void {
  const visitor = usePrelaunchView();
  return () => {
    if (LAUNCHED && !visitor && birth) saveFormDraft(draftOf(birth));
  };
}

export interface SkyScreenProps {
  /** The sky the page shows now, which the wheel lifts. */
  from: Sky;
  /** The birth's sky, which it rewinds to. */
  to: Sky;
  /** The page's square the wheel lifts from and flies back to. */
  origin: RefObject<HTMLDivElement | null>;
  /** How many of the rewind's frames to work out while the wheel lifts. */
  frames: number;
  /** After the flight back: `keep` when the page is to keep the birth's sky. */
  onClosed: (keep: boolean) => void;
}

type Stage = "lifting" | "rewinding" | "shown" | "closing";

export default function SkyScreen({ from, to, origin, frames, onClosed }: SkyScreenProps) {
  const reduced = useReducedMotion();
  const { clock } = useEntryFormat();
  const [sky, setSky] = useState<Sky>(from);
  const [stage, setStage] = useState<Stage>("lifting");
  const [lifted, setLifted] = useState(false);
  const [prepared, setPrepared] = useState<PreparedRewind | null>(null);
  const [lit, setLit] = useState(false);
  const square = useRef<HTMLDivElement | null>(null);
  const content = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const results = useRef<HTMLDivElement>(null);
  const keepForForm = useKeepForForm(to.birth);

  // The lift: the screen's wheel starts where the page's is and eases into its own place. It runs once, from the page
  // as it stood when the screen opened.
  useLayoutEffect(() => {
    const el = square.current;
    const start = origin.current;
    const up = () => setLifted(true);
    if (!el || !start) {
      up();
      return;
    }
    const a = start.getBoundingClientRect();
    const b = el.getBoundingClientRect();
    el.style.transformOrigin = "0 0";
    const lift = el.animate(
      [{ transform: `translate(${a.left - b.left}px, ${a.top - b.top}px) scale(${a.width / b.width})` }, { transform: "none" }],
      { duration: reduced ? 0 : LIFT_MS, easing: EASE_CSS },
    );
    lift.finished.then(up, () => {});
    return () => lift.cancel();
  }, []);

  // The frames are worked out while the wheel lifts; under reduced motion there is no rewind to work out.
  useEffect(() => {
    if (reduced) return;
    return prepareRewind(from, to, frames, setPrepared);
  }, [from, to, frames, reduced]);

  // The rewind starts once the wheel is up and its frames are ready; on a slow device the lifted wheel waits for them.
  useEffect(() => {
    if (!lifted || (!prepared && !reduced)) return;
    setSky(to);
    setStage("rewinding");
  }, [lifted, prepared, reduced, to]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setLit(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  useLayoutEffect(() => {
    if (stage !== "shown" || reduced) return;
    results.current?.animate([{ opacity: 0, transform: "translateY(12px)" }, { opacity: 1, transform: "none" }], { duration: 600, easing: EASE_CSS });
  }, [stage, reduced]);

  const arrive = (settled: Sky) => {
    if (settled !== to || stage !== "rewinding") return;
    setStage("shown");
    closeButton.current?.focus({ preventScroll: true });
  };

  const close = (keep: boolean) => {
    if (stage !== "shown") return;
    setStage("closing");
    setLit(false);
    const el = square.current;
    const end = origin.current;
    if (!el || !end) {
      onClosed(keep);
      return;
    }
    const a = el.getBoundingClientRect();
    const b = end.getBoundingClientRect();
    const back = el.animate(
      [{ transform: "none" }, { transform: `translate(${b.left - a.left}px, ${b.top - a.top}px) scale(${b.width / a.width})` }],
      { duration: reduced ? 0 : CLOSE_MS, easing: EASE_CSS, fill: "forwards" },
    );
    back.finished.then(() => onClosed(keep), () => {});
  };

  const birth = to.birth;
  const shown = stage === "shown" || stage === "closing";
  const fade = (on: boolean, delay = 0) => ({ opacity: on ? 1 : 0, transition: `opacity .5s ${EASE_CSS} ${delay}s` });

  return (
    <Dialog.Root open onOpenChange={(open) => !open && close(true)}>
      {/* Given its container, the portal mounts with the screen, so the lift finds the wheel it moves. This screen only
          opens from a click, never in the prerender. */}
      <Dialog.Portal container={document.body}>
        <Dialog.Content
          ref={content}
          tabIndex={-1}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            content.current?.focus({ preventScroll: true });
          }}
          onCloseAutoFocus={(event) => event.preventDefault()}
          onEscapeKeyDown={(event) => {
            event.preventDefault();
            close(true);
          }}
          className="sd fixed inset-0 z-[60] grid grid-rows-[auto_minmax(0,1fr)] overflow-hidden bg-transparent outline-none [container-type:size]"
        >
          <div aria-hidden="true" className="absolute inset-0 bg-[image:var(--ground)]" style={fade(lit)}>
            <div className="absolute inset-0 bg-[image:var(--stars)] opacity-80" />
          </div>
          <div
            className="relative flex items-start justify-between gap-4 px-6 pb-1.5 pt-[max(18px,env(safe-area-inset-top))] @max-[760px]:px-4 @max-[760px]:pt-[max(14px,env(safe-area-inset-top))]"
            style={fade(lit, 0.2)}
          >
            <div className="grid gap-1.5">
              <Dialog.Title className="sd-eyebrow">Your chart</Dialog.Title>
              <Dialog.Description className="sd-tag">{birth ? summaryLine(birth, clock) : ""}</Dialog.Description>
            </div>
            <button
              ref={closeButton}
              type="button"
              onClick={() => close(true)}
              aria-label="Close and go back to the page"
              className="grid h-10 w-10 flex-none cursor-pointer place-items-center rounded-full border border-[color:var(--line)] bg-[rgba(13,17,23,.7)] text-[color:var(--paper)] transition-colors hover:border-[rgba(159,168,218,.6)]"
            >
              <X aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
          <div className="relative mx-auto grid min-h-0 w-full max-w-[1320px] grid-cols-[minmax(0,1fr)_minmax(0,400px)] items-center gap-12 px-14 pb-7 @max-[900px]:grid-cols-1 @max-[900px]:content-start @max-[900px]:items-start @max-[900px]:gap-2.5 @max-[900px]:overflow-y-auto @max-[900px]:px-4 @max-[900px]:pb-[max(20px,env(safe-area-inset-bottom))]">
            {/* Where the margin beside the ring is too narrow for them, the horizon's words go and its line stays. */}
            <div className="relative w-[min(78cqh,100%)] justify-self-center @max-[1200px]:[&_.sd-hz_b]:hidden @max-[900px]:w-[min(94cqw,54cqh)]">
              <HorizonWheel sky={sky} rewind={prepared} horizon={shown} onArrived={arrive} squareRef={square} />
            </div>
            <div ref={results} aria-live="polite" className="grid gap-3.5" style={{ opacity: stage === "closing" ? 0 : 1, transition: `opacity .3s ${EASE_CSS}` }}>
              {shown && birth ? <Reading sky={to} keepForForm={keepForForm} onAgain={() => close(false)} /> : null}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Reading({ sky, keepForForm, onAgain }: { sky: Sky; keepForForm: () => void; onAgain: () => void }) {
  const { chart } = sky;
  const rising = risingLine(chart);
  const rows: [string, string, boolean][] = [
    ["Sun", placementLine(chart, "sun"), true],
    ["Moon", placementLine(chart, "moon"), true],
    ["Rising", rising ?? "Add your birth time to see it", rising !== null],
  ];
  return (
    <>
      <h3 className="text-[clamp(26px,3.2cqw,36px)] leading-[1.12] @max-[900px]:text-2xl">{plainLine(chart)}</h3>
      <dl className="grid">
        {rows.map(([name, value, measured]) => (
          <div key={name} className="grid grid-cols-[76px_minmax(0,1fr)] items-baseline gap-3 border-t border-[color:var(--line-soft)] py-2.5 last:border-b">
            <dt className="font-label text-[11px] uppercase tracking-[.16em] text-[color:var(--sd-muted)]">{name}</dt>
            <dd className={measured ? "font-numeric text-[14px] text-[color:var(--paper)]" : "text-[14px] text-[color:var(--paper-dim)]"}>{value}</dd>
          </div>
        ))}
      </dl>
      <p className="text-[15.5px] leading-normal text-[color:var(--paper-dim)]">
        {chart.angles
          ? `Your ${PERSONAL_REPORT} goes through all of this in ${COUNTS[CHAPTERS.length] ?? CHAPTERS.length} chapters.`
          : `You can still get a full ${PERSONAL_REPORT}. Without a birth time it leaves out your rising sign and houses, and says so. You can add the time later, free.`}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <span className="contents" onClickCapture={keepForForm}>
          <ReportCta source="sky-screen" className="sd-btn" />
        </span>
        <button type="button" className="sd-btn sd-btn-g" onClick={onAgain}>
          Try another date
        </button>
      </div>
      <p className="text-[12.5px] leading-snug text-[color:var(--sd-muted)]">Nothing is saved. Close this to go back to the page.</p>
    </>
  );
}

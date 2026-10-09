/**
 * The one way into a Compatibility report (ADR-40, ADR-42), as a pop-up (sharing-and-circle §6, ADR-336): a centred
 * dialog from 640 px and a bottom sheet below, the Share window's frame. Two Personal reports the reader can read, any
 * two, own not required; a finished one selectable and one still being written listed and disabled; how the two know
 * each other required, a parent and child asking who the parent is (ADR-68); one call to action. No birth form, ever.
 *
 * A pair handed to it (MB-86) enters as the picked selection once the list vouches for both reports, so a quick look's
 * Make You & {name}, Your first steps and `?pair=` open it with both people picked. Make it opens the new report on
 * its loading screen (ADR-336, which replaces ADR-131's reading 6). The page opens it only where `canPair` holds
 * (ADR-332).
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useLocation } from "wouter";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { ChevronDown, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetCreditsQueryKey,
  getGetHomeQueryKey,
  getListReportsQueryKey,
  useCreateCompatibilityReport,
  useGetCredits,
  useListReports,
  type ReportSummary,
} from "@workspace/api-client-react";
import { StatusDots } from "@/components/StatusDots";
import { useOpenerFocus } from "@/components/dashboard/RowMenu";
import { Button } from "@/components/ui/button";
import { DialogOverlay, DialogPortal } from "@/components/ui/dialog";
import { creditCount } from "@/lib/credits-view";
import { MAKE_REPORT } from "@/lib/home-view";
import { HOW_OPTIONS, PARENT_QUESTION, lensInfo } from "@/lib/lenses";
import {
  enterPreselect, forgetSelection, readSelection, reconcileSelection, rememberSelection, unpickable, type PairSelection,
} from "@/lib/pair-selection";
import { isNoCredit, refusalLine } from "@/lib/refusals";
import { cn } from "@/lib/utils";

export interface CompatibilityPickerProps {
  open: boolean;
  onClose: () => void;
  /** The list the page already holds; undefined while it loads, so a remembered or preselected pair waits for it. */
  reports?: ReportSummary[];
  /** The two people chosen elsewhere, from `preselectPair`; empty or null to open on whatever the tab last kept. */
  preselect?: Partial<PairSelection> | null;
  /** The reader's own profiles (`ownIds`), whose report the selects mark "(you)" as the artifact's screen E does. */
  own?: ReadonlySet<string>;
  /**
   * At zero, or when the server finds no credit (402), the button is Get credits: a checkout that comes back to the
   * picker with its pair kept (reading 2).
   */
  onGetCredits: () => void;
}

// A bottom sheet below 640 px, where the thumb is; a centred dialog above, as the Share window opens.
const WINDOW = [
  "fixed z-50 flex flex-col gap-4 overflow-y-auto border border-[#3A4560] bg-[#171D29] text-[#E8EBF2] outline-none duration-200",
  "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
  "motion-reduce:data-[state=open]:animate-none motion-reduce:data-[state=closed]:animate-none",
  "max-sm:inset-x-0 max-sm:bottom-0 max-sm:max-h-[92dvh] max-sm:rounded-t-[20px] max-sm:px-[18px] max-sm:pb-[max(18px,env(safe-area-inset-bottom))] max-sm:pt-2.5 max-sm:shadow-[0_-18px_44px_rgba(0,0,0,.65)]",
  "max-sm:data-[state=open]:slide-in-from-bottom-8 max-sm:data-[state=closed]:slide-out-to-bottom-8",
  "sm:left-1/2 sm:top-1/2 sm:max-h-[min(86dvh,720px)] sm:w-[calc(100%-2rem)] sm:max-w-[480px] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:p-[18px] sm:shadow-lg",
  "sm:data-[state=closed]:zoom-out-95 sm:data-[state=open]:zoom-in-95",
].join(" ");

const LABEL = "font-label text-[10.5px] font-medium uppercase tracking-[0.18em] text-[#9AA3B5]";
const SELECT =
  "h-11 w-full min-w-0 appearance-none truncate rounded-[10px] border border-[#3A4560] bg-[#0F141C] pl-3 pr-9 text-base text-[#E8EBF2] sm:text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-60";
const WIDE = "min-h-11 w-full font-label text-[13.5px]";
const NEXT = "Next you'll see the two charts being put together while the report writes.";

/** How the two know each other, one list: a lens, or Two people with its answer (ADR-68), as screen E asks it. */
const KNOWS: ReadonlyArray<{ value: string; label: string }> = [
  { value: "partners", label: lensInfo("partners").title },
  { value: "parent_child", label: lensInfo("parent_child").title },
  ...HOW_OPTIONS.map((how) => ({ value: how, label: how.charAt(0).toUpperCase() + how.slice(1) })),
];

function knowsOf(selection: Partial<PairSelection>): string {
  if (selection.lens === "partners" || selection.lens === "parent_child") return selection.lens;
  return selection.lens === "people" && selection.how ? selection.how : "";
}

function withKnows(current: Partial<PairSelection>, value: string): Partial<PairSelection> {
  const { lens: _lens, how: _how, ...rest } = current;
  if (value === "partners" || value === "parent_child") return { ...rest, lens: value };
  const how = HOW_OPTIONS.find((option) => option === value);
  return how ? { ...rest, lens: "people", how } : rest;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid min-w-0 gap-1.5">
      <span className={LABEL}>{label}</span>
      <span className="relative block min-w-0">
        {children}
        <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9AA3B5]" />
      </span>
    </label>
  );
}

/** Outside the body, so a render never remounts the select and drops the keyboard's place in it. */
function PersonSelect({ label, value, onChange, exclude, reports, own }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  exclude: string;
  reports: readonly ReportSummary[];
  own: ReadonlySet<string>;
}) {
  return (
    <Field label={label}>
      <select value={value} onChange={(e) => onChange(e.target.value)} data-empty={!value} className={SELECT}>
        <option value="">Choose someone</option>
        {reports.map((r) => {
          const why = unpickable(r);
          const mine = !!r.profileId && own.has(r.profileId);
          return (
            <option key={r.id} value={r.id} disabled={!!why || r.id === exclude}>
              {r.name}{mine ? " (you)" : ""}{why ? ` · ${why}` : ""}
            </option>
          );
        })}
      </select>
    </Field>
  );
}

function PickerBody({ reports: given, preselect, own, onGetCredits, onBusy }: {
  reports?: ReportSummary[];
  preselect: Partial<PairSelection> | null;
  own: ReadonlySet<string>;
  onGetCredits: () => void;
  onBusy: (busy: boolean) => void;
}) {
  const [, navigate] = useLocation();
  const client = useQueryClient();
  const listed = useListReports({ query: { queryKey: getListReportsQueryKey(), enabled: !given } });
  const credits = useGetCredits();
  // On the hook, not the call: a call's callbacks are skipped once the viewer has left the page. A refusal for want of
  // a credit keeps the pair remembered for the trip to checkout, and the balance catches up with the server's answer.
  const create = useCreateCompatibilityReport({
    mutation: {
      onSuccess: () => forgetSelection(),
      onError: (err) => {
        if (isNoCredit(err)) void client.invalidateQueries({ queryKey: getGetCreditsQueryKey() });
      },
    },
  });
  const loaded = useMemo(() => {
    const all = given ?? listed.data;
    return Array.isArray(all) ? all.filter((r) => r.kind === "natal") : undefined;
  }, [given, listed.data]);
  const reports = loaded ?? [];

  const remembered = useMemo(() => readSelection(), []);
  const restored = useMemo(() => reconcileSelection(remembered, loaded), [remembered, loaded]);
  // A preselect answers to the remembered pair's checks (ADR-105): it enters only while the list holds both of its
  // reports. The pop-up mounts as it opens, so a list already in hand lets it enter in the first render, and the
  // first empty choice can take the focus.
  const [initial] = useState<{ picked: Partial<PairSelection> | null; entered: Partial<PairSelection> | null }>(() => {
    const check = preselect ? reconcileSelection(preselect, loaded) : null;
    if (!preselect || !check || check.state === "waiting") return { picked: null, entered: null };
    const before = restored.state === "kept" ? restored.selection : {};
    return { picked: check.state === "kept" ? enterPreselect(before, check.selection) : null, entered: preselect };
  });
  const entered = useRef(initial.entered);
  const [picked, setPicked] = useState(initial.picked);
  // Derived rather than copied into state, so the remembered pair shows in the
  // same render the list vouches for it, and a pick made while it loads wins.
  const shown = picked ?? (restored.state === "kept" ? restored.selection : {});
  const pick = (change: Partial<PairSelection>) => setPicked({ ...shown, ...change });
  const a = shown.a ?? "";
  const b = shown.b ?? "";
  const lens = shown.lens ?? "";
  const parent = shown.parent ?? "A";
  const how = shown.how ?? "";
  useEffect(() => {
    if (picked) rememberSelection(picked);
  }, [picked]);
  useEffect(() => {
    if (!picked && restored.state === "dropped") forgetSelection();
  }, [picked, restored.state]);
  // A list still loading when the pop-up opened lets the preselect in once it arrives.
  useEffect(() => {
    if (!preselect || entered.current === preselect) return;
    const check = reconcileSelection(preselect, loaded);
    if (check.state === "waiting") return;
    entered.current = preselect;
    if (check.state === "kept") {
      const incoming = check.selection;
      const before = restored.state === "kept" ? restored.selection : {};
      setPicked((prev) => enterPreselect(prev ?? before, incoming));
    }
  }, [preselect, loaded, restored]);

  const info = lens ? lensInfo(lens) : null;
  const nameOf = (id: string) => reports.find((r) => r.id === id)?.name ?? "";
  const ready = a && b && a !== b && lens && (!info?.asksHow || how) && !unpickable(reports.find((r) => r.id === a)) && !unpickable(reports.find((r) => r.id === b));
  // Writing holds from the press until the loading screen opens (ADR-130).
  const busy = create.isPending || create.isSuccess;
  useEffect(() => onBusy(busy), [busy, onBusy]);
  const balance = credits.data?.available;
  // Zero means zero on every host (ADR-275); a refusal the stale balance missed asks for a credit the same way.
  const refused = create.isError && isNoCredit(create.error);
  const outOfCredits = balance === 0 || refused;
  // After a refusal the server's own line below says so, once.
  const have = refused ? null : balance === 0 ? "No credits left." : balance !== undefined ? `You have ${creditCount(balance)}.` : null;

  function submit() {
    if (!ready || !lens || busy) return;
    create.mutate({ data: { reportAId: a, reportBId: b, lens, ...(info?.asksParent ? { parent } : {}), ...(info?.asksHow && how ? { label: how } : {}) } }, {
      onSuccess: (res) => {
        void client.invalidateQueries({ queryKey: getGetCreditsQueryKey() });
        void client.invalidateQueries({ queryKey: getListReportsQueryKey() });
        // Your first steps goes once the first pair exists, so the dashboard reads it again when the reader is back.
        void client.invalidateQueries({ queryKey: getGetHomeQueryKey() });
        navigate(`/compatibility/${res.id}`);
      },
    });
  }

  return (
    <>
      <header className="flex items-start justify-between gap-3">
        <DialogPrimitive.Title className="font-display text-[22px] font-normal leading-[1.15] tracking-[-0.01em]">
          {MAKE_REPORT.newPair}
        </DialogPrimitive.Title>
        <DialogPrimitive.Close
          disabled={busy}
          aria-label="Close"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[#3A4560] text-[#C9CEDA] transition-colors hover:text-[#E8EBF2] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </DialogPrimitive.Close>
      </header>

      <div className="grid gap-3">
        <PersonSelect label="First person" value={a} onChange={(v) => pick({ a: v })} exclude={b} reports={reports} own={own} />
        <PersonSelect label="Second person" value={b} onChange={(v) => pick({ b: v })} exclude={a} reports={reports} own={own} />
        <Field label="How you know each other">
          <select value={knowsOf(shown)} onChange={(e) => setPicked(withKnows(shown, e.target.value))} data-empty={!knowsOf(shown)} data-knows className={SELECT}>
            <option value="">Choose one</option>
            {KNOWS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </Field>
        {info?.asksParent && a && b && (
          <Field label={PARENT_QUESTION}>
            <select value={parent} onChange={(e) => pick({ parent: e.target.value === "B" ? "B" : "A" })} className={SELECT}>
              <option value="A">{nameOf(a) || "First person"}</option>
              <option value="B">{nameOf(b) || "Second person"}</option>
            </select>
          </Field>
        )}
      </div>

      <div className="grid gap-2">
        {busy ? (
          // ADR-130: under way, the control is a status with dots, never its idle verb.
          <div className={cn(WIDE, "flex items-center justify-center rounded-md border border-primary/35 bg-primary/10 text-[#9FA8DA]")}>
            <StatusDots label="Writing" />
          </div>
        ) : outOfCredits ? (
          <Button variant="outline" onClick={onGetCredits} className={cn(WIDE, "[border-color:hsl(var(--primary)/0.6)] text-[#9FA8DA]")}>
            Get credits
          </Button>
        ) : (
          <Button disabled={!ready} onClick={submit} className={WIDE}>
            Make it
            <span aria-hidden="true" className="text-white/60">·</span>
            <span className="font-numeric">1 credit</span>
          </Button>
        )}
        <DialogPrimitive.Description className="text-[13px] leading-[1.45] text-[#9AA3B5]">
          {have ? `${have} ${NEXT}` : NEXT}
        </DialogPrimitive.Description>
        {create.isError && (
          <p role="alert" className="text-[13px] leading-[1.45] text-[#E79AB2]">
            {refusalLine(create.error) ?? "Could not start the report. Try again in a minute."}
          </p>
        )}
      </div>
    </>
  );
}

export function CompatibilityPicker({ open, onClose, reports, preselect = null, own, onGetCredits }: CompatibilityPickerProps) {
  const focus = useOpenerFocus();
  // A report half started must finish here, or its loading screen would never open.
  const [busy, setBusy] = useState(false);
  const mine = useMemo(() => own ?? new Set<string>(), [own]);
  return (
    <DialogPrimitive.Root open={open} onOpenChange={(next) => !next && !busy && onClose()}>
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content
          className={WINDOW}
          onOpenAutoFocus={(event) => {
            focus.onOpenAutoFocus();
            event.preventDefault();
            // The first choice still to make takes the focus, never Make it, so a stray Enter spends nothing (R14-12).
            const content = event.currentTarget as HTMLElement;
            (content.querySelector<HTMLSelectElement>('select[data-empty="true"]') ?? content.querySelector<HTMLSelectElement>("select[data-knows]"))?.focus();
          }}
          onCloseAutoFocus={focus.onCloseAutoFocus}
        >
          <span aria-hidden="true" className="mx-auto h-1 w-10 shrink-0 rounded-full bg-[#3A4560] sm:hidden" />
          <PickerBody reports={reports} preselect={preselect} own={mine} onGetCredits={onGetCredits} onBusy={setBusy} />
        </DialogPrimitive.Content>
      </DialogPortal>
    </DialogPrimitive.Root>
  );
}

export default CompatibilityPicker;

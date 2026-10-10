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
import { Button } from "@/ds/atoms/Button";
import { Select } from "@/ds/atoms/Select";
import { InlineError } from "@/ds/molecules/Alert";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/ds/organisms/Dialog";
import { creditCount } from "@/lib/credits-view";
import { MAKE_REPORT } from "@/lib/home-view";
import { HOW_OPTIONS, PARENT_QUESTION, lensInfo } from "@/lib/lenses";
import {
  enterPreselect, forgetSelection, readSelection, reconcileSelection, rememberSelection, unpickable, type PairSelection,
} from "@/lib/pair-selection";
import { isNoCredit, refusalLine } from "@/lib/refusals";

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
    <Select label={label} value={value} onChange={(e) => onChange(e.target.value)} data-empty={!value}>
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
    </Select>
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
      <DialogHeader>
        <DialogTitle>{MAKE_REPORT.newPair}</DialogTitle>
      </DialogHeader>

      <div className="grid gap-3">
        <PersonSelect label="First person" value={a} onChange={(v) => pick({ a: v })} exclude={b} reports={reports} own={own} />
        <PersonSelect label="Second person" value={b} onChange={(v) => pick({ b: v })} exclude={a} reports={reports} own={own} />
        <Select label="How you know each other" value={knowsOf(shown)} onChange={(e) => setPicked(withKnows(shown, e.target.value))} data-empty={!knowsOf(shown)} data-knows>
          <option value="">Choose one</option>
          {KNOWS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </Select>
        {info?.asksParent && a && b && (
          <Select label={PARENT_QUESTION} value={parent} onChange={(e) => pick({ parent: e.target.value === "B" ? "B" : "A" })}>
            <option value="A">{nameOf(a) || "First person"}</option>
            <option value="B">{nameOf(b) || "Second person"}</option>
          </Select>
        )}
      </div>

      <div className="grid gap-2">
        {busy ? (
          // ADR-130: under way, the control is a status with dots, never its idle verb.
          <Button full busy="Writing" />
        ) : outOfCredits ? (
          <Button variant="secondary" full onClick={onGetCredits}>
            Get credits
          </Button>
        ) : (
          <Button full disabled={!ready} onClick={submit}>
            Make it
            <span aria-hidden="true" className="text-on-indigo/60">·</span>
            <span className="font-numeric">1 credit</span>
          </Button>
        )}
        <DialogDescription className="text-small text-muted">
          {have ? `${have} ${NEXT}` : NEXT}
        </DialogDescription>
        {create.isError && (
          <InlineError>
            {refusalLine(create.error) ?? "Could not start the report. Try again in a minute."}
          </InlineError>
        )}
      </div>
    </>
  );
}

export function CompatibilityPicker({ open, onClose, reports, preselect = null, own, onGetCredits }: CompatibilityPickerProps) {
  // A report half started must finish here, or its loading screen would never open.
  const [busy, setBusy] = useState(false);
  const mine = useMemo(() => own ?? new Set<string>(), [own]);
  return (
    <Dialog open={open} onOpenChange={(next) => !next && !busy && onClose()}>
      <DialogContent
        className="overflow-y-auto"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          // The first choice still to make takes the focus, never Make it, so a stray Enter spends nothing (R14-12).
          const content = event.currentTarget as HTMLElement;
          (content.querySelector<HTMLSelectElement>('select[data-empty="true"]') ?? content.querySelector<HTMLSelectElement>("select[data-knows]"))?.focus();
        }}
      >
        <PickerBody reports={reports} preselect={preselect} own={mine} onGetCredits={onGetCredits} onBusy={setBusy} />
      </DialogContent>
    </Dialog>
  );
}

export default CompatibilityPicker;

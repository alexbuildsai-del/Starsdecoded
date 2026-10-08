/**
 * What you're practising (ADR-174): what the reader pinned on their own
 * Personal report and on the pairs they are one of, or with nothing pinned
 * the home page's sample action, in the report's one checklist (ADR-172).
 * A tick or a pin writes the workbook of the report the item came from, so the
 * report shows the same box (ADR-24), and GET /home is read again once the
 * last change lands: an unpinned item leaves, and the sample action comes
 * back when the last pin goes.
 */
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetHomeQueryKey,
  getGetReportQueryKey,
  useUpdateReportWorkbook,
  type Home,
  type HomePair,
  type HomePractice,
  type Report,
} from "@workspace/api-client-react";
import { Checklist, localTicks, type ChecklistItem, type TickStore } from "@/components/report/Checklist";
import { CHAPTERS } from "@/lib/chapters";
import { ownIds } from "@/lib/home-view";
import { PAIR_CHAPTER_TITLES } from "@/lib/lenses";
import { COMPATIBILITY_REPORT } from "@/lib/product";
import { first } from "@/lib/share-card";
import { pinKey, pinPatch, togglePatch, type WorkbookPatch } from "@/lib/workbook";
import type { Workbook } from "@/types/chart";

const HEADING = "font-label text-[11px] font-medium uppercase leading-[1.4] tracking-[.18em] text-[#3FA796]";
// The section's heading names the list, as the approved mock draws it, so the checklist's own rule and heading stand
// down, the heading kept for a screen reader as the list's name; and the list runs the row's full width on desktop,
// as the mock's rows do.
const BARE = "[&>div]:mt-0 [&>div]:max-w-none [&>div]:border-t-0 [&>div]:pt-0 [&>div>span:first-child]:sr-only [&_ul]:mt-0";
const SECTION = "grid min-w-0 gap-2.5";

// Two reports can tick an item under the same key, so the list keys each item by its report too.
function practiceKey(item: Pick<HomePractice, "reportId" | "key">): string {
  return `${item.reportId} ${item.key}`;
}

/** The other of the two, or null when neither or both are the reader's own charts, so the pair goes by both names. */
export function otherOf(pair: HomePair, own: ReadonlySet<string>): HomePair["a"] | null {
  const a = own.has(pair.a.profileId);
  const b = own.has(pair.b.profileId);
  if (a === b) return null;
  return a ? pair.b : pair.a;
}

export function bothOf(pair: HomePair): string {
  return `${first(pair.a.name)} and ${first(pair.b.name)}`;
}

/** The chapter a pinned item lives in, from the section its key starts with. */
export function chapterOf(item: Pick<HomePractice, "kind" | "key">, lens: HomePair["lens"] | null): string | null {
  const section = item.key.split(".")[0];
  if (item.kind === "natal") return CHAPTERS.find((c) => c.section === section)?.title ?? null;
  const titles = PAIR_CHAPTER_TITLES(lens ?? "partners");
  if (section === "whatToPractise") return titles[titles.length - 1];
  const n = /(\d+)$/.exec(section)?.[1];
  return n ? titles[Number(n) - 1] ?? null : null;
}

// A pair offers nothing unpinned, so its item is listed only while it is pinned.
function labelOf(item: HomePractice, pairs: readonly HomePair[], own: ReadonlySet<string>): string {
  const pair = pairs.find((p) => p.reportId === item.reportId);
  const chapter = chapterOf(item, pair?.lens ?? null);
  if (item.kind === "natal") return item.pinned ? `Pinned · ${chapter ?? "Your report"}` : "Closing · Practice";
  if (!pair) return `Pinned · ${[chapter, COMPATIBILITY_REPORT].filter(Boolean).join(" · ")}`;
  const other = otherOf(pair, own);
  return `Pinned · ${[chapter, other ? `with ${first(other.name)}` : bothOf(pair)].filter(Boolean).join(" · ")}`;
}

// The list knows only its own items of a report's workbook, which is enough to build a press's patch and to hold
// the pin limit before the API holds it again.
function knownWorkbook(items: readonly HomePractice[], reportId: string): Workbook {
  const workbook: Workbook = {};
  for (const item of items) {
    if (item.reportId !== reportId) continue;
    if (item.ticked) workbook[item.key] = "ticked";
    if (item.pinned) workbook[pinKey(item.key)] = "pinned";
  }
  return workbook;
}

// Undone gives each key as it stood before the patch, for a press the API refused.
function standing(body: WorkbookPatch, undone: boolean): Record<string, boolean> {
  const set: Record<string, boolean> = {};
  for (const [key, value] of Object.entries(body)) set[key] = undone ? value === null : value !== null;
  return set;
}

function withStanding(home: Home, reportId: string, set: Record<string, boolean>): Home {
  return {
    ...home,
    practising: home.practising.map((item) =>
      item.reportId === reportId
        ? { ...item, ticked: set[item.key] ?? item.ticked, pinned: set[pinKey(item.key)] ?? item.pinned }
        : item,
    ),
  };
}

// Each press goes to the workbook of the item's own report. It shows in GET /home's copy at once and goes back if the
// API refuses it, as a tick in the report does.
function usePracticeStore(items: readonly HomePractice[]): TickStore {
  const client = useQueryClient();
  const { mutateAsync, isPending } = useUpdateReportWorkbook();
  const sending = useRef(0);

  return useMemo(() => {
    const byKey = new Map(items.map((item) => [practiceKey(item), item]));
    const homeKey = getGetHomeQueryKey();

    function send(reportId: string, body: WorkbookPatch) {
      sending.current += 1;
      // A GET /home on its way was read before this press, so it is dropped rather than left to undo it.
      void client
        .cancelQueries({ queryKey: homeKey })
        .then(() => {
          client.setQueryData<Home>(homeKey, (home) => home && withStanding(home, reportId, standing(body, false)));
          return mutateAsync({ id: reportId, data: body });
        })
        .then(
          // A report opened earlier keeps its own copy, and its checklist starts from that copy.
          (merged) => {
            client.setQueryData<Report>(getGetReportQueryKey(reportId), (report) => report && { ...report, workbook: merged });
          },
          () => {
            client.setQueryData<Home>(homeKey, (home) => home && withStanding(home, reportId, standing(body, true)));
          },
        )
        .finally(() => {
          sending.current -= 1;
          // Read again only once the last press has landed, so an earlier answer cannot undo a later press.
          if (sending.current === 0) void client.invalidateQueries({ queryKey: homeKey });
        });
    }

    return {
      ticked: (key) => byKey.get(key)?.ticked ?? false,
      toggle: (key) => {
        const item = byKey.get(key);
        if (item) send(item.reportId, togglePatch(knownWorkbook(items, item.reportId), item.key));
      },
      pinned: (key) => byKey.get(key)?.pinned ?? false,
      // MB-110 provisional: a pin is written to the report's one workbook, so everyone who reads the report
      // shares it, as they share its ticks.
      togglePin: (key) => {
        const item = byKey.get(key);
        const body = item ? pinPatch(knownWorkbook(items, item.reportId), item.key) : null;
        if (item && body) send(item.reportId, body);
        return body !== null;
      },
      saving: isPending,
    };
  }, [items, client, mutateAsync, isPending]);
}

// The sample's action that the home page's first workbook card offers, so the dashboard and the site show the same
// thing to try. Her run and her chart weigh more than the dashboard, so only an empty one loads them.
function useSample(wanted: boolean): ChecklistItem | null {
  const [sample, setSample] = useState<ChecklistItem | null>(null);
  useEffect(() => {
    if (!wanted || sample) return;
    let live = true;
    Promise.all([import("@/site/data/differences"), import("@/site/data/sample")])
      .then(([{ WORKBOOK_CARDS }, { SAMPLE }]) => {
        if (live) setSample({ ...WORKBOOK_CARDS[0].action, label: `Sample · ${SAMPLE.name}` });
      })
      // Without her item the section stays out, rather than a heading over nothing.
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [wanted, sample]);
  return sample;
}

export function Practising({ items }: { items: HomePractice[] }) {
  const id = useId();
  const client = useQueryClient();
  const store = usePracticeStore(items);
  const sample = useSample(items.length === 0);
  // Her ticks are this page's alone and are never sent.
  const [sampleTicks] = useState(localTicks);

  if (items.length === 0) {
    if (!sample) return null;
    return (
      <section aria-labelledby={id} className={SECTION}>
        <h2 id={id} className={HEADING}>What you'll be practising</h2>
        <div className={BARE}>
          <Checklist key="sample" heading="Practice" items={[sample]} store={sampleTicks} />
        </div>
      </section>
    );
  }

  // GET /home's own copy, which the page already holds, for who each pair is with.
  const home = client.getQueryData<Home>(getGetHomeQueryKey());
  const own = home ? ownIds(home) : new Set<string>();
  const list: ChecklistItem[] = items.map((item) => ({
    key: practiceKey(item),
    action: item.action,
    why: item.why ?? undefined,
    label: labelOf(item, home?.pairs ?? [], own),
  }));
  const offered = items.every((item) => item.kind === "natal" && !item.pinned);

  return (
    <section aria-labelledby={id} className={SECTION}>
      <div className="flex items-baseline justify-between gap-2.5">
        <h2 id={id} className={HEADING}>What you're practising</h2>
        <p className="min-w-0 text-xs leading-[1.4] text-[#9AA3B5]">
          {offered ? "From your Closing until you pin your own" : "Pinned by you"}
        </p>
      </div>
      <div className={BARE}>
        <Checklist key="practising" heading="Practice" items={list} store={store} pinnable />
      </div>
    </section>
  );
}

export default Practising;

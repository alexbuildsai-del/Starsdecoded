/**
 * Your pairs (ADR-174): every Compatibility report the reader can open, side by
 * side in one sideways row, each with what comes naturally to the two and the
 * one challenge to work on, read from GET /home so no report loads to draw it.
 * A tap anywhere on a block opens its report.
 */
import { useId } from "react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { getGetHomeQueryKey, type Home, type HomePair } from "@workspace/api-client-react";
import { PairBlock } from "@/components/dashboard/PairBlock";
import { bothOf, otherOf } from "@/components/dashboard/Practising";
import { ownIds } from "@/lib/home-view";
import { first } from "@/lib/share-card";

const HEADING = "font-label text-[11px] font-medium uppercase leading-[1.4] tracking-[.18em] text-[#9AA3B5]";
// A phone sees the next block at its edge and swipes. A wide screen sets three to the row, and a fourth scrolls on,
// where a pointer needs the bar to find it. The scroller clips, so a pixel of padding keeps a focus ring whole.
const ROW =
  "m-0 grid list-none auto-cols-[86%] grid-flow-col gap-2.5 overflow-x-auto p-px pb-1 snap-x snap-mandatory [scrollbar-color:#242C3B_transparent] [scrollbar-width:thin] min-[768px]:auto-cols-[minmax(260px,calc((100%-20px)/3))] max-[767px]:[scrollbar-width:none] max-[767px]:[&::-webkit-scrollbar]:hidden";
const CARD =
  "relative grid min-w-0 snap-start content-start gap-2 rounded-[12px] border border-[#242C3B] bg-[#0D1117] p-3.5 transition-colors duration-200 hover:border-[#9FA8DA]/45 has-[a:focus-visible]:ring-1 has-[a:focus-visible]:ring-ring";

// MB-103 provisional: a pair closed by a stop shows nothing of itself. A failed one, or one without chapter 01 yet,
// has nothing to show; each keeps its row under Compatibility.
function open(pair: HomePair): boolean {
  return !pair.stoppedBy && pair.status !== "failed" && (pair.strong.length > 0 || pair.challenge !== null);
}

function titleOf(pair: HomePair, own: ReadonlySet<string>): string {
  const other = otherOf(pair, own);
  return other ? `You and ${first(other.name)}` : bothOf(pair);
}

export function YourPairs({ pairs }: { pairs: HomePair[] }) {
  const id = useId();
  const client = useQueryClient();
  const shown = pairs.filter(open);
  // As the approved mock leaves Your pairs out before the first pair, a dashboard with none to open shows none.
  if (shown.length === 0) return null;
  // GET /home's own copy, which the page already holds, for who the reader is in each pair.
  const home = client.getQueryData<Home>(getGetHomeQueryKey());
  const own = home ? ownIds(home) : new Set<string>();

  return (
    <section aria-labelledby={id} className="grid min-w-0 gap-2.5">
      <h2 id={id} className={HEADING}>Your pairs</h2>
      <ul className={ROW}>
        {shown.map((pair) => (
          <li key={pair.reportId} className={CARD}>
            <h3 className="font-display text-[18px] leading-[1.25] text-[#E8EBF2]">
              {/* The link's box stretches over the whole block, so a tap anywhere on it opens the report. */}
              <Link href={`/compatibility/${pair.reportId}`} className="outline-hidden after:absolute after:inset-0 after:rounded-[12px]">
                {titleOf(pair, own)}
              </Link>
            </h3>
            <PairBlock pair={pair} compact />
          </li>
        ))}
      </ul>
    </section>
  );
}

export default YourPairs;

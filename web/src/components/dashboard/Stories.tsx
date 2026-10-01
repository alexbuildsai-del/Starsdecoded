/**
 * Share, last on the dashboard (ADR-174, ADR-175): one ready 9:16 story for
 * each pair whose chapter 01 is written, drawn on the reader's device from
 * GET /home's words by the preview chapter 01 shows, so the two never differ
 * and nothing is uploaded. Its look waits for its own session.
 */
import { useId } from "react";
import type { HomePair } from "@workspace/api-client-react";
import { StoryPreview } from "@/components/report/ShareCard";
import { pairStoryText } from "@/lib/share-card";

const HEADING = "font-label text-[11px] font-medium uppercase leading-[1.4] tracking-[.18em] text-[#9575CD]";
// A phone swipes the row and sees the next story at its edge; a pointer on a wide screen needs the bar to find the rest.
// The scroller clips, so a pixel of padding keeps a button's focus ring whole.
const ROW =
  "m-0 grid list-none auto-cols-max grid-flow-col items-end gap-3 overflow-x-auto p-px pb-1 [scrollbar-color:#242C3B_transparent] [scrollbar-width:thin] max-[767px]:[scrollbar-width:none] max-[767px]:[&::-webkit-scrollbar]:hidden";

export function Stories({ pairs }: { pairs: HomePair[] }) {
  const id = useId();
  const stories = pairs.flatMap((pair) => {
    // MB-103 provisional: a pair closed by a stop shows nothing of itself, its story included.
    const text = pair.stoppedBy ? null : pairStoryText(pair);
    return text ? [{ reportId: pair.reportId, text }] : [];
  });
  // As the approved mock leaves Share out before the first pair, a dashboard with no story ready shows none.
  if (stories.length === 0) return null;

  return (
    <section aria-labelledby={id} className="grid min-w-0 gap-2.5">
      <div className="flex items-baseline justify-between gap-2.5">
        <h2 id={id} className={HEADING}>Share</h2>
        <p className="min-w-0 text-xs leading-[1.4] text-[#9AA3B5]">Ready stories</p>
      </div>
      <ul className={ROW}>
        {stories.map(({ reportId, text }) => (
          <li key={reportId} className="min-w-0">
            <StoryPreview text={text} />
          </li>
        ))}
      </ul>
    </section>
  );
}

export default Stories;

/**
 * The aside beside a prose chapter: what to do, and the register that chapter
 * carries. Beside prose, inside a card (ADR-24) — this is the beside half, so
 * it holds a checklist and a short list, and never prose of its own.
 */
import { Checklist, type ChecklistHeading, type ChecklistItem } from "@/components/report/Checklist";
import type { ListedItem } from "@/types/chart";

/** The two registers, each with the label the lock gives it. */
export type RailListHeading = "Career paths" | "You connect best with";

export function ProseRail({
  checklist, listHeading, listItems,
}: {
  checklist?: { heading: ChecklistHeading; items: ChecklistItem[] };
  listHeading?: RailListHeading;
  listItems?: ListedItem[];
}) {
  return (
    <div>
      {checklist && <Checklist heading={checklist.heading} items={checklist.items} />}
      {listHeading && listItems?.length ? (
        <div className="mt-[18px] max-w-[64ch] border-t border-[var(--line-soft)] pt-3">
          <span className="rp-lab">{listHeading}</span>
          <ul className="mt-2 grid gap-2.5">
            {listItems.map((item) => (
              <li key={item.item} className="text-sm leading-[1.55] text-[rgba(232,235,242,.84)]">
                {item.item}
                <span className="text-[var(--paper-dim)]">: {item.reason}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export default ProseRail;

/**
 * The scene and its chip row (ADR-65, ADR-72). A lens chapter carries three
 * curated scenes; the report wrote one, and the other two are one tap away:
 * a tap calls the scene route once, shows a skeleton, then the scene, and a
 * scene already written renders from storage with no call. Print shows the
 * written scene and no chips.
 */
import { useState } from "react";
import { useWriteScene } from "@workspace/api-client-react";
import { ChapterSkeleton } from "@/components/report/ChapterSkeleton";
import type { PairChapterScenes } from "@/types/chart";

export interface SceneChipsProps {
  reportId: string;
  chapter: string;
  scenes: PairChapterScenes;
  /** The scene the report wrote, from the chapter itself. */
  written: string;
}

export function SceneChips({ reportId, chapter, scenes, written }: SceneChipsProps) {
  const [active, setActive] = useState(scenes.written);
  // MB-64 provisional: one write per report, chapter and index; a chip already read is served from here or from storage.
  const [texts, setTexts] = useState<Record<string, string>>(() => ({ ...scenes.texts, [String(scenes.written)]: written }));
  const [pending, setPending] = useState<number | null>(null);
  const [failed, setFailed] = useState<number | null>(null);
  const write = useWriteScene();

  function tap(index: number) {
    setActive(index);
    setFailed(null);
    if (texts[String(index)] !== undefined) return;
    setPending(index);
    write.mutate({ id: reportId, data: { chapter, index } }, {
      onSuccess: (res) => { setTexts((t) => ({ ...t, [String(res.index)]: res.text })); setPending(null); },
      onError: () => { setPending(null); setFailed(index); },
    });
  }

  const text = texts[String(active)];

  return (
    <div className="rp-lblk">
      <span className="rp-lab">The scene · {scenes.titles[active]}</span>
      <div className="print:hidden">
        {text !== undefined
          ? <p className="whitespace-pre-line">{text}</p>
          : failed === active
            ? <p className="text-sm text-[var(--paper-dim)]">This scene could not be written just now. Tap it again in a minute.</p>
            : <ChapterSkeleton lines={4} />}
      </div>
      <p className="hidden print:block whitespace-pre-line">{written}</p>
      <div className="no-print mt-3 flex flex-wrap gap-2" role="tablist" aria-label="Scenes">
        {scenes.titles.map((title, i) => {
          const on = i === active;
          const read = texts[String(i)] !== undefined;
          return (
            <button
              key={title}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => tap(i)}
              disabled={pending !== null && pending !== i}
              className={`rounded-full border px-3 py-1.5 font-label text-[10px] uppercase tracking-[0.18em] transition-colors min-h-[36px] ${
                on ? "border-[var(--accent)] bg-[var(--accent)]/15 text-[var(--paper)]" : "border-[var(--line)] text-[var(--paper-dim)] hover:border-[var(--accent)]"
              }`}
            >
              {title}{i === scenes.written ? " · written" : read ? " · read" : pending === i ? " · writing" : ""}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default SceneChips;

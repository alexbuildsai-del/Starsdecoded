/**
 * "How to read the wheel" (annex /sky): four parts, each lighting its layer on
 * hover, and on tap until tapped again. The guide draws its own copy of the
 * page's wheel beside the words: by the time a reader reaches it, the wheel in
 * the first screen is above them, and on a phone far above. A chart with no
 * time has no houses or horizon to light, and those two parts say so.
 */
import { useState } from "react";
import { Link } from "wouter";
import { HorizonWheel, type WheelLayer } from "@/site/components/HorizonWheel";
import type { Sky } from "@/site/lib/sky";

interface Part {
  layer: WheelLayer;
  lead: string;
  rest: string;
  needsTime: boolean;
}

const PARTS: readonly Part[] = [
  { layer: "signs", lead: "The outer ring", rest: "is the zodiac, twelve signs of 30° each.", needsTime: false },
  { layer: "houses", lead: "The ring inside it", rest: "is the twelve houses, counted from the rising sign.", needsTime: true },
  { layer: "horizon", lead: "The line across", rest: "is the horizon at that moment, with east on the left.", needsTime: true },
  { layer: "bodies", lead: "Each planet", rest: "sits at its exact degree. Point at one to see where it is.", needsTime: false },
];

const ITEM = "block w-full border-l-2 border-[color:var(--line)] px-3.5 py-2.5 text-left text-[15px] leading-normal text-[color:var(--paper-dim)]";

export function ReadTheWheel({ sky }: { sky: Sky }) {
  const [hover, setHover] = useState<WheelLayer | null>(null);
  const [pressed, setPressed] = useState<WheelLayer | null>(null);
  const drawn = sky.chart.angles !== undefined;
  const can = (layer: WheelLayer | null) => layer !== null && (drawn || !PARTS.some((p) => p.layer === layer && p.needsTime));
  const wanted = hover ?? pressed;
  const lit = can(wanted) ? wanted : null;

  return (
    <div className="grid content-start gap-3.5">
      <h3 className="text-2xl leading-tight">How to read the wheel</h3>
      {/* The page's wheel already speaks to a screen reader and the table lists the same facts, so this copy is only seen. */}
      <div
        aria-hidden="true"
        className="relative mx-5 my-1 w-[min(100%_-_40px,300px)] [&_.sd-hz-l]:left-[-20px] [&_.sd-hz-r]:right-[-20px] [&_.sd-hz_b]:hidden"
      >
        <HorizonWheel sky={sky} lit={lit} />
      </div>
      <ol className="m-0 grid list-none gap-1 p-0">
        {PARTS.map((part) =>
          drawn || !part.needsTime ? (
            <li key={part.layer}>
              <button
                type="button"
                aria-pressed={pressed === part.layer}
                onPointerEnter={() => setHover(part.layer)}
                onPointerLeave={() => setHover(null)}
                onClick={() => setPressed((was) => (was === part.layer ? null : part.layer))}
                className={`${ITEM} cursor-pointer bg-transparent transition-colors duration-200 hover:border-[color:var(--indigo-lt)] hover:bg-[rgba(92,107,192,.07)] focus-visible:border-[color:var(--indigo-lt)] focus-visible:bg-[rgba(92,107,192,.07)] aria-pressed:border-[color:var(--indigo-lt)] aria-pressed:bg-[rgba(92,107,192,.07)]`}
              >
                <b className="font-medium text-[color:var(--paper)]">{part.lead}</b> {part.rest}
              </button>
            </li>
          ) : (
            <li key={part.layer} className={ITEM}>
              <b className="font-medium text-[color:var(--paper)]">{part.lead}</b> {part.rest}{" "}
              <span className="text-[color:var(--sd-muted)]">Add a birth time to see it.</span>
            </li>
          ),
        )}
      </ol>
      <p className="text-[13px] text-[color:var(--sd-muted)]">
        Houses here are whole sign. <Link href="/learn/whole-sign-houses">What whole-sign houses are</Link>
      </p>
    </div>
  );
}

export default ReadTheWheel;

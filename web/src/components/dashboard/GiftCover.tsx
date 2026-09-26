/**
 * How a gift arrives (ADR-128): the starfield and the mark, "A gift from
 * {giver}", "Your Personal natal report, for {name}" and the note. The giver
 * sees it under "How it arrives" before sending, and the claim page shows the
 * same cover, so both import this one component.
 *
 * The art is the image `pnpm brand:render` writes for the email, and it
 * carries no words: names and notes differ per gift, so they are set here as
 * live text, kept left of the mark and below it. While the image loads, or if
 * it fails, the same art drawn in SVG stands behind it.
 */
import { useId, useState } from "react";
import { PERSONAL_REPORT, PRODUCT } from "@/lib/product";
import { cn } from "@/lib/utils";

export interface GiftCoverProps {
  /** The giver's first name; without one the eyebrow reads "A gift". */
  giverName?: string | null;
  recipientName?: string | null;
  note?: string | null;
  className?: string;
}

const COVER_ART = `${import.meta.env.BASE_URL}gift-cover.png`;

// The rendered image's frame and geometry (scripts/render-brand.mjs), so the
// drawn stand-in is the same picture and nothing jumps when the image arrives.
const W = 1120;
const H = 694;
const MARK = { cx: 830, cy: 347, r: 120, ring: 13, line: 11, point: 21 };
const STARS = Array.from({ length: 90 }, (_, i) => {
  const d = i % 9 === 0 ? 3.2 : 1.6;
  return {
    cx: ((i * 87.3) % W) + d / 2,
    cy: ((i * 53.7 + (i % 7) * 31) % H) + d / 2,
    r: d / 2,
    o: 0.16 + (i % 5) * 0.12,
  };
});

function CoverArt() {
  const raw = useId();
  const id = `${raw.replace(/[^a-zA-Z0-9_-]/g, "")}-sky`;
  const [artMissing, setArtMissing] = useState(false);
  return (
    <>
      <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-x-0 top-0 h-auto w-full">
        <defs>
          <radialGradient id={id} cx="0.74" cy="0.32" r="0.8">
            <stop offset="0" stopColor="#1B2340" />
            <stop offset="0.55" stopColor="#0D1117" />
            <stop offset="1" stopColor="#06080C" />
          </radialGradient>
        </defs>
        <rect width={W} height={H} fill={`url(#${id})`} />
        {STARS.map((s, i) => (
          <circle key={i} cx={s.cx.toFixed(1)} cy={s.cy.toFixed(1)} r={s.r} fill="#E8EBF2" opacity={s.o.toFixed(2)} />
        ))}
        <g opacity="0.95">
          <circle cx={MARK.cx} cy={MARK.cy} r={MARK.r} fill="none" stroke="#7C83D4" strokeWidth={MARK.ring} />
          <line
            x1={MARK.cx - MARK.r}
            y1={MARK.cy}
            x2={MARK.cx + MARK.r}
            y2={MARK.cy}
            stroke="#7C83D4"
            strokeWidth={MARK.line}
            strokeLinecap="round"
          />
          <circle cx={MARK.cx - MARK.r} cy={MARK.cy} r={MARK.point} fill="#D4B06A" />
        </g>
      </svg>
      {!artMissing && (
        <img
          src={COVER_ART}
          alt=""
          decoding="async"
          onError={() => setArtMissing(true)}
          className="absolute inset-x-0 top-0 h-auto w-full"
        />
      )}
    </>
  );
}

export function GiftCover({ giverName, recipientName, note, className }: GiftCoverProps) {
  const giver = giverName?.trim();
  const recipient = recipientName?.trim();
  const words = note?.trim();
  return (
    <div
      className={cn(
        "@container relative isolate flex aspect-[1120/694] w-full flex-col rounded-xl text-left",
        className,
      )}
    >
      {/* A long note makes the cover taller than the art; the void fills the rest, so the picture is never stretched or cropped. */}
      <div aria-hidden="true" className="absolute inset-0 -z-10 overflow-hidden rounded-[inherit] bg-[#06080C]">
        <CoverArt />
      </div>
      <div className="flex flex-1 flex-col px-[6.7cqw] pb-[5cqw] pt-[8.5cqw]">
        {/* The mark's point sits at 61% across and its ring ends 42cqw down: the words stay left of it, the note below it. */}
        <div className="min-h-[35cqw] max-w-[51cqw]">
          <p className="font-label text-[length:clamp(9.5px,2.2cqw,13px)] font-medium uppercase leading-[1.2] tracking-[0.27em] text-brass [overflow-wrap:anywhere]">
            {giver ? `A gift from ${giver}` : "A gift"}
          </p>
          <p className="mt-[7cqw] font-display text-[length:clamp(22px,7.3cqw,44px)] leading-[1.09] tracking-[-0.01em] text-foreground">
            Your {PERSONAL_REPORT}
          </p>
          {recipient && (
            <p className="mt-[1.8cqw] font-display text-[length:clamp(13px,3.7cqw,22px)] italic leading-[1.2] text-foreground/70 [overflow-wrap:anywhere]">
              for {recipient}
            </p>
          )}
        </div>
        <div className="mt-auto pt-[4cqw]">
          {words && (
            <p className="whitespace-pre-line text-[length:clamp(12px,2.5cqw,16px)] leading-[1.45] text-foreground/85 [overflow-wrap:anywhere]">
              “{words}”
            </p>
          )}
          <p className="mt-[2cqw] font-label text-[length:clamp(9px,1.85cqw,11px)] uppercase tracking-[0.18em] text-muted-foreground">
            {PRODUCT}
          </p>
        </div>
      </div>
    </div>
  );
}

export default GiftCover;

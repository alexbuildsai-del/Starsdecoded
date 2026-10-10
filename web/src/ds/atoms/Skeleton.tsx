import { cn } from "@/lib/utils";

const WIDTHS = ["100%", "92%", "96%", "78%", "58%"];

export interface SkeletonProps {
  lines?: 4 | 5;
  /** The caption under the lines; it is also the accessible name. */
  caption: string;
  className?: string;
}

/**
 * A chapter not yet landed looks like one (ADR-47): rounded lines with a slow
 * sweep of light and a breath of opacity. The keyframes are index.css's
 * rp-breath and rp-sweep; reduced motion leaves the lines still.
 */
export function Skeleton({ lines = 5, caption, className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "grid max-w-[64ch] gap-3 motion-safe:animate-[rp-breath_3.2s_cubic-bezier(.16,1,.3,1)_infinite]",
        className,
      )}
      aria-busy="true"
      aria-label={caption}
    >
      {Array.from({ length: lines }, (_, i) => (
        <i
          key={i}
          aria-hidden
          className="relative block h-[13px] overflow-hidden rounded-[7px] bg-[rgba(232,235,242,.07)] after:absolute after:inset-0 after:-translate-x-full after:bg-[linear-gradient(90deg,transparent,rgba(232,235,242,.12),transparent)] motion-safe:after:animate-[rp-sweep_2.6s_linear_infinite] motion-reduce:after:hidden"
          style={{ width: WIDTHS[i] }}
        />
      ))}
      <span className="mt-1 font-label text-[10px] uppercase tracking-[.2em] text-[#6E7789]">{caption}</span>
    </div>
  );
}

export default Skeleton;

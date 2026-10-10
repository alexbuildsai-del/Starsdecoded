/**
 * Ask's mark (Timeline's Ask): our ring and horizon with the brass Ascendant
 * (docs/specs/locked/logo.md), the ring opened into a speech bubble, and the
 * name in Newsreader italic, the one place the product sets it so. The ring
 * and the name take currentColor, so the mark reads on the dark pages and on
 * the indigo launcher alike; the point stays brass, as it is measured geometry
 * (§9). `size` is the mark's, and the name grows with it.
 */
export function AskMark({ size = 22 }: { size?: number }) {
  return (
    <span
      className="inline-flex items-center gap-[0.35em] font-display font-normal italic leading-none"
      style={{ fontSize: Math.round(10 + size * 0.46) }}
    >
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="block flex-none">
        <path
          d="M7.25 20.23A9.5 9.5 0 1 0 3.77 16.75L2.4 21.6Z"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.4}
          strokeLinejoin="round"
        />
        <line x1={2.5} y1={12} x2={21.5} y2={12} stroke="currentColor" strokeWidth={1.4} />
        <circle cx={2.8} cy={12} r={2.2} className="fill-brass" />
      </svg>
      Ask
    </span>
  );
}

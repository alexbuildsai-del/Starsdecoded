/**
 * A chapter not yet landed looks like one (ADR-47): four to five rounded lines
 * with a slow sweep of light and a breath of opacity, above the caption.
 */
export function ChapterSkeleton({ lines = 5 }: { lines?: 4 | 5 }) {
  return (
    <div className="rp-skel" aria-busy="true" aria-label="Still writing this chapter">
      {Array.from({ length: lines }, (_, i) => <i key={i} aria-hidden />)}
      <span className="cap">Still writing this chapter</span>
    </div>
  );
}

export default ChapterSkeleton;

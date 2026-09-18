// The wheel, its horizon line, and the Ascendant as a point at the eastern
// end (docs/specs/locked/logo.md). The ring takes currentColor so one
// component serves the nav, the print header and any one-colour surface;
// the point is brass because the Ascendant is measured geometry (§9).
export function Mark({
  className,
  point = "#D4B06A",
  title,
}: {
  className?: string;
  point?: string;
  title?: string;
}) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      fill="none"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
    >
      {title ? <title>{title}</title> : null}
      <circle cx="32" cy="32" r="24" stroke="currentColor" strokeWidth="2.6" />
      <line x1="8" y1="32" x2="56" y2="32" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="8" cy="32" r="4.2" fill={point} />
    </svg>
  );
}

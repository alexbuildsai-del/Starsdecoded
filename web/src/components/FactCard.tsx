/**
 * A Did you know card (ADR-377, 383): an idea the report is not read by, kept outside the prose in a small card of its
 * own. Words only, with no bar and no drawing; the loading screens' version of it rotates, this one stays still.
 */
export interface FactCardProps {
  title: string;
  body: string;
  className?: string;
}

export function FactCard({ title, body, className }: FactCardProps) {
  return (
    <section
      aria-label="Did you know"
      className={`flex max-w-[64ch] flex-col gap-2 rounded-card border border-line bg-surface px-4 py-3.5 text-left max-sm:px-3.5${className ? ` ${className}` : ""}`}
      data-testid="fact-card"
    >
      <span className="font-label text-label uppercase text-brass">Did you know</span>
      <h3 className="font-display text-card-title max-sm:text-card-title-sm text-paper">{title}</h3>
      <p className="text-ui text-paper-dim max-sm:text-small">{body}</p>
    </section>
  );
}

export default FactCard;

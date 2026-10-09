/**
 * A Did you know card (ADR-377, 383): an idea the report is not read by, kept outside the prose in a small card of its
 * own. Words only, with no bar and no drawing; the loading screens' version of it rotates, this one stays still.
 */
import { cn } from "@/lib/utils";

export interface FactCardProps {
  title: string;
  body: string;
  className?: string;
}

export function FactCard({ title, body, className }: FactCardProps) {
  return (
    <section
      aria-label="Did you know"
      className={cn("flex max-w-[64ch] flex-col gap-2 rounded-xl border border-[#242C3B] bg-[#11161F] px-4 py-3.5 text-left max-sm:px-3.5", className)}
      data-testid="fact-card"
    >
      <span className="font-label text-[11px] font-medium uppercase leading-[1.4] tracking-[.14em] text-[#D4B06A]">Did you know</span>
      <h3 className="font-display text-[19px] font-normal leading-tight text-[#E8EBF2] max-sm:text-[17px]">{title}</h3>
      <p className="text-[14.5px] leading-relaxed text-[#AEB6C6] max-sm:text-[13.5px]">{body}</p>
    </section>
  );
}

export default FactCard;

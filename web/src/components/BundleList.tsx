/**
 * The bundles in one look wherever a price shows: the site's prices, the credits sheet and the dashboard's first state
 * (ADR-168 to 170, 172). Every name, line, number and mix comes from the catalogue through `bundleRows` (R-6.3), and a
 * launch price stands against the struck Singles total, never a "was" price and never with an end date (R-6.7). Nothing
 * here buys: each surface puts its own action under the list.
 */
import { Fragment } from "react";
import { CREDIT_LINE } from "@workspace/commerce";
import { CreditDots } from "@/components/dashboard/CreditPill";
import { bundleRows, type BundleMix, type BundleRow } from "@/lib/credits-view";
import { cn } from "@/lib/utils";

export interface BundleListProps {
  /** The dashboard's density: the same rows, tighter, with the mixes across the whole row. */
  compact?: boolean;
}

const ROWS = bundleRows();

// Colours are the tokens' own values, since the list draws inside the site's token scope and in the app's sheets, which
// are portalled outside it. The two kinds of report chip take the Review 01/10 artifact's colours.
const CHIP: Record<BundleMix["kind"], string> = {
  personal: "border-[#2F4A7A] text-[#A9C6EE]",
  compatibility: "border-[#4A3A6E] text-[#C7B4EE]",
};

// The foot is a label in capitals, so the sentence's full stop gives way to the separator.
const CREDIT_LABEL = CREDIT_LINE.replace(/\.$/, "");

function Mixes({ row, className }: { row: BundleRow; className?: string }) {
  return (
    <p className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {row.mixes.map((mix, i) => (
        <Fragment key={mix.text}>
          {i > 0 &&
            (row.either ? (
              <span className="text-xs text-[#7E889A]">or</span>
            ) : (
              <span className="sr-only">{" and "}</span>
            ))}
          <span
            className={cn(
              "inline-flex items-center whitespace-nowrap rounded-full border px-[9px] py-1.5 font-label text-[11.5px] font-medium leading-none",
              CHIP[mix.kind],
            )}
          >
            {mix.text}
          </span>
        </Fragment>
      ))}
    </p>
  );
}

function Row({ row, compact }: { row: BundleRow; compact: boolean }) {
  const Name = compact ? "p" : "h3";
  const mixes = <Mixes row={row} className={compact ? "col-span-2" : "mt-2"} />;
  return (
    <li
      className={cn(
        "grid grid-cols-[minmax(0,1fr)_auto] items-center border-t border-[#242C3B] first:border-t-0",
        compact ? "gap-x-3 gap-y-2.5 px-4 py-3.5" : "gap-x-4 gap-y-1.5 px-[22px] py-5",
      )}
    >
      {/* A screen reader meets each bundle by its name, then its launch chip and its line, and the price before the
          struck total: the chip and the total are only drawn above them. */}
      <div className="flex min-w-0 flex-col">
        <Name
          className={cn(
            "mt-1.5 font-display font-normal leading-[1.2] tracking-[-0.01em] text-[#E8EBF2]",
            compact ? "text-xl" : "text-2xl",
          )}
        >
          {row.name}
        </Name>
        <div className="order-first flex flex-wrap items-center gap-2">
          <CreditDots count={row.credits} />
          {row.launch && (
            <span className="inline-flex items-center whitespace-nowrap rounded-full border border-[#5A4C2C] px-2 py-[5px] font-label text-[10px] font-medium uppercase leading-none tracking-[.14em] text-[#D4B06A]">
              Launch price
            </span>
          )}
        </div>
        <p className="mt-1 text-[13px] leading-snug text-[#AEB6C6]">{row.line}</p>
        <p className="mt-0.5 text-[13px] leading-snug text-[#AEB6C6]">{row.count}</p>
        {!compact && mixes}
      </div>
      <p className="flex flex-col items-end gap-0.5 text-right">
        <span className={cn("font-label font-medium leading-none text-[#F2F4F9]", compact ? "text-[22px]" : "text-[26px]")}>
          {row.price}
        </span>
        {row.singles && (
          <s className="order-first whitespace-nowrap font-numeric text-[13px] leading-snug text-[#7E889A]">{row.singles}</s>
        )}
        {row.save && <span className="whitespace-nowrap text-xs leading-snug text-[#3FA796]">{row.save}</span>}
      </p>
      {compact && mixes}
    </li>
  );
}

export function BundleList({ compact = false }: BundleListProps) {
  return (
    <div
      className={cn(
        "overflow-hidden border border-[#242C3B] bg-[rgba(17,22,31,.62)]",
        compact ? "rounded-[14px]" : "rounded-[18px]",
      )}
    >
      <ul>
        {ROWS.map((row) => (
          <Row key={row.id} row={row} compact={compact} />
        ))}
      </ul>
      <p
        className={cn(
          "border-t border-[#242C3B] font-numeric uppercase leading-relaxed tracking-[.1em] text-[#7E889A]",
          compact ? "px-4 py-3 text-[11px]" : "px-[22px] py-3.5 text-xs",
        )}
      >
        {CREDIT_LABEL} · <span className="whitespace-nowrap">VAT included</span>
      </p>
    </div>
  );
}

export default BundleList;

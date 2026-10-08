/**
 * The bundles in one look wherever a price shows: the site's prices, the credits sheet and the dashboard's first visit
 * (ADR-168 to 170, 172). Every name, line, number and mix comes from the catalogue through `bundleRows` (R-6.3), and a
 * launch price stands against the struck Singles total, never a "was" price and never with an end date (R-6.7). A live
 * campaign the server prices for this visit takes its row's price instead (reading 6). The site's list buys nothing; in
 * the credits sheet each row is the way to checkout for its bundle, and on the first visit each bundle is a button
 * (Review 05/10 §1) that prices it the same way.
 */
import { Fragment, useMemo, type ReactNode } from "react";
import { Link } from "wouter";
import type { PriceItem } from "@workspace/api-client-react";
import { CREDIT_LINE, type BundleId } from "@workspace/commerce";
import { CreditDots } from "@/components/dashboard/CreditPill";
import { useEntryFormat } from "@/hooks/useEntryFormat";
import { bundleRows, type BundleMix, type BundleRow } from "@/lib/credits-view";
import { cn } from "@/lib/utils";

export interface BundleListProps {
  /** The dashboard's density: the same rows, tighter, with the mixes across the whole row. */
  compact?: boolean;
  /** `usePrices().items`: a live campaign shows on its row; null or left out keeps the catalogue's, as the prerender does. */
  prices?: readonly PriceItem[] | null;
  /** Each row's checkout; left out, the rows only show the prices. */
  buy?: (id: BundleId) => string;
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

const STRUCK = "order-first whitespace-nowrap font-numeric text-[13px] leading-snug text-[#7E889A]";
const FOOT = "font-numeric uppercase leading-relaxed tracking-[.1em] text-[#7E889A]";

function FootWords() {
  return (
    <>
      {CREDIT_LABEL} · <span className="whitespace-nowrap">VAT included</span>
    </>
  );
}

/** The price column every bundle shows; a span inside a button, which may hold no paragraph. */
function Price({ row, compact, as: Tag = "p" }: { row: BundleRow; compact: boolean; as?: "p" | "span" }) {
  return (
    <Tag className="flex flex-col items-end gap-0.5 text-right">
      <span className={cn("font-label font-medium leading-none text-[#F2F4F9]", compact ? "text-[22px]" : "text-[26px]")}>
        {row.price}
      </span>
      {row.campaign ? (
        <>
          {/* Strikethrough is only drawn, so a screen reader is told which price the struck one was. */}
          <s className={STRUCK}>
            <span className="sr-only">instead of </span>
            {row.campaign.full}
          </s>
          <span className="whitespace-nowrap text-xs leading-snug text-[#AEB6C6]">{row.campaign.until}</span>
        </>
      ) : (
        <>
          {row.singles && <s className={STRUCK}>{row.singles}</s>}
          {row.save && <span className="whitespace-nowrap text-xs leading-snug text-[#3FA796]">{row.save}</span>}
        </>
      )}
    </Tag>
  );
}

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

function Row({ row, compact, href }: { row: BundleRow; compact: boolean; href: string | null }) {
  const Name = compact ? "p" : "h3";
  const mixes = <Mixes row={row} className={compact ? "col-span-2" : "mt-2"} />;
  return (
    <li
      className={cn(
        "grid grid-cols-[minmax(0,1fr)_auto] items-center border-t border-[#242C3B] first:border-t-0",
        compact ? "gap-x-3 gap-y-2.5 px-4 py-3.5" : "gap-x-4 gap-y-1.5 px-[22px] py-5",
        href &&
          "relative transition-colors duration-200 hover:bg-[rgba(92,107,192,.08)] has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-inset has-[a:focus-visible]:ring-ring",
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
          {href ? (
            // The link's box stretches over the whole row, so a tap anywhere on it starts that bundle's checkout.
            <Link href={href} className="outline-hidden after:absolute after:inset-0">
              <span className="sr-only">Buy </span>
              {row.name}
            </Link>
          ) : (
            row.name
          )}
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
        {row.lead && <p className="mt-0.5 text-[13px] leading-snug text-[#AEB6C6]">{row.lead}</p>}
        {!compact && mixes}
      </div>
      <Price row={row} compact={compact} />
      {compact && mixes}
    </li>
  );
}

/** Until the prices load, and on any refusal, the rows are the prerendered ones, so hydration finds what it drew. */
function useRows(prices: readonly PriceItem[] | null): BundleRow[] {
  const { order } = useEntryFormat();
  return useMemo(() => (prices ? bundleRows(prices, order) : ROWS), [prices, order]);
}

export function BundleList({ compact = false, prices = null, buy }: BundleListProps) {
  const rows = useRows(prices);
  return (
    <div
      className={cn(
        "overflow-hidden border border-[#242C3B] bg-[rgba(17,22,31,.62)]",
        compact ? "rounded-[14px]" : "rounded-[18px]",
      )}
    >
      <ul>
        {rows.map((row) => (
          <Row key={row.id} row={row} compact={compact} href={buy ? buy(row.id) : null} />
        ))}
      </ul>
      <p className={cn("border-t border-[#242C3B]", FOOT, compact ? "px-4 py-3 text-[11px]" : "px-[22px] py-3.5 text-xs")}>
        <FootWords />
      </p>
    </div>
  );
}

export type BundleButtonsProps = {
  /** As the list's: a live campaign shows on its button; null keeps the catalogue's prices. */
  prices?: readonly PriceItem[] | null;
  /** The line under each name, the first visit's own words rather than the catalogue's. */
  lines: Readonly<Record<BundleId, string>>;
} & (
  /** Each button's checkout. */
  | { buy: (id: BundleId) => string; onPick?: never }
  /** A tap is handed back and opens nothing, as in the admin's preview (reading 21). */
  | { onPick: (id: BundleId) => void; buy?: never }
);

const BUTTON =
  "grid min-h-[68px] w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 rounded-[12px] border border-[#242C3B] bg-[#11161F] px-3.5 py-3 text-left transition-colors duration-200 hover:border-[#5C6BC0] focus-visible:border-[#5C6BC0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[.99] motion-reduce:active:scale-100";

/**
 * The first visit's three buttons (Review 05/10 §1): each bundle its own box of one width and height, its name and line
 * on the left and its price on the right, priced as the list prices it, over the list's foot. A tap opens that bundle's
 * checkout, which comes back to the birth form for You.
 */
export function BundleButtons({ prices = null, lines, buy, onPick }: BundleButtonsProps) {
  const rows = useRows(prices);
  return (
    <div className="grid gap-2.5">
      <ul className="grid gap-2">
        {rows.map((row) => {
          const face: ReactNode = (
            <>
              <span className="grid min-w-0 gap-1">
                <span className="font-display text-xl font-normal leading-[1.15] tracking-[-0.01em] text-[#E8EBF2]">
                  {buy && <span className="sr-only">Buy </span>}
                  {row.name}
                </span>
                <span className="text-[13px] leading-snug text-[#AEB6C6]">{lines[row.id]}</span>
              </span>
              <Price row={row} compact as="span" />
            </>
          );
          return (
            <li key={row.id}>
              {buy ? (
                <Link href={buy(row.id)} className={BUTTON}>
                  {face}
                </Link>
              ) : (
                <button type="button" onClick={() => onPick?.(row.id)} className={BUTTON}>
                  {face}
                </button>
              )}
            </li>
          );
        })}
      </ul>
      <p className={cn(FOOT, "text-[11px]")}>
        <FootWords />
      </p>
    </div>
  );
}

export default BundleList;

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
import { Chip } from "@/ds/atoms/Chip";
import { TextButton } from "@/ds/atoms/TextButton";
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

// The two kinds of report keep two edges, from the chapter hues, so a bundle's mix reads at a glance.
const CHIP: Record<BundleMix["kind"], string> = {
  personal: "border-chapter-2/70",
  compatibility: "border-violet/70",
};

// The foot is a label in capitals, so the sentence's full stop gives way to the separator.
const CREDIT_LABEL = CREDIT_LINE.replace(/\.$/, "");

const STRUCK = "order-first whitespace-nowrap font-numeric text-small leading-snug text-muted";
const FOOT = "font-numeric uppercase leading-relaxed tracking-[.1em] text-muted";

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
      <span className={cn("font-label font-medium leading-none text-paper", compact ? "text-card-title" : "text-stat")}>
        {row.price}
      </span>
      {row.campaign ? (
        <>
          {/* Strikethrough is only drawn, so a screen reader is told which price the struck one was. */}
          <s className={STRUCK}>
            <span className="sr-only">instead of </span>
            {row.campaign.full}
          </s>
          <span className="whitespace-nowrap text-caption leading-snug text-paper-dim">{row.campaign.until}</span>
        </>
      ) : (
        <>
          {row.singles && <s className={STRUCK}>{row.singles}</s>}
          {row.save && <span className="whitespace-nowrap text-caption leading-snug text-teal">{row.save}</span>}
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
              <span className="text-caption text-muted">or</span>
            ) : (
              <span className="sr-only">{" and "}</span>
            ))}
          <Chip quiet className={CHIP[mix.kind]}>
            {mix.text}
          </Chip>
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
        "grid grid-cols-[minmax(0,1fr)_auto] items-center border-t border-line first:border-t-0",
        compact ? "gap-x-3 gap-y-2.5 px-4 py-3.5" : "gap-x-4 gap-y-1.5 px-[22px] py-5",
        href &&
          "relative transition-colors duration-[var(--dur-fast)] hover:bg-indigo-tint has-[a:focus-visible]:outline-2 has-[a:focus-visible]:-outline-offset-2 has-[a:focus-visible]:outline-solid has-[a:focus-visible]:outline-focus motion-reduce:transition-none",
      )}
    >
      {/* A screen reader meets each bundle by its name, then its launch chip and its line, and the price before the
          struck total: the chip and the total are only drawn above them. */}
      <div className="flex min-w-0 flex-col">
        <Name
          className={cn(
            "mt-1.5 font-display font-normal text-paper",
            compact ? "text-card-title" : "text-sheet-title",
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
            <Chip tone="brass">Launch price</Chip>
          )}
        </div>
        <p className="mt-1 text-small leading-snug text-paper-dim">{row.line}</p>
        {row.lead && <p className="mt-0.5 text-small leading-snug text-paper-dim">{row.lead}</p>}
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
        "overflow-hidden border border-line bg-surface-glass",
        compact ? "rounded-card" : "rounded-sheet",
      )}
    >
      <ul>
        {rows.map((row) => (
          <Row key={row.id} row={row} compact={compact} href={buy ? buy(row.id) : null} />
        ))}
      </ul>
      <p className={cn("border-t border-line", FOOT, compact ? "px-4 py-3 text-data-sm" : "px-[22px] py-3.5 text-data")}>
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
  "grid min-h-[68px] px-3.5 after:hidden w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 rounded-card border border-line bg-surface py-3 text-left transition-colors duration-[var(--dur-fast)] hover:border-indigo focus-visible:border-indigo focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-focus active:scale-[.99] motion-reduce:transition-none motion-reduce:active:scale-100";

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
                <span className="font-display text-card-title font-normal text-paper">
                  {buy && <span className="sr-only">Buy </span>}
                  {row.name}
                </span>
                <span className="text-small leading-snug text-paper-dim">{lines[row.id]}</span>
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
                <TextButton onClick={() => onPick?.(row.id)} className={BUTTON}>
                  {face}
                </TextButton>
              )}
            </li>
          );
        })}
      </ul>
      <p className={cn(FOOT, "text-data-sm")}>
        <FootWords />
      </p>
    </div>
  );
}

export default BundleList;

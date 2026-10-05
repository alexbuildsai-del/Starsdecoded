import { useEffect } from "react";
import type { PriceItem } from "@workspace/api-client-react";
import { BundleList } from "@/components/BundleList";
import { usePrices } from "@/lib/prices";
import { ReportCta } from "../cta";

const euros = (cents: number) => `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, "0")}`;

/**
 * The home page's own Offers take a live campaign's price and its last day once the prices have loaded; the prerendered
 * JSON-LD stays at full price, so a campaign never needs a rebuild. Only the home page's Product carries bundles' Offers,
 * and a page that has none is left alone (R16-14).
 */
function stampCampaigns(items: PriceItem[]): void {
  const live = items.filter((item) => item.kind === "bundle" && item.campaign && item.cents < item.fullCents);
  if (!live.length) return;
  for (const script of document.querySelectorAll('script[type="application/ld+json"]')) {
    let block: { "@type"?: string; offers?: Array<Record<string, unknown>> };
    try {
      block = JSON.parse(script.textContent ?? "");
    } catch {
      continue;
    }
    if (block["@type"] !== "Product" || !Array.isArray(block.offers)) continue;
    let changed = false;
    for (const offer of block.offers) {
      const item = live.find((one) => one.name === offer.name);
      if (!item?.campaign) continue;
      offer.price = euros(item.cents);
      offer.priceValidUntil = item.campaign.endsOn;
      changed = true;
    }
    if (changed) script.textContent = JSON.stringify(block);
  }
}

/**
 * The three bundles from the one catalogue, above the questions (ADR-118, R-6.3), drawn by the list the credits sheet
 * draws so the buyer meets the same rows again (ADR-172): Couple and Family & friends at a launch price against the struck
 * Singles total (ADR-168, 169); a live campaign shows after load, with its last day once, and on any refusal the prerendered
 * prices stay (MB-149 provisional, reading 6). The list's foot says what a credit buys, so the
 * lede doesn't say it twice (ADR-170). Nothing is bought here: the one button is Get my report, which opens the waitlist
 * before launch and the birth form after it (reading 13).
 */
export default function Pricing() {
  const { items } = usePrices();
  useEffect(() => {
    if (items) stampCampaigns(items);
  }, [items]);

  return (
    <section className="sd-sec sd-sec-b sd-line" id="price" aria-labelledby="price-h">
      <div className="sd-wrap grid gap-8 min-[900px]:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] min-[900px]:items-start min-[900px]:gap-14">
        <div className="sd-shead mb-0">
          <p className="sd-eyebrow">Prices</p>
          <h2 className="sd-h2" id="price-h">
            What a report costs
          </h2>
          <p className="sd-sub">You pay once for each report.</p>
        </div>
        <div className="max-w-[620px]">
          <BundleList />
          <div className="mt-6 flex">
            <ReportCta source="pricing" className="sd-btn" />
          </div>
        </div>
      </div>
    </section>
  );
}

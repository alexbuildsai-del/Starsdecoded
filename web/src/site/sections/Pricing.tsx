import { BundleList } from "@/components/BundleList";
import { ReportCta } from "../cta";

/**
 * The three bundles from the one catalogue, above the questions (ADR-118, R-6.3), drawn by the list the credits sheet
 * draws so the buyer meets the same rows again (ADR-172): Couple and Family & friends at a launch price against the struck
 * Singles total, with no end date until the Owner sets one (ADR-168, 169). The list's foot says what a credit buys, so the
 * lede doesn't say it twice (ADR-170). Nothing is bought here: the one button is Get my report, which opens the waitlist
 * before launch and the birth form after it (reading 13).
 */
export default function Pricing() {
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

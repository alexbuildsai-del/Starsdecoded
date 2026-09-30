import { BUNDLES, formatEuro } from "@workspace/commerce";
import { CreditDots } from "@/components/dashboard/CreditPill";
import { COMPATIBILITY_REPORT, PERSONAL_REPORT } from "@/lib/product";
import { ReportCta } from "../cta";

/**
 * The three bundles from the one catalogue, above the questions (ADR-118, ADR-142, R-6.3), drawn as the credits sheet
 * draws them so the buyer meets the same rows again. Nothing is bought here: the one button is Get my report, which
 * opens the waitlist before launch and the birth form after it (reading 13). Offers are R12's, and never counted down
 * (ADR-146).
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
          <p className="sd-sub">
            You pay once, with no subscription. Each report uses one credit, whether it's a {PERSONAL_REPORT} or a{" "}
            {COMPATIBILITY_REPORT}.
          </p>
        </div>
        <div>
          <ul className="divide-y divide-[color:var(--line-soft)] rounded-[18px] border border-[color:var(--line)] bg-[rgba(17,22,31,.62)]">
            {BUNDLES.map((bundle) => (
              <li
                key={bundle.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-6 gap-y-2 px-5 py-5 min-[560px]:px-6"
              >
                <CreditDots count={bundle.credits} className="col-start-1 row-start-1" />
                <h3 className="col-start-1 row-start-2 text-[26px] leading-tight">{bundle.name}</h3>
                <p className="sd-mono col-start-2 row-span-3 row-start-1 text-[26px] leading-none text-[color:var(--paper-hi)]">
                  {formatEuro(bundle.cents)}
                </p>
                <p className="col-start-1 row-start-3 text-[15px] leading-normal text-[color:var(--paper-dim)]">{bundle.line}</p>
              </li>
            ))}
          </ul>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
            <p className="sd-tag">VAT included</p>
            <ReportCta source="pricing" className="sd-btn" />
          </div>
        </div>
      </div>
    </section>
  );
}

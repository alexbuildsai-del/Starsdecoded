import { MAX_SUN_HERO_PX, SUN_HERO } from "@/lib/planet-renders";
import { PERSONAL_REPORT } from "@/lib/product";
import { ReportCta } from "../cta";
import { buttonStyles } from "@/ds/atoms/Button";

/**
 * The page closes at dawn with its last call to action (ADR-118). The light, the Sun and the horizon are site.css's
 * `.sd-dawn` layers, which lift the Sun only as the section scrolls in, so under reduced motion it is simply risen.
 */
export default function Dawn() {
  return (
    <section className="sd-dawn" aria-labelledby="dawn-h">
      <div className="glow" aria-hidden="true" />
      <div className="sunwrap" aria-hidden="true">
        {/* Eager but low priority: a lazy Sun pops in on a fast scroll, and the section should be whole when it arrives. */}
        <img src={SUN_HERO} alt="" width={MAX_SUN_HERO_PX} height={MAX_SUN_HERO_PX} decoding="async" fetchPriority="low" />
      </div>
      <div className="hline" aria-hidden="true" />
      <div className="sd-wrap">
        <p className="sd-eyebrow text-brass/80">{PERSONAL_REPORT}</p>
        <h2 id="dawn-h">
          Start with your <em>birth date.</em>
        </h2>
        <p className="dsub">Then add where you were born, and your birth time if you know it.</p>
        <div>
          <ReportCta source="dawn" className={buttonStyles()} />
        </div>
      </div>
    </section>
  );
}

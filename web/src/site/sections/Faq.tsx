import { Link } from "wouter";
import { HOME_FAQ } from "../data/faq";

/** All ten stay open, never folded, so a reader and a crawler get every answer without a click (landing scope 12). */
export default function Faq() {
  return (
    <section className="sd-sec sd-sec-c sd-line" id="faq" aria-labelledby="faq-h">
      <div className="sd-wrap">
        <div className="sd-shead">
          <p className="sd-eyebrow">FAQ</p>
          <h2 className="sd-h2" id="faq-h">
            Questions people ask
          </h2>
        </div>
        <div className="sd-faq">
          {HOME_FAQ.map((item) => (
            <div key={item.q}>
              <h3>{item.q}</h3>
              <p>{item.a}</p>
            </div>
          ))}
        </div>
        <Link className="sd-more" href="/faq">
          See all the questions
        </Link>
      </div>
    </section>
  );
}

import { pageFor } from "../site";

const home = pageFor("/");

export default function Hero() {
  return (
    <section className="sd-hero">
      <div className="sd-wrap sd-hero-grid">
        <div className="sd-h-top">
          <p className="sd-eyebrow">{home.eyebrow}</p>
          <h1 className="sd-h1">{home.h1}</h1>
        </div>
        <div className="sd-h-bot">
          <p className="sd-lede">{home.lede}</p>
        </div>
      </div>
    </section>
  );
}

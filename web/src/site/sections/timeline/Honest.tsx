/**
 * How it stays honest (timeline-page §1 item 5): the four limits Timeline keeps, in the look the site's other facts
 * have, so "no predictions" reads the same wherever it is said (ADR-172). They are the change to R-5.2 that Timeline's
 * spec locked for the day it ships: dates for the sky, never for a life, and no do or don't.
 */
const RULES: readonly { rule: string; why: string }[] = [
  { rule: "No horoscope for the day", why: "Nothing is written on a day the sky leaves your chart alone." },
  {
    rule: "Dates for the sky, never for your life",
    why: "It says when a planet reaches a point in your chart, never what will happen.",
  },
  { rule: "No do or don't", why: "It says how astrology reads a time and why, and leaves the choice with you." },
  { rule: "Quiet weeks stay quiet", why: "No email, no streaks, no badges. Stop the email in one click." },
];

export default function Honest() {
  return (
    <section className="sd-pg-sec sd-sec-a sd-line" aria-labelledby="honest-h">
      <div className="sd-wrap">
        <h2 className="sd-eyebrow" id="honest-h">
          How it stays honest
        </h2>
        <ul role="list" className="sd-facts mx-0 mb-0 mt-7 list-none p-0 min-[880px]:grid-cols-4 min-[880px]:gap-5">
          {RULES.map(({ rule, why }) => (
            <li key={rule} className="sd-fact">
              <b>{rule}</b> {why}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

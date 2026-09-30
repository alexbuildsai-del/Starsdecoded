/**
 * What are whole-sign houses? (annex /learn/whole-sign-houses): the answer in
 * the page's first sentence, then the system on a bare ring the reader turns,
 * the sample's own houses on the same ring, the twelve houses, and whole sign
 * against Placidus. Every sign on the page comes from the zodiac's order or
 * her computed chart (R-3.1). Whole sign is the product's only house system
 * (R-4.2), and its history is Brennan's, never a claim that it is more accurate.
 */
import { useId, useState } from "react";
import { Link } from "wouter";
import { SIGN_ORDER } from "@/components/chart/wheel-geometry";
import { HOUSE_THEMES, HOUSE_WORDS, ORDINALS } from "@/lib/evidence-glossary";
import { PRODUCT } from "@/lib/product";
import { SiteLayout } from "../SiteLayout";
import { HouseRing } from "../components/HouseRing";
import { SAMPLE, sampleChart } from "../data/sample";
import { chartLabel, chartLine, litHouses, pickLine, ringLabel, risingIndex } from "../lib/learn";
import { pageFor } from "../site";

const page = pageFor("/learn/whole-sign-houses");
const birthTime = pageFor("/learn/birth-time");
const sky = pageFor("/sky");

/** Text left, the ring right; below 1000 px the ring sits between the words and the control that turns it. */
const ART = "grid gap-y-10 min-[1001px]:grid-cols-[minmax(0,1fr)_minmax(0,480px)] min-[1001px]:gap-x-16 min-[1001px]:gap-y-4";
const ART_TEXT = "min-[1001px]:col-start-1 min-[1001px]:row-start-1 min-[1001px]:self-end";
const ART_FIGURE = "w-full max-w-[480px] justify-self-center self-center min-[1001px]:col-start-2 min-[1001px]:row-span-2 min-[1001px]:row-start-1";
const ART_CONTROL = "min-[1001px]:col-start-1 min-[1001px]:row-start-2 min-[1001px]:self-start";
const PROSE =
  "grid content-start gap-4 [&>p]:max-w-[62ch] [&>p]:text-[17px] [&>p]:leading-[1.75] [&>p]:text-[color:var(--paper-dim)] max-[760px]:[&>p]:text-[16px]";
const H2 = "text-[clamp(26px,2.6vw,32px)] leading-[1.15]";
const CHIP =
  "inline-flex h-[36px] cursor-pointer items-center rounded-full border border-[var(--line)] px-3.5 [font:500_12.5px/1_var(--f-label)] text-[color:var(--paper-dim)] transition-[border-color,background-color] duration-200 hover:border-[rgba(159,168,218,.55)] has-[:checked]:border-[rgba(159,168,218,.75)] has-[:checked]:bg-[rgba(92,107,192,.18)] has-[:checked]:text-[color:var(--paper)] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[color:var(--indigo-lt)]";
const TABLE_WRAP = "overflow-x-auto rounded-[14px] border border-[var(--line)] bg-[rgba(17,22,31,.45)]";
const TABLE = "w-full border-collapse text-[14.5px] [&_tr:last-child>*]:border-b-0";
const TH_COL =
  "border-b border-[var(--line)] px-4 py-3.5 text-left [font:500_10.5px/1_var(--f-label)] uppercase tracking-[.16em] text-[color:var(--sd-muted)] max-[760px]:px-3";
const TD = "border-b border-[var(--line-soft)] px-4 py-[11px] align-middle text-[color:var(--paper-dim)] max-[760px]:px-3";
const TH_ROW =
  "w-[24%] border-b border-[var(--line-soft)] px-4 py-3 text-left align-middle [font:500_10.5px/1.3_var(--f-label)] uppercase tracking-[.14em] text-[color:var(--sd-muted)] max-[760px]:px-3";

function SignPicker({ rising, onPick }: { rising: number; onPick: (sign: number) => void }) {
  const group = useId();
  return (
    <fieldset className="m-0 grid min-w-0 gap-3 border-0 p-0">
      <legend className="mb-3 p-0 [font:500_11px/1.2_var(--f-label)] uppercase tracking-[.2em] text-[color:var(--sd-muted)]">Rising sign</legend>
      <div className="flex flex-wrap gap-1.5">
        {SIGN_ORDER.map((sign, i) => (
          <label key={sign} className={CHIP}>
            <input type="radio" name={group} value={sign} checked={i === rising} onChange={() => onPick(i)} className="sr-only" />
            {sign}
          </label>
        ))}
      </div>
      <p className="sd-mono text-[11.5px] uppercase leading-[1.6] tracking-[.08em] text-[color:var(--paper-dim)]" aria-live="polite">
        {pickLine(rising)}
      </p>
    </fieldset>
  );
}

function Related() {
  return (
    <div className="sd-rel mt-0 max-w-[780px]">
      <Link className="sd-relcard" href={birthTime.path}>
        <span className="sd-eyebrow">Learn</span>
        <b>{birthTime.h1}</b>
        <span>What changes without it</span>
      </Link>
      <Link className="sd-relcard" href={sky.path}>
        <span className="sd-eyebrow">{sky.h1}</span>
        <b>See your own houses</b>
        <span>Put in your birth details</span>
      </Link>
    </div>
  );
}

/** Its own component, so a pick redraws this section alone. It opens on the sample's rising sign, whose chart comes next. */
function PickRising({ first }: { first: number }) {
  const [rising, setRising] = useState(first);
  return (
    <section className="sd-pg-sec sd-sec-a sd-line" aria-labelledby="pick-h">
      <div className={`sd-wrap ${ART}`}>
        <div className={`${PROSE} ${ART_TEXT}`}>
          <h2 id="pick-h" className={H2}>
            Pick a rising sign
          </h2>
          <p>
            Your rising sign is the one that was coming up over the eastern horizon at the minute you were born. With whole-sign
            houses, that whole sign is your 1st house (self), the next sign is your 2nd (money), and so on around the wheel.
          </p>
          <p>
            Pick a sign to turn the zodiac to it. The houses stay put, counted from the east downward, so every sign lands in a new
            house. This ring shows the system only, so it has no planets on it.
          </p>
        </div>
        <div className={ART_FIGURE}>
          <HouseRing rising={rising} label={ringLabel(rising)} />
        </div>
        <div className={ART_CONTROL}>
          <SignPicker rising={rising} onPick={setRising} />
        </div>
      </div>
    </section>
  );
}

export default function LearnHousesPage() {
  const chart = sampleChart();

  return (
    <SiteLayout page={page} end={<Related />}>
      <PickRising first={Math.max(0, risingIndex(chart))} />

      <section className="sd-pg-sec sd-sec-b sd-line" aria-labelledby="real-h">
        <div className="sd-wrap grid items-center gap-y-10 min-[1001px]:grid-cols-[minmax(0,1fr)_minmax(0,480px)] min-[1001px]:gap-x-16">
          <div className={PROSE}>
            <h2 id="real-h" className={H2}>
              On a real chart
            </h2>
            <p>{chartLine(SAMPLE.name, chart)}</p>
            <p>A planet's house is the sign it's in, counted from the rising sign, so you can check every house by hand.</p>
            <p className="sd-fine mt-0">
              {SAMPLE.name}'s birth time comes from her public birth record ({SAMPLE.source}). {PRODUCT} has no connection to her
              family or estate.
            </p>
          </div>
          <div className="w-full max-w-[480px] justify-self-center">
            <HouseRing chart={chart} lit={litHouses(chart)} litBodies={["sun"]} label={chartLabel(SAMPLE.name, chart)} />
          </div>
        </div>
      </section>

      <section className="sd-pg-sec sd-sec-c sd-line" aria-labelledby="houses-h">
        <div className="sd-wrap">
          <div className="sd-shead">
            <h2 id="houses-h" className="sd-h2">
              The twelve houses
            </h2>
            <p className="sd-sub">Each house is one part of life. These are the names our reports use.</p>
          </div>
          <div className={TABLE_WRAP}>
            <table className={TABLE}>
              <caption className="sr-only">The twelve whole-sign houses, each with its name and what it covers</caption>
              <thead>
                <tr>
                  <th scope="col" className={TH_COL}>
                    House
                  </th>
                  <th scope="col" className={TH_COL}>
                    Name
                  </th>
                  <th scope="col" className={TH_COL}>
                    What it covers
                  </th>
                </tr>
              </thead>
              <tbody>
                {HOUSE_WORDS.map((word, i) => (
                  <tr key={word}>
                    <th scope="row" className={`${TD} sd-mono w-16 text-left text-[12px] font-medium text-[color:var(--sd-brass)]`}>
                      {ORDINALS[i]}
                    </th>
                    <td className={`${TD} w-[180px] [font:400_19px/1.2_var(--f-display)] text-[color:var(--paper)] max-[760px]:w-auto`}>{word}</td>
                    <td className={TD}>{HOUSE_THEMES[i]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="sd-pg-sec sd-sec-a sd-line" aria-labelledby="placidus-h">
        <div className="sd-wrap">
          <div className={`${PROSE} max-w-[780px]`}>
            <h2 id="placidus-h" className={H2}>
              How is it different from Placidus?
            </h2>
            <p>
              Placidus is the system many astrology websites use by default. It divides the chart by the time of day, so its houses
              differ in size and can start partway through a sign. Far north or south, some houses stretch across several signs, and
              close to the poles Placidus can't be worked out at all.
            </p>
            <div className={`${TABLE_WRAP} mb-2 mt-3`}>
              <table className={TABLE}>
                <caption className="sr-only">Whole-sign houses and Placidus houses side by side</caption>
                <thead>
                  <tr>
                    <td className={`${TH_COL} w-[24%]`} />
                    <th scope="col" className={`${TH_COL} text-[color:var(--paper-dim)]`}>
                      Whole-sign houses
                    </th>
                    <th scope="col" className={`${TH_COL} text-[color:var(--paper-dim)]`}>
                      Placidus houses
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th scope="row" className={TH_ROW}>
                      Each house is
                    </th>
                    <td className={TD}>One whole sign, 30°</td>
                    <td className={TD}>A slice cut by the time of day, of different sizes</td>
                  </tr>
                  <tr>
                    <th scope="row" className={TH_ROW}>
                      Starts from
                    </th>
                    <td className={TD}>The rising sign</td>
                    <td className={TD}>The exact rising degree</td>
                  </tr>
                  <tr>
                    <th scope="row" className={TH_ROW}>
                      Near the poles
                    </th>
                    <td className={TD}>Works the same</td>
                    <td className={TD}>Can't be worked out above about 66° north or south</td>
                  </tr>
                  <tr>
                    <th scope="row" className={TH_ROW}>
                      If the time is a little off
                    </th>
                    <td className={TD}>Houses rarely change</td>
                    <td className={TD}>Every house boundary moves</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <h2 className={`${H2} mt-[18px]`}>Why does {PRODUCT} use whole-sign houses?</h2>
            <p>
              {PRODUCT} uses whole-sign houses because they're simple to check and work anywhere on Earth. They're also the oldest
              system we know of. In <cite>Hellenistic Astrology</cite> (2017), Chris Brennan describes them as the main way the first
              Greek-language astrologers divided a chart, about 2,000 years ago.
            </p>
            <p>
              They also forgive a slightly wrong birth time. Your houses only change when your rising sign does, which happens every two
              hours on average.
            </p>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}

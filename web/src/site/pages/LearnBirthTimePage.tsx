/**
 * What if you don't know your birth time? (annex /learn/birth-time): the
 * answer first, then what the date and the time each settle, the sample's day
 * to the minute, today's sky over the visitor's town on a slider, the birth
 * form's three answers on one sample person, and where to find a time. The
 * sample's parts are computed into the page's HTML; the visitor's day and town
 * are theirs alone, so that part draws after mount (R-3.1, R-6.1).
 */
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Link } from "wouter";
import { localParts, offsetAtBirth, placeForZone, type Place } from "@workspace/engine";
import { TriadPlate } from "@/components/report/TriadPlate";
import { useEntryFormat } from "@/hooks/useEntryFormat";
import { MODE_LABELS } from "@/lib/birth-time";
import { clockWords, type Clock } from "@/lib/date-entry";
import type { GeocodeResult } from "@/lib/places";
import { PRODUCT } from "@/lib/product";
import { visitorZone } from "@/lib/sky-now";
import { SiteLayout } from "../SiteLayout";
import { HorizonWheel } from "../components/HorizonWheel";
import { SAMPLE_PEOPLE } from "../data/people";
import { SAMPLE } from "../data/sample";
import { chartOf, type Birth } from "../lib/chart";
import {
  MINUTES_IN_DAY, clockOf, dayStats, instantOf, minuteOf, riseWindow, sampleDayLine, spanAt, sweepDay,
  type RiseWindow, type SweptDay,
} from "../lib/learn";
import { plateAnswer, plateLine, plateReadout, timePlates } from "../lib/readouts";
import { placeOfZone, type Sky } from "../lib/sky";
import { formatUpdated, pageFor } from "../site";

const page = pageFor("/learn/birth-time");
const houses = pageFor("/learn/whole-sign-houses");
const sky = pageFor("/sky");

/** The slider's step: fine enough to watch the sky turn, and few enough positions for each to keep its chart. */
const STEP_MINUTES = 5;
/** The least time the page gets back between two engine runs while the slider moves. */
const MIN_GAP_MS = 60;

const ART = "grid gap-y-10 min-[1001px]:grid-cols-[minmax(0,1fr)_minmax(0,480px)] min-[1001px]:gap-x-16 min-[1001px]:gap-y-4";
const ART_TEXT = "min-[1001px]:col-start-1 min-[1001px]:row-start-1 min-[1001px]:self-end";
const ART_FIGURE = "w-full max-w-[480px] justify-self-center self-center min-[1001px]:col-start-2 min-[1001px]:row-span-2 min-[1001px]:row-start-1";
const ART_CONTROL = "min-[1001px]:col-start-1 min-[1001px]:row-start-2 min-[1001px]:self-start";
const PROSE =
  "grid content-start gap-4 [&>p]:max-w-[62ch] [&>p]:text-[17px] [&>p]:leading-[1.75] [&>p]:text-[color:var(--paper-dim)] max-[760px]:[&>p]:text-[16px]";
const H2 = "text-[clamp(26px,2.6vw,32px)] leading-[1.15]";
// A browser draws a range's empty track light against an indigo accent, which a dark-only page cannot take, so the track
// and thumb are drawn in the site's colours; the box is tall enough for a thumb on a phone.
const RANGE =
  "h-8 w-full cursor-pointer appearance-none bg-transparent " +
  "[&::-webkit-slider-runnable-track]:h-1 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-[rgba(232,235,242,.16)] " +
  "[&::-webkit-slider-thumb]:mt-[-7px] [&::-webkit-slider-thumb]:box-border [&::-webkit-slider-thumb]:size-[18px] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-solid [&::-webkit-slider-thumb]:border-[color:var(--indigo-lt)] [&::-webkit-slider-thumb]:bg-[color:var(--indigo)] " +
  "[&::-moz-range-track]:h-1 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-[rgba(232,235,242,.16)] " +
  "[&::-moz-range-thumb]:box-border [&::-moz-range-thumb]:size-[18px] [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-solid [&::-moz-range-thumb]:border-[color:var(--indigo-lt)] [&::-moz-range-thumb]:bg-[color:var(--indigo)]";

// R11-17's plate tokens and frame are private to the home section, so the page draws its plates with the same values.
const PLATE_TOKENS = {
  "--sky": "var(--sd-brass)",
  "--sky-dim": "color-mix(in srgb, var(--sd-brass) 65%, #000)",
} as CSSProperties;
const PLATE =
  "grid min-w-0 content-start justify-items-center gap-[9px] rounded-[16px] border border-[var(--line)] bg-[rgba(17,22,31,.6)] px-[14px] py-4 text-center";

let sampleRose: RiseWindow | null | undefined;

/**
 * Her day in words on the reader's clock. The window is worked out once, from
 * two engine sweeps of the day she was born, so the browser's clock arriving
 * after hydration only says it again.
 */
function sampleDaySentence(clock: Clock): string | null {
  if (sampleRose === undefined) sampleRose = riseWindow(SAMPLE.birth);
  const city = SAMPLE.place.split(", ").slice(-1)[0];
  return sampleRose ? sampleDayLine(SAMPLE.name, city, SAMPLE.birth, sampleRose, clock) : null;
}

interface Town {
  place: Place;
  day: SweptDay;
  /** The town as the wheel's sky names its place. */
  where: GeocodeResult;
}

interface Shown {
  minute: number;
  sky: Sky;
}

function skyAtMinute(town: Town, minute: number): Sky {
  const at: Birth = { ...town.day.at, birthTime: clockOf(minute) };
  return { kind: "now", chart: chartOf(at), at: new Date(instantOf(at, at.birthTime)), place: town.where };
}

/**
 * Today over the visitor's town, a minute at a time. An engine chart costs a
 * phone up to about a tenth of a second, so the slider never waits on one per
 * move: a minute already worked out is drawn at once, and otherwise only the
 * latest minute asked for is worked out, after a gap as long as the last run.
 */
function useTodaysSky() {
  const [town, setTown] = useState<Town | null>(null);
  const [minute, setMinute] = useState<number | null>(null);
  const [shown, setShown] = useState<Shown | null>(null);
  const skies = useRef(new Map<number, Sky>());
  const wanted = useRef<number | null>(null);
  const timer = useRef(0);
  const freeAt = useRef(0);

  // After the first paint, when the page is idle: the prerender knows neither the visitor's town nor their day, and the
  // day's two sweeps are the page's longest piece of work.
  useEffect(() => {
    const begin = () => {
      const place = placeForZone(visitorZone());
      const { date, time } = localParts(new Date(), place.zone);
      const offset = offsetAtBirth(place.zone, date, time);
      const at: Birth = { birthDate: date, birthTime: time, latitude: place.lat, longitude: place.lon, timezone: place.zone, timezoneOffset: offset };
      setTown({ place, day: sweepDay(at), where: placeOfZone(place, offset) });
      setMinute(Math.floor(minuteOf(time) / STEP_MINUTES) * STEP_MINUTES);
    };
    if (typeof window.requestIdleCallback === "function") {
      const handle = window.requestIdleCallback(begin, { timeout: 1000 });
      return () => window.cancelIdleCallback(handle);
    }
    const handle = window.setTimeout(begin, 0);
    return () => window.clearTimeout(handle);
  }, []);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  useEffect(() => {
    if (!town || minute === null) return;
    wanted.current = minute;
    const known = skies.current.get(minute);
    if (known) {
      setShown({ minute, sky: known });
      return;
    }
    if (timer.current) return;
    timer.current = window.setTimeout(() => {
      timer.current = 0;
      const m = wanted.current;
      if (m === null) return;
      let next = skies.current.get(m);
      if (!next) {
        const began = performance.now();
        next = skyAtMinute(town, m);
        skies.current.set(m, next);
        const now = performance.now();
        freeAt.current = now + Math.max(MIN_GAP_MS, now - began);
      }
      setShown({ minute: m, sky: next });
    }, Math.max(0, freeAt.current - performance.now()));
  }, [town, minute]);

  return { town, minute, setMinute, shown };
}

function DayControls({ town, minute, onMinute, shown }: { town: Town | null; minute: number | null; onMinute: (m: number) => void; shown: Shown | null }) {
  const { clock } = useEntryFormat();
  // Held open before the visitor's day is known, so the page does not move when it arrives.
  if (!town || minute === null) return <div className="min-h-[268px]" aria-hidden="true" />;
  const time = clockOf(minute);
  const said = clockWords(time, clock);
  const rising = spanAt(town.day, time)?.sign;
  return (
    <div className="grid min-h-[268px] content-start gap-4">
      <div className="grid gap-2.5">
        <label htmlFor="bt-day" className="sd-mono text-[11px] uppercase tracking-[.14em] text-[color:var(--paper-dim)]">
          {`${formatUpdated(town.day.at.birthDate)} · ${said} · over ${town.place.city}`}
        </label>
        <input
          id="bt-day"
          type="range"
          min={0}
          max={MINUTES_IN_DAY - STEP_MINUTES}
          step={STEP_MINUTES}
          value={minute}
          aria-valuetext={rising ? `${said}, ${rising} rising` : said}
          onChange={(event) => onMinute(Number(event.currentTarget.value))}
          className={RANGE}
        />
      </div>
      {shown ? (
        <dl className="m-0 grid grid-cols-[auto_minmax(0,1fr)] gap-x-[18px] gap-y-2.5 rounded-[14px] border border-[var(--line)] bg-[rgba(17,22,31,.45)] p-4">
          {dayStats(town.day, shown.sky.chart, clockOf(shown.minute), clock).map((row) => (
            <div key={row.label} className="contents">
              <dt className="[font:500_10.5px/1.6_var(--f-label)] uppercase tracking-[.16em] text-[color:var(--sd-muted)]">{row.label}</dt>
              <dd className="sd-mono m-0 text-[13px] leading-[1.55] text-[color:var(--paper)]">
                {row.value}
                {row.note ? <span className="block [font:400_13px/1.55_var(--f-body)] text-[color:var(--sd-muted)]">{row.note}</span> : null}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
    </div>
  );
}

/** The birth form's three answers on one sample person's birth, each read through the form's own sweep (R11-17). */
function Plates() {
  const person = SAMPLE_PEOPLE[0];
  const { clock } = useEntryFormat();
  // Two of the plates sweep a whole day, so a re-render must not work them out again.
  const plates = useMemo(() => timePlates(person.birth, person.chart), [person]);
  return (
    <figure className="m-0 grid min-w-0 gap-3" style={PLATE_TOKENS}>
      <figcaption className="sd-tag text-center">{`A sample person · ${person.name} · born ${formatUpdated(person.birthDate)}`}</figcaption>
      <ul className="m-0 grid list-none grid-cols-3 gap-[14px] p-0 max-[560px]:grid-cols-1">
        {plates.map((plate) => (
          <li key={plate.mode} className={PLATE}>
            <p className="sd-eyebrow text-[10.5px] tracking-[.2em] text-[var(--paper)]">{MODE_LABELS[plate.mode].title}</p>
            <p className="min-h-[2.8em] text-[12px] leading-[1.4] text-[color:var(--sd-muted)]">{plateAnswer(plate, clock)}</p>
            {/* The readout under the plate states its facts, so the drawing stays out of the reading order. */}
            <div aria-hidden="true">
              <TriadPlate chart={plate.chart} name={person.name} className="block h-auto w-[150px] max-w-full" />
            </div>
            <p className="sd-mono text-[11px] uppercase leading-[1.5] tracking-[.04em] text-[color:var(--paper-dim)]">{plateReadout(plate, clock)}</p>
            <p className="text-[12.5px] leading-[1.45] text-[color:var(--sd-muted)]">{plateLine(plate)}</p>
          </li>
        ))}
      </ul>
    </figure>
  );
}

function Related() {
  return (
    <div className="sd-rel mt-0 max-w-[780px]">
      <Link className="sd-relcard" href={houses.path}>
        <span className="sd-eyebrow">Learn</span>
        <b>{houses.h1}</b>
        <span>Why houses need a rising sign</span>
      </Link>
      <Link className="sd-relcard" href={sky.path}>
        <span className="sd-eyebrow">{sky.h1}</span>
        <b>Try it with and without a time</b>
        <span>See what changes on your own chart</span>
      </Link>
    </div>
  );
}

/** Its own component, so a move of the slider redraws this section and never the plates below it. */
function TimeChanges() {
  const today = useTodaysSky();
  const { clock } = useEntryFormat();
  const herDay = sampleDaySentence(clock);

  return (
    <section className="sd-pg-sec sd-sec-a sd-line" aria-labelledby="time-h">
      <div className={`sd-wrap ${ART}`}>
        <div className={`${PROSE} ${ART_TEXT}`}>
          <h2 id="time-h" className={H2}>
            What the time changes
          </h2>
          <p>
            The date alone settles the signs of your Sun, Moon and planets, unless one of them changed sign that day. The Moon does
            that every two or three days, the Sun once a month.
          </p>
          <p>The time settles your rising sign, your houses and whether you were born by day or by night.</p>
          {herDay ? <p>{herDay}</p> : null}
          <p>
            Slide through today to see it for yourself. The rising sign turns all the way round in a day, and the houses turn with it.
            The Moon moves a little, and the other planets hardly move at all.
          </p>
        </div>
        {/* The readout beside it is the wheel's text equivalent, and it names the minute the slider is on. */}
        <div className={`${ART_FIGURE} [&_.sd-hz-l]:left-[-20px] [&_.sd-hz-r]:right-[-20px] [&_.sd-hz_b]:hidden`} aria-hidden="true">
          <HorizonWheel sky={today.shown?.sky ?? null} />
        </div>
        <div className={`grid gap-4 ${ART_CONTROL}`}>
          <DayControls town={today.town} minute={today.minute} onMinute={today.setMinute} shown={today.shown} />
          <p className="sd-fine mt-0">
            {SAMPLE.name}'s birth time comes from her public birth record ({SAMPLE.source}). {PRODUCT} has no connection to her
            family or estate.
          </p>
        </div>
      </div>
    </section>
  );
}

export default function LearnBirthTimePage() {
  return (
    <SiteLayout page={page} end={<Related />}>
      <TimeChanges />

      <section className="sd-pg-sec sd-sec-c sd-line" aria-labelledby="have-h">
        <div className="sd-wrap">
          <div className="sd-shead">
            <h2 id="have-h" className="sd-h2">
              Tell us what you have
            </h2>
            <p className="sd-sub">The exact time, a part of the day, or nothing. The report only uses what that time can support.</p>
          </div>
          <Plates />
        </div>
      </section>

      <section className="sd-pg-sec sd-sec-b sd-line" aria-labelledby="find-h">
        <div className="sd-wrap">
          <div className={`${PROSE} max-w-[780px]`}>
            <h2 id="find-h" className={H2}>
              Where to find your birth time
            </h2>
            <ul className="m-0 grid max-w-[62ch] list-disc gap-2 pl-5 text-[17px] leading-[1.75] text-[color:var(--paper-dim)] marker:text-[color:var(--sd-muted)] max-[760px]:text-[16px] [&_b]:font-medium [&_b]:text-[color:var(--paper)]">
              <li>
                <b>Your full birth certificate.</b> In many countries it shows the time. In England and Wales it usually doesn't, unless
                you're a twin.
              </li>
              <li>
                <b>Hospital records</b> from the birth, if the hospital still has them.
              </li>
              <li>
                <b>Someone who was there,</b> like a parent or an older relative. "Just after lunch" is enough to pick a part of the day.
              </li>
              <li>
                <b>Family papers,</b> like a baby book, a birth announcement or a baptism record.
              </li>
            </ul>
            <h2 className={`${H2} mt-[18px]`}>If you find it later</h2>
            <p>
              You can add it to your report once for free. {PRODUCT} then adds your rising sign and houses and marks every change, so you
              can compare. Changing it a second time uses a credit.
            </p>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}

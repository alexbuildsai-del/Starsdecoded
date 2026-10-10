/**
 * What Timeline gives you (timeline-page §2; ADR-250, 256; readings 9, 22):
 * five things, each a promise in plain words, why you'd care, and what Mira
 * sees on her own chart. Every date, age, orb, tone and position is her week
 * as the engine computed it (`MIRA`); her everyday lines, report line, reading
 * and questions are sample words, and each example says which it shows
 * (acceptance 1, 5). Cycle names and words are the engine's `CYCLE_WORDS`.
 */
import { useMemo } from "react";
import { CYCLE_WORDS } from "@workspace/engine";
import { AskMark } from "@/components/ask/AskMark";
import { ContactCard, ToneWord } from "@/components/timeline/ContactCard";
import { DayCells } from "@/components/timeline/DayCells";
import { MixBar } from "@/components/timeline/MixBar";
import { Waves } from "@/components/timeline/Waves";
import { useEntryFormat } from "@/hooks/useEntryFormat";
import { DEFAULT_ENTRY, type DateOrder } from "@/lib/date-entry";
import { cycleBody, cycleChip, cycleDay, cycleMark, cycleWhen, lookBack, type CycleView, type WaveLine } from "@/lib/life-view";
import { dayMonth, dayNumber, longDay, monthYear, nearDate, weekdayOf, type ContactView } from "@/lib/timeline-view";
import { PERSONAL_REPORT, PRODUCT } from "@/lib/product";
import { MIRA, MIRA_WEEK, SAMPLE_WORDS, miraOf, type Mira, type MiraChange } from "@/site/data/timeline/mira";
import { SAMPLE_ACCOUNT, ThingCard } from "./ThingCard";

/** The Saturn-return finder's place on the page (R16-16), where Life's link goes. */
const FINDER = "#finder";

const NOTE = "text-small leading-normal text-paper-dim";

/**
 * Her waves with each cycle marked at the engine's date for it. Found in the
 * monthly points instead, a return Saturn reaches while standing still inside
 * the orb sits months before its card's date: her 2021 one by most of a year.
 */
const WAVES: WaveLine[] = MIRA.wave.lines.map((line) => ({
  ...line,
  marks: MIRA.cycles.filter((c) => cycleBody(c.id) === line.body).map((c) => cycleMark(c.id, cycleDay(c), MIRA_WEEK.born)),
}));

/** The Monday's two strongest, then its first easy one, so the example shows that Timeline names the easy times too. */
function firstCards(cards: readonly ContactView[]): ContactView[] {
  const top = cards.slice(0, 2);
  const third = cards.find((c) => c.tone === "easy" && !top.includes(c)) ?? cards.find((c) => !top.includes(c));
  return third ? [...top, third] : top;
}

/** The next thing to start, or whatever changes next when nothing starts soon. */
function comingUp(next: readonly MiraChange[]): MiraChange | null {
  return next.find((c) => c.change === "starts") ?? next[0] ?? null;
}

/** Her last Saturn return, looked back to in the words a cycle card uses (reading 19), then named. */
function lookBackLine(mira: Mira, order: DateOrder): string | null {
  const today = mira.week.from;
  const last = mira.cycles.filter((c) => c.id === "saturn-return" && cycleWhen(c, today) === "past").pop();
  const look = last ? lookBack(last, today, order) : null;
  if (!look) return null;
  return `${look} Saturn came back to where it was when you were born. That was your ${CYCLE_WORDS["saturn-return"].name}.`;
}

/** Her known ages' cycles under way or still ahead, soonest first. */
function nextCycles(mira: Mira): CycleView[] {
  const today = mira.week.from;
  return mira.ages
    .map((age) => age.cycle)
    .filter((cycle) => cycleWhen(cycle, today) !== "past")
    .sort((a, b) => cycleDay(a).localeCompare(cycleDay(b)));
}

// CycleCard's status chip, the one look a cycle's status has wherever it shows (ADR-172).
const CHIP_LOOK = {
  now: "border-indigo bg-indigo/16 text-paper",
  ahead: "border-line text-paper",
  past: "border-line text-muted",
} as const;

function CycleRow({ cycle, today, order }: { cycle: CycleView; today: string; order: DateOrder }) {
  const { name, word } = CYCLE_WORDS[cycle.id];
  return (
    <li className="grid grid-cols-[34px_minmax(0,1fr)_auto] items-baseline gap-x-2.5 border-t border-line-soft py-2">
      <span className="font-numeric text-lg leading-none text-paper">
        <span className="sr-only">Age </span>
        {cycle.age}
      </span>
      <span className="grid min-w-0 gap-0.5">
        <span className="text-ui leading-snug text-paper">{name}</span>
        <span className="text-caption leading-snug text-muted">{word}</span>
      </span>
      <span className="grid justify-items-end gap-1.5 text-right">
        <span className="font-numeric text-xs text-paper-dim">{monthYear(cycleDay(cycle), order)}</span>
        <span className={`whitespace-nowrap rounded-full border px-2 py-1 text-caption leading-none ${CHIP_LOOK[cycleWhen(cycle, today)]}`}>
          {cycleChip(cycle, today)}
        </span>
      </span>
    </li>
  );
}

function NowAndAhead({ mira, order }: { mira: Mira; order: DateOrder }) {
  const today = mira.week.from;
  const cards = firstCards(mira.contacts);
  const more = mira.contacts.length - cards.length;
  const next = comingUp(mira.next);
  return (
    <ThingCard
      id="five-now"
      name="Now and ahead"
      promise="Know what's going on for you, and for how long"
      why="When a week feels hard or easy, Timeline tells you in plain words what astrology links it to, and when it ends."
      sees={`What Mira sees · ${longDay(today, order)}`}
      mark={SAMPLE_WORDS}
    >
      <MixBar tones={mira.contacts.map((c) => c.tone)} />
      {cards.map((contact) => (
        <ContactCard key={contact.key} contact={contact} />
      ))}
      {more > 0 ? <p className={NOTE}>And {more} more today.</p> : null}
      {next ? (
        <p className={NOTE}>
          Coming up: <b className="font-normal text-paper">{next.headline}</b>
          {next.change === "starts"
            ? `, from ${nearDate(next.day, today, order)}.`
            : ` ${next.change} on ${nearDate(next.day, today, order)}.`}
        </p>
      ) : null}
    </ThingCard>
  );
}

function Life({ mira, order }: { mira: Mira; order: DateOrder }) {
  const today = mira.week.from;
  const look = lookBackLine(mira, order);
  return (
    <ThingCard
      id="five-life"
      name="Life"
      promise="Know which chapter of your life you're in"
      why="Astrology marks a few ages most people notice: around 29, around 37 and the early forties. Timeline shows yours with your own dates, so you can look back and see what's coming."
      more={
        <a href={FINDER} className="justify-self-start text-ui font-medium text-indigo-lt no-underline hover:underline">
          When is your Saturn return? Find yours <span aria-hidden="true">↓</span>
        </a>
      }
      sees={`What Mira sees · age ${mira.week.age}`}
      mark={SAMPLE_ACCOUNT}
    >
      <Waves wave={WAVES} today={mira.wave.today} />
      {look ? (
        <p className="border-l-2 border-teal pl-3 font-display text-prose italic leading-snug text-paper">{look}</p>
      ) : null}
      <ul role="list" className="m-0 grid list-none p-0">
        {nextCycles(mira).map((cycle) => (
          <CycleRow key={cycle.key} cycle={cycle} today={today} order={order} />
        ))}
      </ul>
    </ThingCard>
  );
}

function Readings({ mira }: { mira: Mira }) {
  const { reportLine, reading } = mira.sample;
  return (
    <ThingCard
      id="five-readings"
      name="Readings"
      promise="Every transit read against your own report"
      why={`Your ${PERSONAL_REPORT} already describes you. Each reading starts from what your report says, then explains what this time means for you. It links back to that part of your report.`}
      sees="What Mira reads"
      mark={SAMPLE_WORDS}
    >
      <figure className="m-0 grid gap-1 border-l-2 border-line pl-3">
        <figcaption className="font-label text-kicker uppercase leading-snug tracking-[.12em] text-muted">{reportLine.source}</figcaption>
        <blockquote className="m-0 font-display text-base leading-normal text-paper-dim">“{reportLine.text}”</blockquote>
      </figure>
      <p className="flex items-center gap-2 text-caption leading-snug text-muted">
        <span aria-hidden="true" className="block h-px w-[18px] flex-none bg-line" />
        {reading.bridge}
      </p>
      <div className="grid gap-1.5 border-l-2 border-indigo pl-3">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-label text-kicker uppercase leading-none tracking-[.12em] text-indigo-lt">
          Timeline <span aria-hidden="true">·</span> <ToneWord tone={reading.tone} />
        </p>
        <p className="font-display text-lg leading-snug text-paper">{reading.headline}</p>
        <p className="text-ui leading-[1.6] text-paper">
          {reading.before}
          <mark className="border-b border-dashed border-muted bg-transparent text-paper">{reading.quote}</mark>
          {reading.after}
        </p>
      </div>
      {/* The reading's own link, drawn as Mira sees it: her report isn't on the site, so it goes nowhere here. */}
      <p className="text-ui font-medium text-indigo-lt">{reading.link}</p>
    </ThingCard>
  );
}

function Ask({ mira }: { mira: Mira }) {
  return (
    <ThingCard
      id="five-ask"
      name="Ask"
      promise="Ask about any of it, in your own words"
      why="Have a question about a reading? Ask it. Answers come from your chart, your reports and your timeline. Ask never tells you what to do."
      sees={
        <span className="text-paper">
          <AskMark size={22} />
        </span>
      }
      mark={SAMPLE_WORDS}
    >
      <ul role="list" className="m-0 grid list-none gap-1.5 p-0">
        {mira.sample.questions.map((question) => (
          <li key={question} className="rounded-xl border border-line bg-surface px-2.5 py-[7px] text-small leading-normal text-paper">
            {question}
          </li>
        ))}
      </ul>
    </ThingCard>
  );
}

function YourWeek({ mira, order }: { mira: Mira; order: DateOrder }) {
  const { from, to, changes } = mira.week;
  const sunday = mira.days[mira.days.length - 1];
  // The line sets what lasts against what eases, so it is said only in a week that holds both.
  const goesOn = changes.some((c) => c.change === "eases") && Boolean(sunday?.tones.length);
  return (
    <ThingCard
      id="five-week"
      name="Your week"
      promise="Your week at a glance, and an email only when something changes"
      why="Your dashboard shows your next seven days and what's happening on each. On Mondays you get a short email, only when something starts, peaks or ends that week."
      sees={`Mira's dashboard · ${dayMonth(from, order)} to ${dayMonth(to, order)}`}
      mark={SAMPLE_ACCOUNT}
    >
      <p className="font-display text-card-title-sm leading-[1.4] text-paper">
        {mira.sentence}{goesOn ? " The longer ones continue." : ""}
      </p>
      <DayCells days={mira.days} keyed />
      {changes.length ? (
        <ul role="list" className="m-0 grid list-none p-0">
          {changes.map((change) => (
            <li
              key={`${change.day}.${change.key}.${change.change}`}
              className="grid grid-cols-[52px_minmax(0,1fr)] items-baseline gap-x-2.5 border-t border-line-soft py-[7px] text-sm"
            >
              <span className="font-numeric text-xs text-paper-dim">
                <span aria-hidden="true">
                  {weekdayOf(change.day)} {dayNumber(change.day)}
                </span>
                <span className="sr-only">{longDay(change.day, order)}:</span>
              </span>
              <span className="min-w-0 text-paper">
                {change.headline} <span className="text-caption text-muted">{change.change}</span>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      <p className="grid gap-0.5 rounded-xl border border-line bg-surface px-3 py-2.5 text-small">
        <span className="sr-only">The Monday email:</span>
        <span className="text-xs text-muted">
          {PRODUCT} · {longDay(from, order)}
        </span>
        <span className="font-medium text-paper">{mira.sample.subject}</span>
      </p>
    </ThingCard>
  );
}

export function FiveThings() {
  const { order } = useEntryFormat();
  // The prerender draws her in DD/MM order; a reader whose language orders dates otherwise gets her dates redrawn once.
  const mira = useMemo(() => (order === DEFAULT_ENTRY.order ? MIRA : miraOf(MIRA_WEEK, order)), [order]);
  return (
    <section className="sd-pg-sec sd-sec-a sd-line" aria-labelledby="five-h">
      <div className="sd-wrap">
        <div className="sd-shead">
          <p className="sd-eyebrow">What Timeline gives you</p>
          <h2 id="five-h" className="sd-h2">
            Five things, each shown on Mira's chart
          </h2>
        </div>
        <div className="grid gap-3.5 min-[880px]:gap-5">
          <NowAndAhead mira={mira} order={order} />
          <Life mira={mira} order={order} />
          <Readings mira={mira} />
          <Ask mira={mira} />
          <YourWeek mira={mira} order={order} />
        </div>
      </div>
    </section>
  );
}

export default FiveThings;

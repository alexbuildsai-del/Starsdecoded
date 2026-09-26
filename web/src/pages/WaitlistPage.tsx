import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { Mark } from "@/components/Mark";
import { SkyNow, useSkyNow, type Sky } from "@/components/waitlist/SkyNow";
import { WaitlistForm } from "@/components/waitlist/WaitlistForm";
import { PART_LABELS } from "@/lib/birth-time";
import { chapterAccent } from "@/lib/chapter-accent";
import { CHAPTERS, type ChapterSection } from "@/lib/chapters";
import { houseWithWord } from "@/lib/evidence-glossary";
import { LENSES, PAIR_CHAPTER_TITLES } from "@/lib/lenses";
import { SUN_HERO } from "@/lib/planet-renders";
import { COMPATIBILITY_REPORT, PERSONAL_REPORT, PRODUCT } from "@/lib/product";
import { degreeLine, utcLine } from "@/lib/sky-now";
import { usePageTitle } from "@/lib/page-title";
import type { Lens } from "@/types/chart";
import "./waitlist.css";

/**
 * Production's page until launch (ADR-141): the First Light home page's
 * sections that stand without a sample report or a signed-in product, with the
 * birth form's place taken by the waitlist form. Copy is the locked landing's
 * (landing-and-ai-search) except where the waitlist needs its own words.
 */

// Each line is written from the chapter's own prompt instructions (landing-and-ai-search, ADR-111).
const INSIDE: Record<ChapterSection, { line: string; parts: string }> = {
  overview: { line: "The big picture and what stands out in your chart", parts: "Headline · What makes it unusual · Where it all points" },
  houses: { line: "Your Sun, Moon and rising sign, and a short read of each of your twelve houses", parts: "Sun · Moon · Rising · Where the weight sits · How you run · Twelve houses" },
  mind: { line: "How you think, how you make decisions and why people sometimes get you wrong", parts: "How you think · How you decide · How you are understood · A practice" },
  career: { line: "The kind of work that suits you, how you come across at work and where you can grow", parts: "Vocational pull · How you show up · Growth through work · Career paths" },
  money: { line: "How you earn, spend and share money", parts: "Your relationship to resources · What works · Shared money" },
  relationships: { line: "How you love, what keeps going wrong and who suits you", parts: "How you love · The challenge · What partnership asks · You connect best with" },
  family: { line: "What you took from the family you grew up in and what you want to do differently", parts: "What you carry · What roots you · The inherited edge" },
  superpowers: { line: "What you're naturally good at, the habit you'll always have to manage and where you can grow", parts: "Your superpower · The pattern you will always navigate · Your growing edge" },
  discoveries: { line: "The parts of you that pull in different directions and how to live with both", parts: "Two or three paradoxes · A way through each" },
  focus: { line: "What to do more of, what to watch for and what to try next", parts: "Lean into · Notice · Practice · Closing" },
};

const FAQ: { q: string; a: string }[] = [
  { q: `What is a ${PERSONAL_REPORT}?`, a: "It's a report about you, written from your birth chart. It has ten chapters, including a short read of each of your twelve houses. Every sentence shows which part of your chart it is based on." },
  { q: "When can I get my report?", a: `As soon as ${PRODUCT} opens. Join the waitlist and we'll email you the day it does.` },
  { q: "What do I need to start?", a: "You need your birth date and where you were born. If you know your birth time, add it too, because it gives you a rising sign and houses." },
  { q: "What if I don't know my birth time?", a: "You still get the full report. Tell us what you have: the exact time, a part of the day, or nothing. The report only uses what that supports, and says what a time would add. If you find it later, add it once for free and we'll mark every change." },
  { q: "How is the report written?", a: "We work out your chart and note what stands out in it. Your report is then written from those notes with the help of AI, following our own rules. Every reference is checked against your chart before you see it." },
  { q: "Does it predict the future?", a: "No. It doesn't forecast events, name dates or talk about fate. It describes how you tend to work and gives you things to try." },
  { q: "Is this scientific?", a: "The planet positions are real astronomy, worked out from the sky at the minute you were born. What they mean comes from astrology, which science doesn't back, so think of the report as a way to reflect on yourself." },
  { q: "Can I get a report about me and someone else?", a: `Yes. When you both have a ${PERSONAL_REPORT}, you can get a ${COMPATIBILITY_REPORT} about the two of you. You choose whether you're a couple, a parent and child, or friends, family or colleagues, and it never gives you a score.` },
  { q: "How long does it take?", a: "It takes a few minutes, and you can start reading the first chapters while the rest are still being written." },
  { q: "What happens to my email?", a: `We only use it to tell you when ${PRODUCT} opens. We don't share it, and you can ask us to delete it at any time.` },
];

const reducedMotion = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

function focusJoin() {
  const input = document.getElementById("wl-email-hero");
  const target = input ?? document.getElementById("join");
  target?.scrollIntoView({ behavior: reducedMotion() ? "auto" : "smooth", block: "center" });
  input?.focus({ preventScroll: true });
}

function Inside() {
  const [cur, setCur] = useState(0);
  const [auto, setAuto] = useState(() => !reducedMotion());
  const [seen, setSeen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const DUR = 4600;

  useEffect(() => {
    const el = box.current;
    if (!el || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver((es) => setSeen(es[0].isIntersecting), { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!auto || !seen) return;
    const t = window.setTimeout(() => setCur((c) => (c + 1) % CHAPTERS.length), DUR);
    return () => window.clearTimeout(t);
  }, [auto, seen, cur]);

  const pick = (i: number) => { setAuto(false); setCur(i); };
  const c = CHAPTERS[cur];
  const n = String(cur + 1).padStart(2, "0");
  const accent = chapterAccent(cur + 1);

  return (
    <div className="wl-inside" ref={box}>
      <ul className="wl-toc" role="tablist" aria-label="Chapters" style={{ ["--dur" as string]: `${DUR}ms` }}>
        {CHAPTERS.map((ch, i) => (
          <li key={ch.section} role="presentation">
            <button
              type="button"
              role="tab"
              id={`wl-toc-${i}`}
              aria-selected={i === cur}
              aria-controls="wl-pv"
              style={{ ["--c" as string]: chapterAccent(i + 1) }}
              onClick={() => pick(i)}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                  e.preventDefault();
                  const next = (i + (e.key === "ArrowDown" ? 1 : CHAPTERS.length - 1)) % CHAPTERS.length;
                  pick(next);
                  document.getElementById(`wl-toc-${next}`)?.focus();
                }
              }}
            >
              <span className="n">{String(i + 1).padStart(2, "0")}</span>
              <span className="t">{ch.title}</span>
              <span className={`prog${i === cur && auto && seen ? " run" : ""}`} key={i === cur ? `run-${cur}` : "idle"} />
            </button>
          </li>
        ))}
      </ul>
      <div className="wl-pv" id="wl-pv" role="tabpanel" aria-labelledby={`wl-toc-${cur}`} style={{ ["--acc" as string]: accent }}>
        <span className="ghost" aria-hidden="true">{n}</span>
        <div className="swap" key={cur}>
          <p className="chap"><span className="wl-mono">{n}</span>Chapter</p>
          <h3>{c.title}</h3>
          <p className="glimpse">{INSIDE[c.section].line}</p>
          <p className="parts">{INSIDE[c.section].parts}</p>
        </div>
      </div>
    </div>
  );
}

function SkyReadout({ sky }: { sky: Sky | null }) {
  if (!sky) return null;
  const { chart, city } = sky;
  const sun = chart.planets.sun;
  const moon = chart.planets.moon;
  return (
    <div className="wl-readout" aria-label={`Right now over ${city}`}>
      <span>Right now over {city}</span>
      <span><b>Sun</b> {degreeLine(sun)}{sun.house ? ` · ${houseWithWord(sun.house)}` : ""}</span>
      <span><b>Moon</b> {degreeLine(moon)}{moon.house ? ` · ${houseWithWord(moon.house)}` : ""}</span>
      {chart.angles && <span><b>Asc</b> {degreeLine(chart.angles.ascendant)}</span>}
      <span><b>Clock</b> {utcLine(sky.offsetHours)} · {city}</span>
    </div>
  );
}

function TwoPeople() {
  const [lens, setLens] = useState<Lens>("partners");
  const info = LENSES.find((l) => l.lens === lens) ?? LENSES[0];
  const titles = PAIR_CHAPTER_TITLES(lens);
  return (
    <div>
      <p className="wl-eyebrow">{COMPATIBILITY_REPORT}</p>
      <h3>How the two of you get along</h3>
      <p className="t">
        When you and someone close to you both have a {PERSONAL_REPORT}, you can get a {COMPATIBILITY_REPORT} about the two of
        you. You choose who they are to you: your partner, your child, or a friend, relative or colleague. It looks at everyday
        life together, where you clash and what you can try, and it never gives you a score.
      </p>
      <div className="wl-lenses" role="tablist" aria-label="Who they are to you">
        {LENSES.map((l) => (
          <button key={l.lens} type="button" role="tab" className="wl-lensbtn" aria-selected={l.lens === lens} onClick={() => setLens(l.lens)}>
            {l.title}
          </button>
        ))}
      </div>
      <ol className="wl-pch" role="tabpanel" aria-label={`${info.title}: the chapters`}>
        {titles.map((t, i) => (
          <li key={t}><span className="n">{String(i + 1).padStart(2, "0")}</span>{t}</li>
        ))}
      </ol>
      <p className="wl-foot3"><span>{titles.length} chapters</span><span>No scores</span></p>
    </div>
  );
}

export default function WaitlistPage() {
  usePageTitle("Find out what your birth chart says about you");
  const sky = useSkyNow();
  const [joined, setJoined] = useState<string | null>(null);
  const year = new Date().getFullYear();

  return (
    <div className="wl">
      <header className="wl-nav">
        <div className="wl-wrap">
          <a className="wl-word" href="#top" aria-label={`${PRODUCT}, top of the page`}>
            <Mark />
            {PRODUCT}
          </a>
          {!joined && (
            <button type="button" className="wl-btn wl-btn-g wl-btn-sm" onClick={focusJoin}>Join the waitlist</button>
          )}
        </div>
      </header>

      <main>
        <section className="wl-hero" id="top">
          <div className="wl-wrap wl-hero-grid">
            <div className="wl-h-top">
              <p className="wl-eyebrow">{PERSONAL_REPORT}</p>
              <h1 className="wl-h1">Find out what your birth chart <em>says about you</em></h1>
            </div>
            <SkyNow sky={sky} />
            <div className="wl-h-bot">
              <p className="wl-lede">
                {PRODUCT} works out where the planets were when you were born and writes you a report about how you think, work
                and love. Every line in it shows which part of your chart it comes from.
              </p>
              <div className="wl-panel" id="join">
                <div className="wl-row">
                  <p className="wl-eyebrow">Opening soon</p>
                </div>
                {!joined && <h2 className="text-[22px] leading-tight">Get an email the day we open</h2>}
                <WaitlistForm source="hero" joined={joined} onJoined={setJoined} />
              </div>
            </div>
          </div>
        </section>

        <section className="wl-sec wl-sec-a wl-line" aria-labelledby="wl-inside-h">
          <div className="wl-wrap">
            <div className="wl-shead">
              <p className="wl-eyebrow">Inside the report</p>
              <h2 className="wl-h2" id="wl-inside-h">Here's what your report covers</h2>
              <p className="wl-sub">
                There are ten chapters, starting with the big picture and ending with what to try next. In between they cover how
                you think, work, handle money and love, and the habits that keep coming back.
              </p>
            </div>
            <Inside />
          </div>
        </section>

        <section className="wl-sec wl-sec-b wl-line" aria-labelledby="wl-method-h">
          <div className="wl-wrap">
            <div className="wl-shead">
              <p className="wl-eyebrow">How it works</p>
              <h2 className="wl-h2" id="wl-method-h">How we make your report</h2>
              <p className="wl-sub">
                We work out your chart from where the planets really were, then write your report from it using our own rules for
                reading a chart.
              </p>
            </div>
            <div className="wl-steps">
              <div className="wl-step">
                <p className="sn">01</p>
                <h3>We work out your chart</h3>
                <p>
                  We find where the Sun, Moon and planets were at the minute and place you were born. We also check your birth
                  town's clock history, so summer time is right.
                </p>
                <SkyReadout sky={sky} />
              </div>
              <div className="wl-step">
                <p className="sn">02</p>
                <h3>We note what stands out</h3>
                <p>
                  Before anything is written, we note what stands out in your chart, such as a day or night birth and your
                  strongest planets.
                </p>
              </div>
              <div className="wl-step">
                <p className="sn">03</p>
                <h3>We write your report and check it</h3>
                <p>
                  Each chapter is written from those notes. Then every reference is checked against your chart, and anything that
                  doesn't match is fixed or taken out before you see it.
                </p>
              </div>
            </div>
            <div className="wl-facts">
              <p className="wl-fact"><b>Your birth details stay private</b>Our writing service only gets your name and where your planets are, never your birth date, time or place.</p>
              <p className="wl-fact"><b>No predictions</b>It won't forecast events, name dates or diagnose anything. It describes how you tend to work and gives you things to try.</p>
              <p className="wl-fact"><b>Real positions</b>We work out where the planets were with astronomy-engine, an open-source astronomy library accurate to within one arcminute.</p>
            </div>

            <div className="wl-duo">
              <div>
                <p className="wl-eyebrow">Birth time</p>
                <h3>You still get the full report without a birth time</h3>
                <p className="t">
                  Lots of people only know roughly, from what a parent remembers, and some don't know at all. Tell us what you
                  have: the exact time, a part of the day, or nothing. The report only uses what that time can support, and tells
                  you what it can't. If you find your time later, add it for free and we'll mark every change.
                </p>
                <div className="wl-parts">
                  {Object.values(PART_LABELS).map((label) => {
                    const [part, hours] = label.split(", ");
                    return <span key={label}>{part}<i>{hours}</i></span>;
                  })}
                </div>
              </div>
              <TwoPeople />
            </div>
          </div>
        </section>

        <section className="wl-sec wl-sec-c wl-line" aria-labelledby="wl-faq-h">
          <div className="wl-wrap">
            <div className="wl-shead">
              <p className="wl-eyebrow">FAQ</p>
              <h2 className="wl-h2" id="wl-faq-h">Questions people ask</h2>
            </div>
            <div className="wl-faq">
              {FAQ.map((f) => (
                <div key={f.q}>
                  <h3>{f.q}</h3>
                  <p>{f.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="wl-dawn" aria-labelledby="wl-dawn-h">
          <div className="glow" aria-hidden="true" />
          <div className="sunwrap" aria-hidden="true"><img src={SUN_HERO} alt="" /></div>
          <div className="hline" aria-hidden="true" />
          <div className="wl-wrap">
            <p className="wl-eyebrow">{PERSONAL_REPORT}</p>
            <h2 id="wl-dawn-h">We're opening <em>soon</em>.</h2>
            <p className="dsub">Leave your email and we'll tell you the day you can get your {PERSONAL_REPORT}.</p>
            <div className="wl-panel">
              <WaitlistForm source="dawn" joined={joined} onJoined={setJoined} />
            </div>
          </div>
        </section>
      </main>

      <footer className="wl-foot">
        <div className="wl-wrap">
          <div className="cols">
            <div className="brandcol">
              <span className="wl-word"><Mark />{PRODUCT}</span>
              <p>{PRODUCT} works out where the planets were when you were born and writes you a report about how you think, work and love.</p>
            </div>
            <nav aria-label="Legal">
              <Link href="/privacy">Privacy</Link>
              <Link href="/terms">Terms</Link>
            </nav>
          </div>
          <div className="base">
            {sky && <span>Positions computed with {sky.ephemeris}.</span>}
            <span>© {year} {PRODUCT}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

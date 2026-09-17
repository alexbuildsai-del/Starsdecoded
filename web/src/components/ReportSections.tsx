/**
 * Renderers for the ten V3 report sections. Each takes exactly the structured
 * section the API guarantees, so there are no string fallbacks here.
 */
import type {
  ActionItem, CareerSection, Claim, DiscoveriesSection, FamilySection, FocusGroup, FocusSection,
  MindSection, MoneySection, OverviewSection, RelationshipsSection, SuperpowerItem,
  SuperpowersSection, TriadSection,
} from "@/types/chart";
import { CitedText, newCitationCounter, type CitationCounter } from "@/components/report/Citation";

/** A prose paragraph whose claims are marked where the model wrote them. */
function Para({ children, claims, counter }: { children: string; claims?: Claim[]; counter: CitationCounter }) {
  return (
    <p className="text-[15px] leading-[1.7] text-foreground/85 mb-4 last:mb-0">
      {CitedText({ text: children, claims, counter })}
    </p>
  );
}

function Labelled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="font-label text-[10px] tracking-[0.2em] uppercase text-primary/70 mb-2">{label}</p>
      {children}
    </div>
  );
}

export function ActionList({ items, heading = "What to do" }: { items: ActionItem[]; heading?: string }) {
  if (!items?.length) return null;
  return (
    <div className="mt-5 rounded-xl border border-primary/20 bg-primary/5 p-5">
      <p className="font-label text-[10px] tracking-[0.2em] uppercase text-primary/80 mb-3">{heading}</p>
      <ul className="space-y-2.5">
        {items.map((a, i) => (
          <li key={i} className="flex gap-2.5 text-sm leading-snug">
            <span className="text-primary mt-[2px] shrink-0">✦</span>
            <span>
              <span className="text-foreground">{a.action}</span>
              {a.why && <span className="text-foreground/60"> {a.why}</span>}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------

export function OverviewBlock({ s }: { s: OverviewSection }) {
  const k = newCitationCounter();
  return (
    <div className="rounded-2xl border border-border/60 bg-card/40 p-6 md:p-8 lg:p-10">
      {/* Demoted below the section title, which now outranks it (acceptance 5). */}
      <h2 className="font-display leading-[1.2] tracking-[-0.01em] text-2xl mb-7 text-foreground">
        {s.headline}
      </h2>
      <div className="text-[15px] leading-[1.7] text-foreground/85 [&>p]:mb-4">
        <Para claims={s.claims} counter={k}>{s.concentration}</Para>
        <Para claims={s.claims} counter={k}>{s.temperament}</Para>
        <Para claims={s.claims} counter={k}>{s.distinctive}</Para>
      </div>
      <p className="mt-6 font-display text-lg text-primary/90 italic">{s.bridge}</p>
    </div>
  );
}

export function TriadBlock({ s }: { s: TriadSection }) {
  const k = newCitationCounter();
  const parts = [
    { glyph: "☉", ...s.sun },
    { glyph: "☽", ...s.moon },
    { glyph: "↑", ...s.rising },
  ];
  return (
    <div className="grid md:grid-cols-3 gap-4">
      {parts.map((p) => (
        <div key={p.label} className="rounded-xl border border-border/60 bg-card/40 p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-full border border-primary/30 bg-primary/10 flex items-center justify-center text-primary/90 text-sm">{p.glyph}</div>
            <p className="font-label text-[10px] tracking-[0.18em] uppercase text-primary/75">{p.label}</p>
          </div>
          <p className="text-sm leading-[1.65] text-foreground/85">
            {CitedText({ text: p.text, claims: s.claims, counter: k })}
          </p>
        </div>
      ))}
    </div>
  );
}

export function MindBlock({ s }: { s: MindSection }) {
  const k = newCitationCounter();
  return (
    <div className="rounded-xl border border-border/60 bg-card/40 p-6 space-y-5">
      <Labelled label="How you think"><Para claims={s.claims} counter={k}>{s.howYouThink}</Para></Labelled>
      <Labelled label="How you decide"><Para claims={s.claims} counter={k}>{s.howYouDecide}</Para></Labelled>
      <Labelled label="How you are understood"><Para claims={s.claims} counter={k}>{s.howYouAreUnderstood}</Para></Labelled>
      <ActionList items={[{ action: s.practice, why: "" }]} heading="Practice" />
    </div>
  );
}

export function CareerBlock({ s }: { s: CareerSection }) {
  const k = newCitationCounter();
  return (
    <div className="rounded-xl border border-border/60 bg-card/40 p-6 space-y-5">
      <Labelled label="Vocational pull"><Para claims={s.claims} counter={k}>{s.vocationalPull}</Para></Labelled>
      <Labelled label="How you show up"><Para claims={s.claims} counter={k}>{s.howYouShowUp}</Para></Labelled>
      <Labelled label="Growth through work"><Para claims={s.claims} counter={k}>{s.growthThroughWork}</Para></Labelled>
      <ActionList items={s.actions} />
    </div>
  );
}

export function MoneyBlock({ s }: { s: MoneySection }) {
  const k = newCitationCounter();
  return (
    <div className="rounded-xl border border-border/60 bg-card/40 p-6 space-y-5">
      <Labelled label="Your relationship to resources"><Para claims={s.claims} counter={k}>{s.relationshipToResources}</Para></Labelled>
      <Labelled label="What works, and what does not"><Para claims={s.claims} counter={k}>{s.whatWorks}</Para></Labelled>
      <Labelled label="Shared money and exposure"><Para claims={s.claims} counter={k}>{s.sharedAndExposed}</Para></Labelled>
      <ActionList items={s.actions} />
    </div>
  );
}

export function RelationshipsBlock({ s }: { s: RelationshipsSection }) {
  const k = newCitationCounter();
  return (
    <div className="rounded-xl border border-border/60 bg-card/40 p-6 space-y-5">
      <Labelled label="How you love"><Para claims={s.claims} counter={k}>{s.howYouLove}</Para></Labelled>
      <Labelled label="The challenge"><Para claims={s.claims} counter={k}>{s.theChallenge}</Para></Labelled>
      <Labelled label="What partnership asks of you"><Para claims={s.claims} counter={k}>{s.whatPartnershipAsks}</Para></Labelled>
      <ActionList items={s.actions} />
    </div>
  );
}

export function FamilyBlock({ s }: { s: FamilySection }) {
  const k = newCitationCounter();
  return (
    <div className="rounded-xl border border-border/60 bg-card/40 p-6 space-y-5">
      <Labelled label="What you carry"><Para claims={s.claims} counter={k}>{s.whatYouCarry}</Para></Labelled>
      <Labelled label="What roots you"><Para claims={s.claims} counter={k}>{s.whatRootsYou}</Para></Labelled>
      <Labelled label="The inherited edge"><Para claims={s.claims} counter={k}>{s.theInheritedEdge}</Para></Labelled>
      <ActionList items={s.actions} />
    </div>
  );
}

function SuperpowerCard({ kicker, item, tone, claims, counter }: { kicker: string; item: SuperpowerItem; tone: "primary" | "amber" | "emerald"; claims?: Claim[]; counter: CitationCounter }) {
  const ring = { primary: "border-primary/30 bg-primary/5", amber: "border-amber-400/30 bg-amber-400/5", emerald: "border-emerald-400/30 bg-emerald-400/5" }[tone];
  const text = { primary: "text-primary/80", amber: "text-amber-400/80", emerald: "text-emerald-400/80" }[tone];
  return (
    <div className={`rounded-xl border p-6 ${ring}`}>
      <p className={`font-label text-[10px] tracking-[0.2em] uppercase mb-1.5 ${text}`}>{kicker}</p>
      <h3 className="font-display text-xl mb-3">{item.title}</h3>
      <Para claims={claims} counter={counter}>{item.text}</Para>
      <ActionList items={item.actions} heading={tone === "emerald" ? "Practice this week" : tone === "amber" ? "How to manage it" : "How to use it"} />
    </div>
  );
}

export function SuperpowersBlock({ s }: { s: SuperpowersSection }) {
  const k = newCitationCounter();
  return (
    <div className="space-y-4">
      <SuperpowerCard kicker="Your superpower" item={s.superpower} tone="primary" claims={s.claims} counter={k} />
      <SuperpowerCard kicker="The pattern you will always navigate" item={s.chronicPattern} tone="amber" claims={s.claims} counter={k} />
      <SuperpowerCard kicker="Your growing edge" item={s.growingEdge} tone="emerald" claims={s.claims} counter={k} />
    </div>
  );
}

export function DiscoveriesBlock({ s }: { s: DiscoveriesSection }) {
  const k = newCitationCounter();
  return (
    <div className="space-y-4">
      <Para claims={s.claims} counter={k}>{s.opening}</Para>
      {s.paradoxes.map((p, i) => (
        <div key={i} className="rounded-xl border border-border/60 bg-card/40 p-6">
          <h3 className="font-display text-xl mb-3">{p.title}</h3>
          <Para claims={s.claims} counter={k}>{p.tension}</Para>
          <p className="mt-3 text-sm leading-relaxed text-primary/90 italic border-l-2 border-primary/40 pl-4">{p.invitation}</p>
        </div>
      ))}
    </div>
  );
}

function FocusGroupCard({ title, g, tone }: { title: string; g: FocusGroup; tone: string }) {
  return (
    <div className={`rounded-xl border p-5 ${tone}`}>
      <p className="font-label text-[10px] tracking-[0.2em] uppercase text-foreground/70 mb-1.5">{title}</p>
      <p className="text-sm text-foreground/80 mb-3">{g.intro}</p>
      <ul className="space-y-2">
        {g.bullets.map((b, i) => (
          <li key={i} className="flex gap-2 text-sm leading-snug">
            <span className="text-foreground/40 mt-[3px] shrink-0">·</span>
            <span><span className="text-foreground">{b.point}</span>{b.why && <span className="text-foreground/60"> {b.why}</span>}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function FocusBlock({ s }: { s: FocusSection }) {
  const k = newCitationCounter();
  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-3 gap-4">
        <FocusGroupCard title="Lean into" g={s.leanInto} tone="border-primary/30 bg-primary/5" />
        <FocusGroupCard title="Notice" g={s.notice} tone="border-amber-400/30 bg-amber-400/5" />
        <FocusGroupCard title="Practice" g={s.practice} tone="border-emerald-400/30 bg-emerald-400/5" />
      </div>
      <div className="rounded-xl border border-border/60 bg-card/40 p-6 md:p-8">
        <p className="font-label text-[10px] tracking-[0.2em] uppercase text-primary/70 mb-3">Your invitation</p>
        <p className="font-display text-lg leading-[1.6] text-foreground/90">
          {CitedText({ text: s.closing, claims: s.claims, counter: k })}
        </p>
      </div>
    </div>
  );
}

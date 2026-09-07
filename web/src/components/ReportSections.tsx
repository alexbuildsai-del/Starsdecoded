/**
 * Renderers for the ten V3 report sections. Each takes exactly the structured
 * section the API guarantees, so there are no string fallbacks here.
 */
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type {
  ActionItem, CareerSection, DiscoveriesSection, FamilySection, FocusGroup, FocusSection,
  MindSection, MoneySection, OverviewSection, RelationshipsSection, SuperpowerItem,
  SuperpowersSection, TriadSection,
} from "@/types/chart";

function Para({ children }: { children: string }) {
  return <p className="text-[15px] leading-[1.7] text-foreground/85 mb-4 last:mb-0">{children}</p>;
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
  return (
    <div className="rounded-2xl border border-border/60 bg-card/40 p-6 md:p-8 lg:p-10">
      <h2 className="font-display font-light leading-[1.15] tracking-[-0.01em] text-3xl md:text-4xl mb-7 text-foreground">
        {s.headline}
      </h2>
      <div className="text-[15px] leading-[1.7] text-foreground/85 md:columns-2 md:gap-10 [&>p]:mb-4 [&>p]:break-inside-avoid">
        <p>{s.concentration}</p>
        <p>{s.temperament}</p>
        <p>{s.distinctive}</p>
      </div>
      <p className="mt-6 font-display text-lg text-primary/90 italic">{s.bridge}</p>
    </div>
  );
}

export function TriadBlock({ s }: { s: TriadSection }) {
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
          <p className="text-sm leading-[1.65] text-foreground/85">{p.text}</p>
        </div>
      ))}
    </div>
  );
}

export function MindBlock({ s }: { s: MindSection }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/40 p-6 space-y-5">
      <Labelled label="How you think"><Para>{s.howYouThink}</Para></Labelled>
      <Labelled label="How you decide"><Para>{s.howYouDecide}</Para></Labelled>
      <Labelled label="How you are understood"><Para>{s.howYouAreUnderstood}</Para></Labelled>
      <ActionList items={[{ action: s.practice, why: "" }]} heading="Practice" />
    </div>
  );
}

export function CareerBlock({ s }: { s: CareerSection }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/40 p-6 space-y-5">
      <Labelled label="Vocational pull"><Para>{s.vocationalPull}</Para></Labelled>
      <Labelled label="How you show up"><Para>{s.howYouShowUp}</Para></Labelled>
      <Labelled label="Growth through work"><Para>{s.growthThroughWork}</Para></Labelled>
      <ActionList items={s.actions} />
    </div>
  );
}

export function MoneyBlock({ s }: { s: MoneySection }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/40 p-6 space-y-5">
      <Labelled label="Your relationship to resources"><Para>{s.relationshipToResources}</Para></Labelled>
      <Labelled label="What works, and what does not"><Para>{s.whatWorks}</Para></Labelled>
      <Labelled label="Shared money and exposure"><Para>{s.sharedAndExposed}</Para></Labelled>
      <ActionList items={s.actions} />
    </div>
  );
}

export function RelationshipsBlock({ s }: { s: RelationshipsSection }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/40 p-6 space-y-5">
      <Labelled label="How you love"><Para>{s.howYouLove}</Para></Labelled>
      <Labelled label="The challenge"><Para>{s.theChallenge}</Para></Labelled>
      <Labelled label="What partnership asks of you"><Para>{s.whatPartnershipAsks}</Para></Labelled>
      <ActionList items={s.actions} />
    </div>
  );
}

export function FamilyBlock({ s }: { s: FamilySection }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/40 p-6 space-y-5">
      <Labelled label="What you carry"><Para>{s.whatYouCarry}</Para></Labelled>
      <Labelled label="What roots you"><Para>{s.whatRootsYou}</Para></Labelled>
      <Labelled label="The inherited edge"><Para>{s.theInheritedEdge}</Para></Labelled>
      <ActionList items={s.actions} />
    </div>
  );
}

function SuperpowerCard({ kicker, item, tone }: { kicker: string; item: SuperpowerItem; tone: "primary" | "amber" | "emerald" }) {
  const ring = { primary: "border-primary/30 bg-primary/5", amber: "border-amber-400/30 bg-amber-400/5", emerald: "border-emerald-400/30 bg-emerald-400/5" }[tone];
  const text = { primary: "text-primary/80", amber: "text-amber-400/80", emerald: "text-emerald-400/80" }[tone];
  return (
    <div className={`rounded-xl border p-6 ${ring}`}>
      <p className={`font-label text-[10px] tracking-[0.2em] uppercase mb-1.5 ${text}`}>{kicker}</p>
      <h3 className="font-display text-xl mb-3">{item.title}</h3>
      <Para>{item.text}</Para>
      <ActionList items={item.actions} heading={tone === "emerald" ? "Practice this week" : tone === "amber" ? "How to manage it" : "How to use it"} />
    </div>
  );
}

export function SuperpowersBlock({ s }: { s: SuperpowersSection }) {
  return (
    <div className="space-y-4">
      <SuperpowerCard kicker="Your superpower" item={s.superpower} tone="primary" />
      <SuperpowerCard kicker="The pattern you will always navigate" item={s.chronicPattern} tone="amber" />
      <SuperpowerCard kicker="Your growing edge" item={s.growingEdge} tone="emerald" />
    </div>
  );
}

export function DiscoveriesBlock({ s }: { s: DiscoveriesSection }) {
  return (
    <div className="space-y-4">
      <p className="text-[15px] leading-[1.7] text-foreground/85">{s.opening}</p>
      {s.paradoxes.map((p, i) => (
        <div key={i} className="rounded-xl border border-border/60 bg-card/40 p-6">
          <h3 className="font-display text-xl mb-3">{p.title}</h3>
          <Para>{p.tension}</Para>
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
  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-3 gap-4">
        <FocusGroupCard title="Lean into" g={s.leanInto} tone="border-primary/30 bg-primary/5" />
        <FocusGroupCard title="Notice" g={s.notice} tone="border-amber-400/30 bg-amber-400/5" />
        <FocusGroupCard title="Practice" g={s.practice} tone="border-emerald-400/30 bg-emerald-400/5" />
      </div>
      <div className="rounded-xl border border-border/60 bg-card/40 p-6 md:p-8">
        <p className="font-label text-[10px] tracking-[0.2em] uppercase text-primary/70 mb-3">Your invitation</p>
        <p className="font-display text-lg leading-[1.6] text-foreground/90">{s.closing}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// House system note and explainer
// ---------------------------------------------------------------------------

export function HouseSystemNote() {
  return (
    <p className="text-muted-foreground font-label text-xs mt-2">
      Houses: Whole Sign. If you have seen your chart on astro.com or a similar site, houses there use Placidus, so some house numbers will differ. Your signs, degrees and aspects are identical.
    </p>
  );
}

export function HouseSystemExplainer() {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-4 rounded-xl border border-border/40 bg-card/30">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-3 text-left font-label text-xs tracking-[0.16em] uppercase text-muted-foreground hover:text-foreground"
        aria-expanded={open}
      >
        Why do my houses differ from other sites?
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="px-5 pb-5 text-sm leading-relaxed text-foreground/80 space-y-3">
          <p>
            A house system is the rule for dividing the sky into the twelve life areas. Your planets, signs, degrees and aspects are the same in every system. Only the house numbers change.
          </p>
          <p>
            This report uses Whole Sign houses, the oldest system and the one used by the classical sources it is built on. Your rising sign is your 1st house, and each following sign is the next house. It works at every latitude and gives the same answer whether your recorded birth time is exact or rounded to the nearest quarter hour.
          </p>
          <p>
            Most consumer sites use Placidus, which divides the sky by time rather than by sign. Its house boundaries move roughly one degree every four minutes of clock time, so a planet near a boundary can change house with a small error in birth time, and the system breaks down at high latitudes. It is not wrong. It is a different rule, and it will sometimes put a planet one house away from where you see it here.
          </p>
        </div>
      )}
    </div>
  );
}

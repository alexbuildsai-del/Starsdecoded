/**
 * Renderers for the ten V3 report sections. Each takes exactly the structured
 * section the API guarantees, so there are no string fallbacks here. The markup
 * is the locked Observatory prototype's: prose on the sky, a box only where the
 * content is a distinct object.
 */
import type {
  ActionItem, CareerSection, Claim, DiscoveriesSection, FamilySection, FocusGroup, FocusSection,
  MindSection, MoneySection, OverviewSection, RelationshipsSection, SuperpowerItem,
  SuperpowersSection, TriadSection,
} from "@/types/chart";
import { CitedText, newCitationCounter, type CitationCounter } from "@/components/report/Citation";

/** A prose paragraph whose claims are marked where the model wrote them. */
function Para({ children, claims, counter }: { children: string; claims?: Claim[]; counter: CitationCounter }) {
  return <p>{CitedText({ text: children, claims, counter })}</p>;
}

function LabelledBlock({ label, children, claims, counter }: { label: string; children: string; claims?: Claim[]; counter: CitationCounter }) {
  return (
    <div className="rp-lblk">
      <span className="rp-lab">{label}</span>
      <p>{CitedText({ text: children, claims, counter })}</p>
    </div>
  );
}

export function ActionList({ items, heading = "What to do" }: { items: ActionItem[]; heading?: string }) {
  if (!items?.length) return null;
  return (
    <div className="rp-actions">
      <span className="rp-lab">{heading}</span>
      <ul>
        {items.map((a, i) => (
          <li key={i}>
            <span>{a.action}</span>
            {a.why && <span className="why"> {a.why}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------

export function OverviewBlock({ s }: { s: OverviewSection }) {
  const k = newCitationCounter();
  // The headline is the chapter lede now, rendered by the page.
  return (
    <>
      <div className="rp-prose">
        <Para claims={s.claims} counter={k}>{s.concentration}</Para>
        <Para claims={s.claims} counter={k}>{s.temperament}</Para>
        <Para claims={s.claims} counter={k}>{s.distinctive}</Para>
      </div>
      <p className="rp-pull">{s.bridge}</p>
    </>
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
    <div className="rp-cols">
      {parts.map((p) => (
        <div key={p.label} className="rp-prose">
          <div className="rp-lblk" style={{ marginTop: 0 }}>
            <span className="rp-lab">{p.glyph} {p.label}</span>
            <p>{CitedText({ text: p.text, claims: s.claims, counter: k })}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function MindBlock({ s }: { s: MindSection }) {
  const k = newCitationCounter();
  return (
    <div className="rp-prose">
      <LabelledBlock label="How you think" claims={s.claims} counter={k}>{s.howYouThink}</LabelledBlock>
      <LabelledBlock label="How you decide" claims={s.claims} counter={k}>{s.howYouDecide}</LabelledBlock>
      <LabelledBlock label="How you are understood" claims={s.claims} counter={k}>{s.howYouAreUnderstood}</LabelledBlock>
      <ActionList items={[{ action: s.practice, why: "" }]} heading="Practice" />
    </div>
  );
}

export function CareerBlock({ s }: { s: CareerSection }) {
  const k = newCitationCounter();
  return (
    <div className="rp-prose">
      <LabelledBlock label="Vocational pull" claims={s.claims} counter={k}>{s.vocationalPull}</LabelledBlock>
      <LabelledBlock label="How you show up" claims={s.claims} counter={k}>{s.howYouShowUp}</LabelledBlock>
      <LabelledBlock label="Growth through work" claims={s.claims} counter={k}>{s.growthThroughWork}</LabelledBlock>
      <ActionList items={s.actions} />
    </div>
  );
}

export function MoneyBlock({ s }: { s: MoneySection }) {
  const k = newCitationCounter();
  return (
    <div className="rp-prose">
      <LabelledBlock label="Your relationship to resources" claims={s.claims} counter={k}>{s.relationshipToResources}</LabelledBlock>
      <LabelledBlock label="What works, and what does not" claims={s.claims} counter={k}>{s.whatWorks}</LabelledBlock>
      <LabelledBlock label="Shared money and exposure" claims={s.claims} counter={k}>{s.sharedAndExposed}</LabelledBlock>
      <ActionList items={s.actions} />
    </div>
  );
}

export function RelationshipsBlock({ s }: { s: RelationshipsSection }) {
  const k = newCitationCounter();
  return (
    <div className="rp-prose">
      <LabelledBlock label="How you love" claims={s.claims} counter={k}>{s.howYouLove}</LabelledBlock>
      <LabelledBlock label="The challenge" claims={s.claims} counter={k}>{s.theChallenge}</LabelledBlock>
      <LabelledBlock label="What partnership asks of you" claims={s.claims} counter={k}>{s.whatPartnershipAsks}</LabelledBlock>
      <ActionList items={s.actions} />
    </div>
  );
}

export function FamilyBlock({ s }: { s: FamilySection }) {
  const k = newCitationCounter();
  return (
    <div className="rp-prose">
      <LabelledBlock label="What you carry" claims={s.claims} counter={k}>{s.whatYouCarry}</LabelledBlock>
      <LabelledBlock label="What roots you" claims={s.claims} counter={k}>{s.whatRootsYou}</LabelledBlock>
      <LabelledBlock label="The inherited edge" claims={s.claims} counter={k}>{s.theInheritedEdge}</LabelledBlock>
      <ActionList items={s.actions} />
    </div>
  );
}

function SuperpowerCard({ kicker, item, heading, claims, counter }: { kicker: string; item: SuperpowerItem; heading: string; claims?: Claim[]; counter: CitationCounter }) {
  return (
    <div className="rp-box">
      <span className="rp-lab">{kicker}</span>
      <h3>{item.title}</h3>
      <p className="tn">{CitedText({ text: item.text, claims, counter })}</p>
      <ActionList items={item.actions} heading={heading} />
    </div>
  );
}

export function SuperpowersBlock({ s }: { s: SuperpowersSection }) {
  const k = newCitationCounter();
  return (
    <div>
      <SuperpowerCard kicker="Your superpower" item={s.superpower} heading="How to use it" claims={s.claims} counter={k} />
      <SuperpowerCard kicker="The pattern you will always navigate" item={s.chronicPattern} heading="How to manage it" claims={s.claims} counter={k} />
      <SuperpowerCard kicker="Your growing edge" item={s.growingEdge} heading="Practice this week" claims={s.claims} counter={k} />
    </div>
  );
}

export function DiscoveriesBlock({ s }: { s: DiscoveriesSection }) {
  const k = newCitationCounter();
  return (
    <div>
      <div className="rp-prose">
        <Para claims={s.claims} counter={k}>{s.opening}</Para>
      </div>
      {s.paradoxes.map((p, i) => (
        <div key={i} className="rp-box">
          <h3>{p.title}</h3>
          <p className="tn">{CitedText({ text: p.tension, claims: s.claims, counter: k })}</p>
          <p className="iv">{p.invitation}</p>
        </div>
      ))}
    </div>
  );
}

function FocusGroupCard({ title, g }: { title: string; g: FocusGroup }) {
  return (
    <div className="rp-box" style={{ marginTop: 0 }}>
      <span className="rp-lab">{title}</span>
      <p className="tn">{g.intro}</p>
      <div className="rp-actions" style={{ marginTop: 10 }}>
        <ul>
          {g.bullets.map((b, i) => (
            <li key={i}>
              <span>{b.point}</span>
              {b.why && <span className="why"> {b.why}</span>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function FocusBlock({ s }: { s: FocusSection }) {
  const k = newCitationCounter();
  return (
    <>
      <div className="rp-cols">
        <FocusGroupCard title="Lean into" g={s.leanInto} />
        <FocusGroupCard title="Notice" g={s.notice} />
        <FocusGroupCard title="Practice" g={s.practice} />
      </div>
      <p className="rp-pull">{CitedText({ text: s.closing, claims: s.claims, counter: k })}</p>
    </>
  );
}

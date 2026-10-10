/**
 * Renderers for the report's sections. Each takes exactly the structured
 * section the API guarantees, so there are no string fallbacks here. The markup
 * is the locked Observatory prototype's: prose on the sky, a box only where the
 * content is a distinct object.
 *
 * Beside prose, inside a card (ADR-24): a prose chapter returns its prose and
 * exposes a rail, and a card chapter keeps its checklist inside the card, open.
 */
import type {
  ActionItem, CareerSection, Claim, DidYouKnow, DiscoveriesSection, FamilySection, MindSection, MoneySection,
  OverviewSection, RelationshipsSection, SuperpowerItem, SuperpowersSection,
} from "@/types/chart";
import { FactCard } from "@/components/FactCard";
import { CitedText, newCitationCounter, type CitationCounter } from "@/components/report/Citation";
import { Checklist, type ChecklistHeading, type ChecklistItem } from "@/ds/organisms/Checklist";
import { ProseRail } from "@/components/report/ProseRail";
import { itemKey } from "@/lib/workbook";

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

/** A chapter's Did you know, after its prose; nothing when the report has none (reports before v12, or a chapter with no fit). */
export function ChapterFact({ fact }: { fact?: DidYouKnow | null }) {
  return fact ? <FactCard title={fact.title} body={fact.body} className="mt-6" /> : null;
}

function checklistItems(section: string, path: string, actions: ActionItem[]): ChecklistItem[] {
  return actions.map((a, i) => ({ key: itemKey(section, path, i), action: a.action, why: a.why }));
}

// ---------------------------------------------------------------------------

export function OverviewBlock({ s }: { s: OverviewSection }) {
  const k = newCitationCounter();
  // The headline is the chapter lede, rendered by the page. Concentration and
  // temperament belong to the Deepdive now.
  return (
    <>
      <div className="rp-prose">
        <Para claims={s.claims} counter={k}>{s.distinctive}</Para>
      </div>
      <p className="rp-pull">{s.bridge}</p>
      <ChapterFact fact={s.didYouKnow} />
    </>
  );
}

/** Chapter 02's second block: what the balance rail beside it is showing. */
export function DeepdiveBlock({ s }: { s: OverviewSection }) {
  const k = newCitationCounter();
  return (
    <div className="rp-prose">
      <LabelledBlock label="What stands out" claims={s.claims} counter={k}>{s.concentration}</LabelledBlock>
      <LabelledBlock label="How you get through your days" claims={s.claims} counter={k}>{s.temperament}</LabelledBlock>
    </div>
  );
}

export function MindBlock({ s }: { s: MindSection }) {
  const k = newCitationCounter();
  return (
    <>
      <div className="rp-prose">
        <LabelledBlock label="How you think" claims={s.claims} counter={k}>{s.howYouThink}</LabelledBlock>
        <LabelledBlock label="How you decide" claims={s.claims} counter={k}>{s.howYouDecide}</LabelledBlock>
        <LabelledBlock label="How people see you" claims={s.claims} counter={k}>{s.howYouAreUnderstood}</LabelledBlock>
      </div>
      <ChapterFact fact={s.didYouKnow} />
    </>
  );
}

/** The one practice is the whole checklist here. */
export function MindRail({ s }: { s: MindSection }) {
  return (
    <ProseRail checklist={{
      heading: "Practice this week",
      items: [{ key: itemKey("mind", "practice", 0), action: s.practice }],
    }} />
  );
}

export function CareerBlock({ s }: { s: CareerSection }) {
  const k = newCitationCounter();
  return (
    <>
      <div className="rp-prose">
        <LabelledBlock label="Work that suits you" claims={s.claims} counter={k}>{s.vocationalPull}</LabelledBlock>
        <LabelledBlock label="How you come across at work" claims={s.claims} counter={k}>{s.howYouShowUp}</LabelledBlock>
        <LabelledBlock label="How work helps you grow" claims={s.claims} counter={k}>{s.growthThroughWork}</LabelledBlock>
      </div>
      <ChapterFact fact={s.didYouKnow} />
    </>
  );
}

export function CareerRail({ s }: { s: CareerSection }) {
  return (
    <ProseRail
      checklist={{ heading: "What to do", items: checklistItems("career", "actions", s.actions) }}
      listHeading="Career paths"
      listItems={s.careerPaths}
    />
  );
}

export function MoneyBlock({ s }: { s: MoneySection }) {
  const k = newCitationCounter();
  return (
    <div className="rp-prose">
      <LabelledBlock label="How you handle money" claims={s.claims} counter={k}>{s.relationshipToResources}</LabelledBlock>
      <LabelledBlock label="What works, and what does not" claims={s.claims} counter={k}>{s.whatWorks}</LabelledBlock>
      <LabelledBlock label="Shared money and exposure" claims={s.claims} counter={k}>{s.sharedAndExposed}</LabelledBlock>
    </div>
  );
}

export function MoneyRail({ s }: { s: MoneySection }) {
  return <ProseRail checklist={{ heading: "What to do", items: checklistItems("money", "actions", s.actions) }} />;
}

export function RelationshipsBlock({ s }: { s: RelationshipsSection }) {
  const k = newCitationCounter();
  return (
    <div className="rp-prose">
      <LabelledBlock label="How you love" claims={s.claims} counter={k}>{s.howYouLove}</LabelledBlock>
      <LabelledBlock label="What keeps going wrong" claims={s.claims} counter={k}>{s.theChallenge}</LabelledBlock>
      <LabelledBlock label="What a relationship needs from you" claims={s.claims} counter={k}>{s.whatPartnershipAsks}</LabelledBlock>
    </div>
  );
}

export function RelationshipsRail({ s }: { s: RelationshipsSection }) {
  return (
    <ProseRail
      checklist={{ heading: "What to do", items: checklistItems("relationships", "actions", s.actions) }}
      listHeading="You connect best with"
      listItems={s.connectBestWith}
    />
  );
}

export function FamilyBlock({ s }: { s: FamilySection }) {
  const k = newCitationCounter();
  return (
    <>
      <div className="rp-prose">
        <LabelledBlock label="What you got from your family" claims={s.claims} counter={k}>{s.whatYouCarry}</LabelledBlock>
        <LabelledBlock label="What keeps you steady" claims={s.claims} counter={k}>{s.whatRootsYou}</LabelledBlock>
        <LabelledBlock label="What you'd do differently" claims={s.claims} counter={k}>{s.theInheritedEdge}</LabelledBlock>
      </div>
      <ChapterFact fact={s.didYouKnow} />
    </>
  );
}

export function FamilyRail({ s }: { s: FamilySection }) {
  return <ProseRail checklist={{ heading: "What to do", items: checklistItems("family", "actions", s.actions) }} />;
}

function SuperpowerCard({ kicker, item, path, heading, claims, counter }: {
  kicker: string; item: SuperpowerItem; path: string; heading: ChecklistHeading;
  claims?: Claim[]; counter: CitationCounter;
}) {
  return (
    <div className="rp-box">
      <span className="rp-lab">{kicker}</span>
      <h3>{item.title}</h3>
      <p className="tn">{CitedText({ text: item.text, claims, counter })}</p>
      <Checklist heading={heading} items={checklistItems("superpowers", path, item.actions)} pinnable />
    </div>
  );
}

export function SuperpowersBlock({ s }: { s: SuperpowersSection }) {
  const k = newCitationCounter();
  return (
    <div>
      <SuperpowerCard kicker="Your superpower" item={s.superpower} path="superpower.actions" heading="How to use it" claims={s.claims} counter={k} />
      <SuperpowerCard kicker="A habit you'll always have to manage" item={s.chronicPattern} path="chronicPattern.actions" heading="How to manage it" claims={s.claims} counter={k} />
      <SuperpowerCard kicker="Where you can grow" item={s.growingEdge} path="growingEdge.actions" heading="Practice this week" claims={s.claims} counter={k} />
      <ChapterFact fact={s.didYouKnow} />
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
          <div className="iv">
            <span className="rp-lab">What helps</span>
            <p className="mt-1.5">{p.invitation}</p>
          </div>
        </div>
      ))}
      <ChapterFact fact={s.didYouKnow} />
    </div>
  );
}

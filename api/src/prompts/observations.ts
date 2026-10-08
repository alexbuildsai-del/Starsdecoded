/**
 * Observations (ADR-403): ideas that people who read charts keep noticing about one placement, each rewritten in
 * our words with a scene and the reason. An idea enters only with two independent sources: another creator, an
 * article, a book, or our doctrine when the planet's meaning and the house's or sign's in `vocabulary.ts` carry
 * the reason on their own. One account counts once, nothing is quoted, and hype, forecasts and guesses about a
 * reader's past never enter (R-5.2). An idea with one source waits in `docs/annex/observations-inbox.md`;
 * `/observe` adds to both from the Notion page "Observations inbox".
 *
 * The brief hands the writer the reader's matches, and House by House prints a card's one "Often noticed" from
 * here in code, never from model text (ADR-404). So every idea and reason is written to be read as it stands:
 * second person, plain words, "often", "may" or "tend to", and no closing full stop, which the brief and the
 * card add ("8th: <idea>. Why: <why>.").
 */
import { chartPatterns, hasHorizon, type NatalChartData } from "../lib/chartCalculation.js";
import { houseRulers } from "../lib/traditional.js";

/** Bodies as the chart names them ("north_node"), signs as the engine spells them ("Aquarius"). */
export type ObservationKey =
  | { kind: "planet-in-house"; body: string; house: number }
  | { kind: "planet-in-sign"; body: string; sign: string }
  | { kind: "stellium-in-house"; house: number }
  | { kind: "ruler-in-house"; of: number; house: number }
  | { kind: "aspect"; a: string; b: string; aspect: string };

export interface Observation {
  /** Stable, so a later `/observe` run merges a new source into the row it already has. */
  id: string;
  key: ObservationKey;
  idea: string;
  /** One moment the reader could picture, with when it shows. The writer adapts it and never copies it. */
  scene: string;
  why: string;
  sources: readonly { who: string; where: string }[];
}

function creator(who: string, slide: number): { who: string; where: string } {
  return { who, where: `TikTok, slide ${slide} on the Review 08/10 page` };
}

function doctrine(what: string): { who: string; where: string } {
  return { who: "Stars Decoded doctrine", where: `api/src/prompts/vocabulary.ts: ${what}` };
}

/**
 * A card shows only its first match (ADR-404), so the order is the choice: the two-creator stellium first, then
 * the house rows, then a house's ruler, then the sign rows, which reach the brief alone.
 */
export const OBSERVATIONS: readonly Observation[] = [
  {
    id: "stellium-8-people-open-up",
    key: { kind: "stellium-in-house", house: 8 },
    idea: "People often tell you personal things without you asking, and you can sense what drives them",
    scene: "Late at night, someone you met that evening tells you about a family worry, and you can tell what is really behind it",
    why: "the 8th is the house of depth and of what people share, and planets here make you easy to open up to",
    sources: [creator("@astrologyobserver", 31), creator("@anemowitch", 39)],
  },
  {
    id: "venus-2-pays-for-quality",
    key: { kind: "planet-in-house", body: "venus", house: 2 },
    idea: "You care about owning beautiful, well-made things, and you are happy to pay more for them",
    scene: "In a shop you walk past the cheap version and save up for the one that looks and feels right",
    why: "your Venus, the planet of beauty and pleasure, sits in your 2nd, the house of money and what you own",
    sources: [creator("@anemowitch", 14), doctrine("Venus; the 2nd house")],
  },
  {
    id: "jupiter-2-skills-into-income",
    key: { kind: "planet-in-house", body: "jupiter", house: 2 },
    idea: "You tend to spot ways to earn from the things you are good at",
    scene: "A friend admires something you made, and before the week is out you have worked out what to charge for it",
    why: "your Jupiter, the planet of growth and good chances, sits in your 2nd, the house of money and what you earn",
    sources: [creator("@anemowitch", 16), doctrine("Jupiter; the 2nd house")],
  },
  {
    id: "north-node-2-own-worth",
    key: { kind: "planet-in-house", body: "north_node", house: 2 },
    idea: "You grow most by building up your own money and learning what you are worth",
    scene: "Asking a fair price for your work feels awkward at first, and it gets a little easier each time you do it",
    why: "your North Node, which points to where you grow, sits in your 2nd, the house of money and what you value",
    sources: [creator("@anemowitch", 9), doctrine("North Node; the 2nd house")],
  },
  {
    id: "venus-4-peaceful-home",
    key: { kind: "planet-in-house", body: "venus", house: 4 },
    idea: "A calm, loving home is one of the things you want most in life",
    scene: "After a hard day you put on music, tidy the kitchen and light a candle, and your shoulders drop",
    why: "your Venus, the planet of love and making peace, sits in your 4th, the house of home and family",
    sources: [creator("@astronotebook", 19), doctrine("Venus; the 4th house")],
  },
  {
    id: "saturn-4-steady-home",
    key: { kind: "planet-in-house", body: "saturn", house: 4 },
    idea: "You like a steady, predictable home life, and you work to keep it that way",
    scene: "On Sunday evening you plan the week at home, and having the plan is what lets you relax",
    why: "your Saturn, the planet of structure and staying power, sits in your 4th, the house of home and family",
    sources: [creator("@astronotebook", 22), doctrine("Saturn; the 4th house")],
  },
  {
    id: "sun-10-leads-at-work",
    key: { kind: "planet-in-house", body: "sun", house: 10 },
    idea: "You feel most like yourself when you take the lead at work, and people tend to notice you there",
    scene: "In a meeting where nobody speaks up, you are the one who sets out the plan, and it feels natural",
    why: "your Sun, which is about who you are, sits in your 10th, the house of your work and how people see it",
    sources: [creator("@anemowitch", 12), doctrine("Sun; the 10th house")],
  },
  {
    id: "jupiter-10-says-yes-at-work",
    key: { kind: "planet-in-house", body: "jupiter", house: 10 },
    idea: "Your confidence shows most at work, and you are quick to say yes to a bigger role",
    scene: "When your manager asks who wants to lead the new project, your hand is up before you have thought it through",
    why: "your Jupiter, the planet of growth and saying yes, sits in your 10th, the house of your work",
    sources: [creator("@anemowitch", 12), doctrine("Jupiter; the 10th house")],
  },
  {
    id: "saturn-10-builds-slowly",
    key: { kind: "planet-in-house", body: "saturn", house: 10 },
    idea: "Your place at work comes from slow, steady effort more than from lucky breaks",
    scene: "At the end of a long week you stay to finish the dull part properly, because you want the work to hold up",
    why: "your Saturn, the planet of patience and staying power, sits in your 10th, the house of your career",
    sources: [creator("@anemowitch", 10), doctrine("Saturn; the 10th house")],
  },
  {
    id: "north-node-10-steps-into-view",
    key: { kind: "planet-in-house", body: "north_node", house: 10 },
    idea: "You grow most by moving from what feels safe and private toward a role where people can see you",
    scene: "When the team needs someone to present, part of you wants to stay in the background, and stepping up teaches you most",
    why: "your North Node, which points to where you grow, sits in your 10th, the house of your work and public life",
    sources: [creator("@anemowitch", 25), doctrine("North Node; the 10th house")],
  },
  {
    id: "jupiter-11-wide-circle",
    key: { kind: "planet-in-house", body: "jupiter", house: 11 },
    idea: "Your circle of friends tends to be wide and warm, and you often do your best work in a group",
    scene: "When you start something new, you send one message to your friends and three of them offer to help",
    why: "your Jupiter, the planet of growth and generosity, sits in your 11th, the house of friends and groups",
    sources: [creator("@anemowitch", 21), doctrine("Jupiter; the 11th house")],
  },
  {
    id: "ruler-4-in-10-family-and-work",
    key: { kind: "ruler-in-house", of: 4, house: 10 },
    idea: "Your family and your work tend to be linked, through their hopes for your career or through working together",
    scene: "At a family dinner the talk turns to your job again, and everyone has a view on your next step",
    why: "the planet in charge of your 4th, the house of family, sits in your 10th, the house of your work",
    sources: [creator("@astronotebook", 23), doctrine("the 4th and 10th houses; a house's matters happen where its ruler sits")],
  },
  {
    id: "moon-gemini-talks-it-through",
    key: { kind: "planet-in-sign", body: "moon", sign: "Gemini" },
    idea: "You work out how you feel by talking it through, sometimes more than once",
    scene: "After an argument you call two friends and tell it twice, and by the second call it makes sense to you",
    why: "your Moon, which is about feelings, is in Gemini, a sign that wants to talk things over",
    sources: [creator("@astrologyobserver", 33), doctrine("Moon; Gemini")],
  },
  {
    id: "moon-scorpio-senses-a-change",
    key: { kind: "planet-in-sign", body: "moon", sign: "Scorpio" },
    idea: "You often sense when someone's feelings about you change, sometimes before they notice it themselves",
    scene: "A friend answers your message a little more briefly than usual, and you can tell something is different before they say a word",
    why: "your Moon, which is about feelings, is in Scorpio, a sign that wants to know what is really going on",
    sources: [creator("@astrologyobserver", 29), doctrine("Moon; Scorpio")],
  },
  {
    id: "moon-aquarius-thinks-feelings-through",
    key: { kind: "planet-in-sign", body: "moon", sign: "Aquarius" },
    idea: "You tend to think a feeling through before you show it to anyone",
    scene: "When something upsets you at work, you go quiet for a day, sort out what you think, and only then talk about it",
    why: "your Moon, which is about feelings, is in Aquarius, a sign that stands back and thinks things through",
    sources: [creator("@astrologyobserver", 26), doctrine("Moon; Aquarius")],
  },
  {
    id: "moon-pisces-feelings-spill-over",
    key: { kind: "planet-in-sign", body: "moon", sign: "Pisces" },
    idea: "Your feelings sit close to the surface, and they can spill over when your guard is down",
    scene: "Late in the evening with old friends, a kind word makes your eyes fill up, and you laugh it off",
    why: "your Moon, which is about feelings, is in Pisces, a sign that takes in the moods around it and finds limits hard",
    sources: [creator("@astrologyobserver", 28), doctrine("Moon; Pisces")],
  },
  {
    id: "mercury-gemini-fits-the-listener",
    key: { kind: "planet-in-sign", body: "mercury", sign: "Gemini" },
    idea: "You change how you tell a story to suit whoever is listening, without changing the facts",
    scene: "Your boss and your best friend both hear about your weekend, and the two versions sound like different trips",
    why: "your Mercury, the planet of how you think and talk, is in Gemini, a sign that adapts quickly",
    sources: [creator("@astrologyobserver", 33), doctrine("Mercury; Gemini")],
  },
  {
    id: "mercury-leo-tells-it-warmly",
    key: { kind: "planet-in-sign", body: "mercury", sign: "Leo" },
    idea: "You tell stories with warmth and a bit of show, and people tend to listen",
    scene: "At dinner you act out the funny part of your day, voices and all, and the table goes quiet to hear it",
    why: "your Mercury, the planet of how you talk, is in Leo, a warm, open sign that likes to be seen",
    sources: [creator("@astrologyobserver", 34), doctrine("Mercury; Leo")],
  },
  {
    id: "mercury-virgo-spots-what-does-not-fit",
    key: { kind: "planet-in-sign", body: "mercury", sign: "Virgo" },
    idea: "You tend to spot a small detail that doesn't fit, even when it is buried in a long story",
    scene: "A colleague walks you through a plan, and you notice the one date that doesn't match the rest",
    why: "your Mercury, the planet of how you think and notice, is in Virgo, a sign that cares about details",
    sources: [creator("@astrologyobserver", 37), doctrine("Mercury; Virgo")],
  },
  {
    id: "mercury-scorpio-hears-the-unsaid",
    key: { kind: "planet-in-sign", body: "mercury", sign: "Scorpio" },
    idea: "You often pick up on what people leave unsaid",
    scene: "In a meeting you notice the one question nobody answered, and later you are the one who asks it again",
    why: "your Mercury, the planet of how you think, is in Scorpio, a sign that digs below the surface",
    sources: [creator("@anemowitch", 39), doctrine("Mercury; Scorpio")],
  },
  {
    id: "venus-leo-notices-fading-effort",
    key: { kind: "planet-in-sign", body: "venus", sign: "Leo" },
    idea: "In love you notice quickly when a partner's effort and warmth start to fade",
    scene: "When the small gestures stop, like the good-morning text or a word about how you look, you feel it before you say anything",
    why: "your Venus, the planet of love, is in Leo, a sign that wants to be seen and appreciated",
    sources: [creator("@astrologyobserver", 35), doctrine("Venus; Leo")],
  },
  {
    id: "mars-scorpio-keeps-the-memory",
    key: { kind: "planet-in-sign", body: "mars", sign: "Scorpio" },
    idea: "When someone treats you badly you may forgive them in time, but you don't forget it",
    scene: "Years after a friend let you down, you are friendly with them, and you still remember every detail",
    why: "your Mars, the planet of anger and how you fight, is in Scorpio, a sign that holds on hard",
    sources: [creator("@astrologyobserver", 27), doctrine("Mars; Scorpio")],
  },
];

/** A birth-time band can carry the Sun or the Moon over a sign line, and an idea about its sign waits until the band settles it. */
function settled(chart: NatalChartData, body: string): boolean {
  if (body === "sun") return chart.horizon.sunSign.holds;
  if (body === "moon") return chart.horizon.moonSign.holds;
  return true;
}

/** A ruler's idea is about the house it rules, whose story plays out where the ruler sits, so it goes on that house's card. */
function cardOf(key: ObservationKey): number | null {
  switch (key.kind) {
    case "planet-in-house":
    case "stellium-in-house":
      return key.house;
    case "ruler-in-house":
      return key.of;
    case "planet-in-sign":
    case "aspect":
      return null;
  }
}

/**
 * The reader's ideas in table order, each with the house card it belongs to. A stellium is the engine's
 * (`chartPatterns`, ADR-397), so the idea and the card's Stellium chip never disagree; a blind chart has no house
 * and matches only its signs and aspects (R-4.6).
 */
export function observationsFor(chart: NatalChartData): readonly { observation: Observation; house: number | null }[] {
  const stelliumHouses = new Set(chartPatterns(chart.planets, chart.angles).stelliums.map((s) => s.house));
  const rulers = hasHorizon(chart) ? houseRulers(chart) : [];
  const matches = (key: ObservationKey): boolean => {
    switch (key.kind) {
      case "planet-in-house":
        return settled(chart, key.body) && chart.planets[key.body]?.house === key.house;
      case "planet-in-sign":
        return settled(chart, key.body) && chart.planets[key.body]?.sign === key.sign;
      case "stellium-in-house":
        return stelliumHouses.has(key.house);
      case "ruler-in-house": {
        const ruler = rulers.find((r) => r.house === key.of);
        return ruler !== undefined && settled(chart, ruler.ruler) && ruler.rulerHouse === key.house;
      }
      case "aspect":
        return chart.aspects.some((a) =>
          a.type === key.aspect && ((a.planet1 === key.a && a.planet2 === key.b) || (a.planet1 === key.b && a.planet2 === key.a)));
    }
  };
  return OBSERVATIONS.filter((o) => matches(o.key)).map((observation) => ({ observation, house: cardOf(observation.key) }));
}

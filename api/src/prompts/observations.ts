/**
 * Observations (ADR-403): ideas that people who read charts keep noticing about one placement, each kept close to
 * how its source says it, with a scene and the reason. A source's good wording stays, lightly adapted so no line is
 * a word-for-word copy, and its hype goes (the Owner, 2026-10-09). An idea enters only with two independent sources:
 * another creator, an article, a book, or our doctrine when the planet's meaning and the house's or sign's in
 * `vocabulary.ts` carry the reason on their own. One account counts once, and hype, forecasts and guesses about a
 * reader's past never enter (R-5.2). An idea with one source waits in `docs/annex/observations-inbox.md`;
 * `/observe` adds to both from the Notion page "Observations inbox".
 *
 * The brief hands the writer the reader's matches, and House by House prints a card's one "Often noticed" from
 * here in code, never from model text (ADR-404). So every idea and reason is written to be read as it stands:
 * second person, plain words, "often", "may" or "tend to", and no closing full stop, which the brief and the
 * card add ("8th: <idea>. <idea>. Why: <why>.").
 */
import { chartPatterns, hasHorizon, type NatalChartData } from "../lib/chartCalculation.js";
import { houseRulers } from "../lib/traditional.js";

/** Bodies as the chart names them ("north_node"), signs as the engine spells them ("Aquarius"). */
export type ObservationKey =
  | { kind: "planet-in-house"; body: string; house: number }
  | { kind: "planet-in-sign"; body: string; sign: string }
  | { kind: "stellium-in-house"; house: number }
  | { kind: "ruler-in-house"; of: number; house: number }
  | { kind: "sign-on-house"; sign: string; house: number }
  | { kind: "aspect"; a: string; b: string; aspect: string };

/** One thing people with the placement tend to notice, with its own sources. */
export interface Idea {
  idea: string;
  /** One moment the reader could picture, with when it shows. A record for `/observe`; the brief does not print it. */
  scene: string;
  sources: readonly { who: string; where: string }[];
}

/**
 * One placement, its ideas best first (the first is the card's), read together so they never pull against each other
 * (the Owner, 2026-10-09). A new idea that does pull the other way waits on the annex's Check list.
 */
export interface Observation {
  /** Stable, so a later `/observe` run adds to the placement it already has. */
  id: string;
  key: ObservationKey;
  why: string;
  ideas: readonly Idea[];
}

function creator(who: string, slide: number): { who: string; where: string } {
  return { who, where: `TikTok, slide ${slide} on the Review 08/10 page` };
}

function inbox(who: string, slide: number): { who: string; where: string } {
  return { who, where: `TikTok, slide ${slide} on the Observations inbox page` };
}

function video(who: string, id: string): { who: string; where: string } {
  return { who, where: `TikTok video ${id}` };
}

function site(who: string, url: string): { who: string; where: string } {
  return { who, where: url };
}

function doctrine(what: string): { who: string; where: string } {
  return { who: "Stars Decoded doctrine", where: `api/src/prompts/vocabulary.ts: ${what}` };
}

/**
 * A card shows only its first match (ADR-404), so the order is the choice: the stelliums first, then the house
 * rows, then a house's ruler, then the sign on a house, then the sign rows and the aspects, which reach the brief alone.
 */
export const OBSERVATIONS: readonly Observation[] = [
  {
    id: "stellium-8-people-open-up",
    key: { kind: "stellium-in-house", house: 8 },
    why: "the 8th is the house of what people share, and a full 8th makes you easy to open up to",
    ideas: [
      {
        idea: "People tend to tell you very personal things without you even trying, and they feel safe being open with you",
        scene: "Late at night, someone you met that evening tells you about a family worry, and it feels natural to them",
        sources: [creator("@astrologyobserver", 31), creator("@anemowitch", 39)],
      },
    ],
  },
  {
    id: "stellium-12-needs-downtime",
    key: { kind: "stellium-in-house", house: 12 },
    why: "the 12th is the house of what is hidden and time alone, and a full 12th keeps much of you out of sight",
    ideas: [
      {
        idea: "You often need downtime and time alone to recharge, more than most people around you",
        scene: "After a busy weekend with friends, you cancel Monday's plans and stay in, and that quiet evening puts you back together",
        sources: [video("@the_innercosmos", "7636435899567443207"), doctrine("a stellium; the 12th house")],
      },
      {
        idea: "You may have a rich inner life few people ever see, quite separate from the life everyone knows",
        scene: "Friends think they know you well, yet the things you think about most at night you have never said out loud",
        sources: [video("@the_innercosmos", "7671694847346068754"), doctrine("a stellium; the 12th house")],
      },
    ],
  },
  {
    id: "stellium-6-list-never-ends",
    key: { kind: "stellium-in-house", house: 6 },
    why: "the 6th is the house of daily work and habits, and a full 6th puts much of your energy there",
    ideas: [
      {
        idea: "Life can feel like a never-ending list of things to do, and you may try to control every small task",
        scene: "On Sunday you write the week's list, and by Monday night it is longer than when you started",
        sources: [video("@the_innercosmos", "7646472360928775442"), doctrine("a stellium; the 6th house")],
      },
    ],
  },
  {
    id: "stellium-4-energy-from-home",
    key: { kind: "stellium-in-house", house: 4 },
    why: "the 4th is the house of home and family, and a full 4th makes home the centre of your life",
    ideas: [
      {
        idea: "You tend to get most of your energy back at home, so home needs to feel peaceful and looked after",
        scene: "After a long week out, an evening on your own sofa does more for you than any night out",
        sources: [video("@the_innercosmos", "7664354208983862546"), doctrine("a stellium; the 4th house")],
      },
      {
        idea: "Questions about family and where you come from may keep coming back to you, long into adult life",
        scene: "A family visit at the holidays stirs up the same old feelings, and you spend the drive home thinking it through",
        sources: [video("@the_innercosmos", "7682567228151106823"), doctrine("a stellium; the 4th house")],
      },
    ],
  },
  {
    id: "stellium-1-own-growth-first",
    key: { kind: "stellium-in-house", house: 1 },
    why: "the 1st is the house of self, and many planets here put your own life at the centre",
    ideas: [
      {
        idea: "Your own growth and finding out who you are tend to come first, and relationships may take a back seat for a while",
        scene: "Friends start moving in with partners, and you sign up for a course abroad instead, and it feels right",
        sources: [video("@the_innercosmos", "7629719711424515346"), doctrine("a stellium; the 1st house")],
      },
    ],
  },
  {
    id: "stellium-5-keeps-it-light",
    key: { kind: "stellium-in-house", house: 5 },
    why: "the 5th is the house of fun, romance and making things, and a full 5th puts much of your energy there",
    ideas: [
      {
        idea: "You tend to put fun, play and making things first, and settling down may not feel urgent to you",
        scene: "A friend asks when you will settle down, and you would honestly rather talk about the band you just joined",
        sources: [video("@the_innercosmos", "7629719711424515346"), doctrine("a stellium; the 5th house")],
      },
    ],
  },
  {
    id: "stellium-3-lifelong-learner",
    key: { kind: "stellium-in-house", house: 3 },
    why: "the 3rd is the house of learning and everyday talk, and a full 3rd keeps your mind busy there",
    ideas: [
      {
        idea: "You tend to keep learning all your life, and you enjoy the details and fine points of whatever you pick up",
        scene: "On a quiet Sunday you fall into an online course about something small, like the history of a word",
        sources: [video("@the_innercosmos", "7642803501839518983"), video("@the_innercosmos", "7676889731648605447"), doctrine("a stellium; the 3rd house")],
      },
    ],
  },
  {
    id: "stellium-9-lifelong-learner",
    key: { kind: "stellium-in-house", house: 9 },
    why: "the 9th is the house of study, belief and long trips, and a full 9th keeps you reaching further",
    ideas: [
      {
        idea: "You tend to keep learning all your life, and you are drawn to big ideas that stretch how you see the world",
        scene: "You finish a book on another country's history and start planning how to go and see it for yourself",
        sources: [video("@the_innercosmos", "7642803501839518983"), video("@the_innercosmos", "7676889731648605447"), doctrine("a stellium; the 9th house")],
      },
    ],
  },
  {
    id: "stellium-2-builds-security",
    key: { kind: "stellium-in-house", house: 2 },
    why: "the 2nd is the house of money and what you own, and a full 2nd puts much of your energy there",
    ideas: [
      {
        idea: "You may put a lot of energy into building money and things that make you feel safe",
        scene: "You check your savings more often than you would admit, and a full account lets you breathe out",
        sources: [video("@the_innercosmos", "7639030539202104594"), doctrine("a stellium; the 2nd house")],
      },
    ],
  },
  {
    id: "stellium-10-work-takes-over",
    key: { kind: "stellium-in-house", house: 10 },
    why: "the 10th is the house of work and standing, and a full 10th puts most of your energy there",
    ideas: [
      {
        idea: "Work may quietly become the main thing in your life, often before you decide it should",
        scene: "You look up from a work task and realise the whole evening has gone",
        sources: [site("The AstroTwins, astrostyle.com", "https://astrostyle.com/astrology/stellium/"), doctrine("a stellium; the 10th house")],
      },
    ],
  },
  {
    id: "sun-10-leads-at-work",
    key: { kind: "planet-in-house", body: "sun", house: 10 },
    why: "your Sun, which is about who you are, sits in your 10th, the house of your work",
    ideas: [
      {
        idea: "You lead naturally at work, and people tend to notice what you do there",
        scene: "In a meeting where nobody speaks up, you are the one who sets out the plan, and it feels natural",
        sources: [creator("@anemowitch", 12), doctrine("Sun; the 10th house")],
      },
      {
        idea: "You may feel strong pressure to succeed, and what you achieve can feel tied to who you are",
        scene: "After a promotion, you feel proud for a day and then start thinking about the next step up",
        sources: [video("@the_innercosmos", "7687697686237154568"), doctrine("Sun; the 10th house")],
      },
    ],
  },
  {
    id: "sun-12-hard-to-be-seen",
    key: { kind: "planet-in-house", body: "sun", house: 12 },
    why: "your Sun, the planet of who you are and your direction, is in your 12th, the house of time alone and what is hidden",
    ideas: [
      {
        idea: "You may find it hard to be seen for who you are, and you often do your best work out of sight",
        scene: "In a group project, you do the hard part quietly, and someone else presents it",
        sources: [video("@the_innercosmos", "7636839710832233735"), doctrine("Sun; the 12th house"), video("@the_innercosmos", "7687697686237154568")],
      },
    ],
  },
  {
    id: "moon-2-feels-safe-with-money",
    key: { kind: "planet-in-house", body: "moon", house: 2 },
    why: "your Moon, which is about feelings and needs, sits in your 2nd, the house of money and what you own",
    ideas: [
      {
        idea: "Your mood tends to be tied to money and the basics, so you feel calm when they are in order",
        scene: "Once the rent is paid and the fridge is full, you notice you sleep better",
        sources: [video("@the_innercosmos", "7663926797062475026"), doctrine("Moon; the 2nd house")],
      },
    ],
  },
  {
    id: "moon-3-moved-by-surroundings",
    key: { kind: "planet-in-house", body: "moon", house: 3 },
    why: "your Moon, which is about feelings, sits in your 3rd, the house of the places and people close to home",
    ideas: [
      {
        idea: "You react strongly to your surroundings, and a comfortable place can change how you feel",
        scene: "A bright cafe with a good chair lifts a heavy day, and a loud bus home brings it back",
        sources: [video("@the_innercosmos", "7636839710832233735"), doctrine("Moon; the 3rd house")],
      },
    ],
  },
  {
    id: "moon-6-routine-keeps-you-steady",
    key: { kind: "planet-in-house", body: "moon", house: 6 },
    why: "your Moon, which is about feelings and habits, sits in your 6th, the house of daily routine",
    ideas: [
      {
        idea: "Your routine is what keeps you steady, and you can feel off when it breaks",
        scene: "On holiday, by the third day without your usual morning, you feel oddly restless",
        sources: [video("@the_innercosmos", "7662856904208616712"), doctrine("Moon; the 6th house")],
      },
      {
        idea: "Your feelings may hum in the background all day, and you tend to look after them like another daily task",
        scene: "Between emails you check in on a small worry, the way you would check a pot on the stove",
        sources: [video("@the_innercosmos", "7670618877193243922"), doctrine("Moon; the 6th house")],
      },
    ],
  },
  {
    id: "moon-11-needs-your-people",
    key: { kind: "planet-in-house", body: "moon", house: 11 },
    why: "your Moon, which is about feelings, sits in your 11th, the house of friends and groups",
    ideas: [
      {
        idea: "You often feel deeply connected to your friends, and you need time with your people to feel good",
        scene: "After a hard week, an evening with your group of friends does more for you than a day in bed",
        sources: [video("@the_innercosmos", "7637716925233057031"), doctrine("Moon; the 11th house")],
      },
      {
        idea: "You may check how your friends feel about something before you know how you feel yourself",
        scene: "Something happens at work, and you message the group chat before you have decided whether you are upset",
        sources: [video("@the_innercosmos", "7634201685237173511"), doctrine("Moon; the 11th house")],
      },
    ],
  },
  {
    id: "mercury-6-needs-something-to-think-about",
    key: { kind: "planet-in-house", body: "mercury", house: 6 },
    why: "your Mercury, the planet of thinking, sits in your 6th, the house of daily work",
    ideas: [
      {
        idea: "You tend to need something that keeps your mind busy in your day-to-day, or the days start to drag",
        scene: "A dull week at work picks up the moment you get a new problem to solve",
        sources: [video("@the_innercosmos", "7683565924439297298"), doctrine("Mercury; the 6th house")],
      },
      {
        idea: "Small daily worries can wear on your mind over time, so a clear list helps you more than most",
        scene: "By Thursday your head is full of little to-dos, and writing them down is what lets you sleep",
        sources: [video("@the_innercosmos", "7670618877193243922"), doctrine("Mercury; the 6th house")],
      },
    ],
  },
  {
    id: "venus-1-noticed-first",
    key: { kind: "planet-in-house", body: "venus", house: 1 },
    why: "your Venus, the planet of attraction, sits in your 1st, the house of how people first see you",
    ideas: [
      {
        idea: "People often notice something about you before they can say why, and you draw them in just by being yourself",
        scene: "At a party where you know no one, people come over to talk to you before you have said much",
        sources: [inbox("@sarahmoodyofficial", 44), doctrine("Venus; the 1st house")],
      },
    ],
  },
  {
    id: "venus-2-pays-for-quality",
    key: { kind: "planet-in-house", body: "venus", house: 2 },
    why: "your Venus, the planet of beauty, sits in your 2nd, the house of money and what you own",
    ideas: [
      {
        idea: "You are often drawn to beautiful, well-made things, and you would rather pay more for quality",
        scene: "In a shop, you walk past the cheap version and save up for the one that looks and feels right",
        sources: [creator("@anemowitch", 14), doctrine("Venus; the 2nd house")],
      },
      {
        idea: "When you treat yourself as worth looking after, you may have a quiet confidence people feel without you saying a word",
        scene: "On a day you have slept well and dressed with care, people are warmer with you and you didn't do anything different",
        sources: [inbox("@sarahmoodyofficial", 45), video("@the_innercosmos", "7631982498859224327")],
      },
    ],
  },
  {
    id: "venus-3-wins-people-with-words",
    key: { kind: "planet-in-house", body: "venus", house: 3 },
    why: "your Venus, the planet of attraction, sits in your 3rd, the house of everyday talk",
    ideas: [
      {
        idea: "You win people over in conversation, and something you said can stay with them long after",
        scene: "A week after a chat at a friend's dinner, someone repeats a line of yours back to you",
        sources: [inbox("@sarahmoodyofficial", 46), video("@the_innercosmos", "7634201685237173511")],
      },
      {
        idea: "Long, deep talks are often what make you feel loved, and you miss them most when they stop",
        scene: "Weeks after a break-up, what you miss is not the dates but the late chats about everything and nothing",
        sources: [video("@the_innercosmos", "7665056734293101842"), doctrine("Venus; the 3rd house")],
      },
    ],
  },
  {
    id: "venus-4-peaceful-home",
    key: { kind: "planet-in-house", body: "venus", house: 4 },
    why: "your Venus, the planet of beauty and comfort, sits in your 4th, the house of home",
    ideas: [
      {
        idea: "You may want beautiful things around you at home, and you often have an eye for making a room feel good",
        scene: "You move a lamp and a plant around until the corner finally feels right",
        sources: [creator("@astronotebook", 19), site("Cafe Astrology (Annie Heese)", "https://cafeastrology.com/natal/venusinhouses.html"), site("Astrolibrary", "https://astrolibrary.org/interpretations/venus-house/")],
      },
      {
        idea: "Having a peaceful home is often one of your biggest goals in life",
        scene: "After a hard day, you put on music, tidy the kitchen and light a candle, and your shoulders drop",
        sources: [creator("@astronotebook", 19), doctrine("Venus; the 4th house")],
      },
      {
        idea: "People tend to feel safe with you, and something in them softens when they are in your space",
        scene: "A friend who came round for one coffee is still on your sofa three hours later, telling you everything",
        sources: [inbox("@sarahmoodyofficial", 47), doctrine("Venus; the 4th house")],
      },
    ],
  },
  {
    id: "venus-5-joy-is-catching",
    key: { kind: "planet-in-house", body: "venus", house: 5 },
    why: "your Venus, the planet of joy, sits in your 5th, the house of fun and love",
    ideas: [
      {
        idea: "You tend to be playful and open about what you love, and your fun gives other people permission to enjoy themselves too",
        scene: "At a wedding, you are first on the dance floor, and within a song half the table has followed",
        sources: [inbox("@sarahmoodyofficial", 48), video("@the_innercosmos", "7631982498859224327")],
      },
    ],
  },
  {
    id: "venus-6-love-in-small-things",
    key: { kind: "planet-in-house", body: "venus", house: 6 },
    why: "your Venus, the planet of love, sits in your 6th, the house of daily life and helping",
    ideas: [
      {
        idea: "You tend to show love in the little things, day after day, and that steady care is what people notice",
        scene: "You remember how your partner takes their coffee, and it is ready before they ask",
        sources: [inbox("@sarahmoodyofficial", 49), video("@the_innercosmos", "7631982498859224327"), video("@the_innercosmos", "7665056734293101842"), doctrine("Venus; the 6th house")],
      },
    ],
  },
  {
    id: "venus-7-meets-people-where-they-are",
    key: { kind: "planet-in-house", body: "venus", house: 7 },
    why: "your Venus, the planet of love and peace, sits in your 7th, the house of partners",
    ideas: [
      {
        idea: "You tend to meet people where they are and keep things balanced, so one-to-one bonds come easily to you",
        scene: "In an argument between two friends, both of them end up calling you, and each feels heard",
        sources: [inbox("@sarahmoodyofficial", 50), video("@the_innercosmos", "7631982498859224327")],
      },
    ],
  },
  {
    id: "venus-8-not-afraid-of-depth",
    key: { kind: "planet-in-house", body: "venus", house: 8 },
    why: "your Venus, the planet of love, sits in your 8th, the house of what is shared and what scares people",
    ideas: [
      {
        idea: "You are often not scared of the deep, private side of love, and people sense there is more to you than you show",
        scene: "On a second date, you skip the small talk and ask what they are really afraid of, and they answer",
        sources: [inbox("@sarahmoodyofficial", 51), video("@the_innercosmos", "7631982498859224327")],
      },
    ],
  },
  {
    id: "venus-9-makes-the-world-bigger",
    key: { kind: "planet-in-house", body: "venus", house: 9 },
    why: "your Venus, the planet of what you love, sits in your 9th, the house of far places and big ideas",
    ideas: [
      {
        idea: "You tend to fall for people and things that make your world bigger, and others feel their own world grow around you",
        scene: "A dinner with you ends with your friend booking a trip they had only ever talked about",
        sources: [inbox("@sarahmoodyofficial", 52), video("@the_innercosmos", "7631982498859224327")],
      },
    ],
  },
  {
    id: "venus-10-admired-for-your-work",
    key: { kind: "planet-in-house", body: "venus", house: 10 },
    why: "your Venus, the planet of charm, sits in your 10th, the house of your work and what you're known for",
    ideas: [
      {
        idea: "People tend to admire you for your work, and you shine most when the job fits what you care about",
        scene: "Your manager asks you to show the new team how it's done, because people like learning from you",
        sources: [inbox("@sarahmoodyofficial", 53), doctrine("Venus; the 10th house")],
      },
    ],
  },
  {
    id: "venus-11-sets-the-tone",
    key: { kind: "planet-in-house", body: "venus", house: 11 },
    why: "your Venus, the planet of love, sits in your 11th, the house of friends and groups",
    ideas: [
      {
        idea: "You are often the friend who brings people together and quietly sets the mood and the plan for the group",
        scene: "The group chat goes quiet until you suggest a place, and then everyone is suddenly free on Friday",
        sources: [inbox("@sarahmoodyofficial", 54), video("@the_innercosmos", "7634201685237173511")],
      },
      {
        idea: "Friendship tends to be the heart of love for you, and it is what you miss most if love ends",
        scene: "Your best relationships started as friends, and after one ends you miss the easy laughs most",
        sources: [video("@the_innercosmos", "7665056734293101842"), video("@the_innercosmos", "7631982498859224327"), doctrine("Venus; the 11th house")],
      },
    ],
  },
  {
    id: "venus-12-loves-quietly",
    key: { kind: "planet-in-house", body: "venus", house: 12 },
    why: "your Venus, the planet of love, sits in your 12th, the house of what goes on out of sight",
    ideas: [
      {
        idea: "You tend to love quietly and deeply, and you show it more in what you do than in what you say",
        scene: "You never say much at a goodbye, but you were the one who drove them to the airport at five in the morning",
        sources: [inbox("@sarahmoodyofficial", 17), video("@the_innercosmos", "7631982498859224327")],
      },
    ],
  },
  {
    id: "mars-1-works-alone",
    key: { kind: "planet-in-house", body: "mars", house: 1 },
    why: "your Mars, the planet of drive, sits in your 1st, the house of you",
    ideas: [
      {
        idea: "You act on your own steam, and you often work better alone than in a group project",
        scene: "Handed a group task, you quietly do your part, then most of everyone else's, because it's quicker",
        sources: [video("@the_innercosmos", "7644348208428125448"), doctrine("Mars; the 1st house")],
      },
    ],
  },
  {
    id: "mars-4-works-well-from-home",
    key: { kind: "planet-in-house", body: "mars", house: 4 },
    why: "your Mars, the planet of fight and drive, is in your 4th, the house of home and private life",
    ideas: [
      {
        idea: "You tend to get the most done from home",
        scene: "On a work-from-home day, you finish by lunch what took all week in the office",
        sources: [video("@the_innercosmos", "7632551227552795911"), doctrine("Mars; the 4th house")],
      },
      {
        idea: "You may feel on guard at home, and sharing a home with others can take real effort",
        scene: "A flatmate moves your things around, and you feel far more annoyed than the moment needs",
        sources: [video("@the_innercosmos", "7634201685237173511"), doctrine("Mars; the 4th house")],
      },
    ],
  },
  {
    id: "mars-6-needs-to-keep-moving",
    key: { kind: "planet-in-house", body: "mars", house: 6 },
    why: "your Mars, the planet of energy, sits in your 6th, the house of daily work and your body",
    ideas: [
      {
        idea: "You tend to do best when your days keep you active, and sitting still all day wears you down",
        scene: "On a day stuck at a desk, you take the stairs four times just to move",
        sources: [video("@the_innercosmos", "7683565924439297298"), doctrine("Mars; the 6th house")],
      },
    ],
  },
  {
    id: "mars-11-works-well-with-friends",
    key: { kind: "planet-in-house", body: "mars", house: 11 },
    why: "your Mars, the planet of drive, sits in your 11th, the house of friends and groups",
    ideas: [
      {
        idea: "You often get going best when you work with friends or for a group you belong to",
        scene: "You would skip the gym alone, but you never miss the Tuesday run with your friends",
        sources: [video("@the_innercosmos", "7632551227552795911"), doctrine("Mars; the 11th house")],
      },
    ],
  },
  {
    id: "mars-12-drive-kept-inside",
    key: { kind: "planet-in-house", body: "mars", house: 12 },
    why: "your Mars, the planet of drive and anger, sits in your 12th, the house of what goes on out of sight",
    ideas: [
      {
        idea: "You may keep your anger and your drive inside, so it can be hard to tell what you really want",
        scene: "Someone asks what you are passionate about, and you have to stop and think",
        sources: [video("@the_innercosmos", "7636435899567443207"), doctrine("Mars; the 12th house")],
      },
    ],
  },
  {
    id: "jupiter-1-makes-more-feel-possible",
    key: { kind: "planet-in-house", body: "jupiter", house: 1 },
    why: "your Jupiter, the planet of growth, sits in your 1st, the house of you",
    ideas: [
      {
        idea: "Your presence tends to make people feel more is possible, and things open up when you stop waiting for permission to be yourself",
        scene: "A friend leaves a coffee with you suddenly sure they can apply for the job",
        sources: [inbox("@sarahmoodyofficial", 55), video("@the_innercosmos", "7641613715170675976")],
      },
    ],
  },
  {
    id: "jupiter-2-skills-into-income",
    key: { kind: "planet-in-house", body: "jupiter", house: 2 },
    why: "your Jupiter, the planet of growth, sits in your 2nd, the house of money",
    ideas: [
      {
        idea: "You tend to trust what your time and skills are worth, and you rarely sell yourself short for long",
        scene: "When a client asks for a discount, you hold your price and they usually agree",
        sources: [inbox("@sarahmoodyofficial", 12), site("Cafe Astrology (Annie Heese)", "https://cafeastrology.com/articles/jupiterinhouses.html"), site("Astrolibrary", "https://astrolibrary.org/interpretations/jupiter-house/")],
      },
      {
        idea: "You often have a knack for making money from what you are good at",
        scene: "A friend admires something you made, and before the week is out you have worked out what to charge for it",
        sources: [creator("@anemowitch", 16), doctrine("Jupiter; the 2nd house")],
      },
    ],
  },
  {
    id: "jupiter-3-grows-through-questions",
    key: { kind: "planet-in-house", body: "jupiter", house: 3 },
    why: "your Jupiter, the planet of growth, sits in your 3rd, the house of talking and learning",
    ideas: [
      {
        idea: "You grow by asking questions freely and sharing what you find, and a good conversation often opens a door",
        scene: "A chat with a neighbour about their job turns into the course you sign up for",
        sources: [inbox("@sarahmoodyofficial", 3), doctrine("Jupiter; the 3rd house")],
      },
    ],
  },
  {
    id: "jupiter-4-grows-from-home",
    key: { kind: "planet-in-house", body: "jupiter", house: 4 },
    why: "your Jupiter, the planet of growth, sits in your 4th, the house of home and roots",
    ideas: [
      {
        idea: "You tend to grow best from a home that feels safe and supportive, where you know you belong",
        scene: "Once your flat finally feels like yours, the rest of your plans start moving too",
        sources: [inbox("@sarahmoodyofficial", 60), doctrine("Jupiter; the 4th house")],
      },
    ],
  },
  {
    id: "jupiter-5-follows-what-excites-you",
    key: { kind: "planet-in-house", body: "jupiter", house: 5 },
    why: "your Jupiter, the planet of growth, sits in your 5th, the house of fun and making things",
    ideas: [
      {
        idea: "Life tends to open up when you follow what excites you, more than what seems practical",
        scene: "The hobby you nearly gave up for something sensible is the one that brings you new friends and work",
        sources: [inbox("@sarahmoodyofficial", 59), doctrine("Jupiter; the 5th house")],
      },
    ],
  },
  {
    id: "jupiter-6-small-habits-add-up",
    key: { kind: "planet-in-house", body: "jupiter", house: 6 },
    why: "your Jupiter, the planet of growth, sits in your 6th, the house of daily work and habits",
    ideas: [
      {
        idea: "You tend to grow quietly, by taking the small daily things seriously, and steady habits add up for you",
        scene: "Ten minutes of practice each morning, and a year later you are the one people ask for help",
        sources: [inbox("@sarahmoodyofficial", 1), doctrine("Jupiter; the 6th house")],
      },
    ],
  },
  {
    id: "jupiter-7-chances-through-people",
    key: { kind: "planet-in-house", body: "jupiter", house: 7 },
    why: "your Jupiter, the planet of good chances, sits in your 7th, the house of partners and one-to-one bonds",
    ideas: [
      {
        idea: "Many of your chances tend to come through the people you meet, more than through what you do alone",
        scene: "The best job you had came from a person you sat next to on a train",
        sources: [inbox("@sarahmoodyofficial", 63), doctrine("Jupiter; the 7th house")],
      },
    ],
  },
  {
    id: "jupiter-9-keeps-learning",
    key: { kind: "planet-in-house", body: "jupiter", house: 9 },
    why: "your Jupiter, the planet of growth, sits in your 9th, the house of big ideas, study and travel",
    ideas: [
      {
        idea: "Curiosity often opens doors for you, and your view of the world keeps growing as you learn",
        scene: "A book you picked up on holiday leads to a course, and the course changes what you want to do",
        sources: [inbox("@sarahmoodyofficial", 58), doctrine("Jupiter; the 9th house")],
      },
      {
        idea: "You tend to feel most open and hopeful when you travel or spend time abroad",
        scene: "On a trip, a missed train leads you to a stranger who shows you the best meal of your life",
        sources: [video("@the_innercosmos", "7642803501839518983"), doctrine("Jupiter; the 9th house")],
      },
    ],
  },
  {
    id: "jupiter-10-says-yes-at-work",
    key: { kind: "planet-in-house", body: "jupiter", house: 10 },
    why: "your Jupiter, the planet of growth and saying yes, sits in your 10th, the house of your work",
    ideas: [
      {
        idea: "You are often quick to say yes to more responsibility at work, and people start to see your potential",
        scene: "When your manager asks who wants to lead the new project, your hand is up before you have thought it through",
        sources: [creator("@anemowitch", 12), inbox("@sarahmoodyofficial", 62), doctrine("Jupiter; the 10th house")],
      },
    ],
  },
  {
    id: "jupiter-11-wide-circle",
    key: { kind: "planet-in-house", body: "jupiter", house: 11 },
    why: "your Jupiter, the planet of generosity, sits in your 11th, the house of friends and groups",
    ideas: [
      {
        idea: "The people around you often bring you new chances, and you do your best work with a wide, warm circle",
        scene: "When you start something new, you send one message to your friends and three of them offer to help",
        sources: [creator("@anemowitch", 21), inbox("@sarahmoodyofficial", 61), doctrine("Jupiter; the 11th house")],
      },
    ],
  },
  {
    id: "saturn-3-afraid-of-the-wrong-word",
    key: { kind: "planet-in-house", body: "saturn", house: 3 },
    why: "your Saturn, where you're hard on yourself, sits in your 3rd, the house of talking and thinking",
    ideas: [
      {
        idea: "You may worry about saying the wrong thing or being misunderstood, and your voice gets steadier the more you use it",
        scene: "You draft a message three times before sending it, and the reply is kinder than you feared",
        sources: [video("@the_innercosmos", "7595271659750231304"), doctrine("Saturn; the 3rd house")],
      },
    ],
  },
  {
    id: "saturn-4-steady-home",
    key: { kind: "planet-in-house", body: "saturn", house: 4 },
    why: "your Saturn, the planet of rules and building, sits in your 4th, the house of home and family",
    ideas: [
      {
        idea: "You may like a steady, even predictable home life, because stability is what lets you relax",
        scene: "On Sunday evening, you plan the week at home, and having the plan is what lets you relax",
        sources: [creator("@astronotebook", 22), doctrine("Saturn; the 4th house")],
      },
      {
        idea: "Home may take real work to feel safe for you, and you tend to build your own idea of what home should be",
        scene: "You spend a free weekend fixing up your place, because a calm home is something you made yourself",
        sources: [video("@the_innercosmos", "7595271659750231304"), doctrine("Saturn; the 4th house")],
      },
    ],
  },
  {
    id: "saturn-6-basic-tasks-feel-heavy",
    key: { kind: "planet-in-house", body: "saturn", house: 6 },
    why: "your Saturn, the planet of being hard on yourself, is in your 6th, the house of work, habits and a body under strain",
    ideas: [
      {
        idea: "The most basic day-to-day tasks can feel heavy, even when the big things go fine",
        scene: "You give a talk to fifty people without a problem, but the email to the landlord sits for a week",
        sources: [video("@the_innercosmos", "7641613715170675976"), doctrine("Saturn; the 6th house")],
      },
      {
        idea: "You may push through work and duties past the point of tiredness, so rest needs to be planned in",
        scene: "You keep working through a cold for a week, and only stop when your body makes you",
        sources: [video("@the_innercosmos", "7595271659750231304"), doctrine("Saturn; the 6th house")],
      },
    ],
  },
  {
    id: "saturn-10-builds-slowly",
    key: { kind: "planet-in-house", body: "saturn", house: 10 },
    why: "your Saturn, the planet of patience, sits in your 10th, the house of your career",
    ideas: [
      {
        idea: "Your place at work tends to come from slow, steady effort, not overnight success, and what you build there lasts",
        scene: "At the end of a long week, you stay to finish the dull part properly, because you want the work to hold up",
        sources: [creator("@anemowitch", 10), video("@the_innercosmos", "7595280983746825480"), doctrine("Saturn; the 10th house")],
      },
    ],
  },
  {
    id: "saturn-11-feels-like-the-odd-one-out",
    key: { kind: "planet-in-house", body: "saturn", house: 11 },
    why: "your Saturn, where you're hard on yourself, sits in your 11th, the house of friends and groups",
    ideas: [
      {
        idea: "You may feel like a bit of a misfit in groups, even among friends",
        scene: "At a big birthday, you end up in the kitchen with the one person you know well",
        sources: [video("@the_innercosmos", "7595280983746825480"), doctrine("Saturn; the 11th house")],
      },
    ],
  },
  {
    id: "north-node-2-own-worth",
    key: { kind: "planet-in-house", body: "north_node", house: 2 },
    why: "your North Node, which shows where you grow, sits in your 2nd, the house of money and self-worth",
    ideas: [
      {
        idea: "You tend to grow most by building your own stable base and learning what you are worth",
        scene: "Asking a fair price for your work feels awkward at first, and it gets a little easier each time you do it",
        sources: [creator("@anemowitch", 9), doctrine("North Node; the 2nd house")],
      },
    ],
  },
  {
    id: "north-node-8-learns-to-receive",
    key: { kind: "planet-in-house", body: "north_node", house: 8 },
    why: "your North Node, which shows where you grow, sits in your 8th, the house of what other people give and share",
    ideas: [
      {
        idea: "You tend to grow by learning to receive from other people, help and gifts included",
        scene: "A friend offers to pay for dinner, and this time you say thank you instead of reaching for your card",
        sources: [video("@the_innercosmos", "7668041069497453831"), doctrine("North Node; the 8th house")],
      },
    ],
  },
  {
    id: "north-node-10-steps-into-view",
    key: { kind: "planet-in-house", body: "north_node", house: 10 },
    why: "your North Node, which shows where you grow, sits in your 10th, the house of public life",
    ideas: [
      {
        idea: "You grow most by stepping out of your private comfort zone into roles where people can see you",
        scene: "When the team needs someone to present, part of you wants to stay in the background, and stepping up teaches you most",
        sources: [creator("@anemowitch", 25), doctrine("North Node; the 10th house")],
      },
    ],
  },
  {
    id: "south-node-6-stays-busy",
    key: { kind: "planet-in-house", body: "south_node", house: 6 },
    why: "your South Node, what you fall back on, sits in your 6th, the house of daily tasks",
    ideas: [
      {
        idea: "You may keep busy with the day-to-day and forget to make time for your inner life",
        scene: "Your free Sunday fills up with errands, and the journal stays shut for another week",
        sources: [video("@the_innercosmos", "7669812308712901896"), doctrine("South Node; the 6th house")],
      },
    ],
  },
  {
    id: "south-node-12-likes-own-company",
    key: { kind: "planet-in-house", body: "south_node", house: 12 },
    why: "your South Node, what you fall back on, sits in your 12th, the house of time alone",
    ideas: [
      {
        idea: "You may enjoy your own company so much that making new friends takes real effort",
        scene: "You are invited out on Friday, and part of you is relieved when it gets cancelled",
        sources: [video("@the_innercosmos", "7624759271179177223"), doctrine("South Node; the 12th house")],
      },
    ],
  },
  {
    id: "sun-8-keeps-self-private",
    key: { kind: "planet-in-house", body: "sun", house: 8 },
    why: "your Sun, which is who you are, sits in your 8th, the house of what is hidden and shared with few",
    ideas: [
      {
        idea: "You often keep your real self private, and people may take a long time to really know you",
        scene: "Friends of years still learn something about you that surprises them",
        sources: [site("The AstroTwins, astrostyle.com", "https://astrostyle.com/astrology/8th-house/"), site("Astrolibrary", "https://astrolibrary.org/interpretations/sun-house/")],
      },
      {
        idea: "When you get very close to someone, you may lose a bit of yourself in them",
        scene: "A few months into a relationship, you notice your weekends, music and plans have all quietly become theirs",
        sources: [video("@the_innercosmos", "7636839710832233735"), doctrine("Sun; the 8th house")],
      },
    ],
  },
  {
    id: "sun-6-feels-like-self-at-work",
    key: { kind: "planet-in-house", body: "sun", house: 6 },
    why: "your Sun, the planet of who you are, is in your 6th, the house of daily work and habits",
    ideas: [
      {
        idea: "You tend to feel most like yourself when you work hard and keep good daily routines",
        scene: "A week where you get up early, work well and cook properly leaves you feeling more like you than any holiday",
        sources: [video("@the_innercosmos", "7687697686237154568"), doctrine("Sun; the 6th house")],
      },
    ],
  },
  {
    id: "moon-12-looks-after-others-feelings",
    key: { kind: "planet-in-house", body: "moon", house: 12 },
    why: "your Moon, the planet of feelings and needs, is in your 12th, the house of what is hidden and private sadness",
    ideas: [
      {
        idea: "You may look after other people's feelings and keep your own needs quiet, even from yourself",
        scene: "A friend is having a hard week, and you only notice how tired you are once they feel better",
        sources: [video("@the_innercosmos", "7639030539202104594"), doctrine("Moon; the 12th house")],
      },
    ],
  },
  {
    id: "mars-8-shared-money-friction",
    key: { kind: "planet-in-house", body: "mars", house: 8 },
    why: "your Mars, the planet of conflict, is in your 8th, the house of shared money and debt",
    ideas: [
      {
        idea: "Shared money can turn into a point of conflict for you, so clear agreements tend to help",
        scene: "Splitting a bill with a partner turns tense fast, until you set up a simple shared account",
        sources: [video("@the_innercosmos", "7665056734293101842"), doctrine("Mars; the 8th house")],
      },
    ],
  },
  {
    id: "jupiter-8-help-through-shared-money",
    key: { kind: "planet-in-house", body: "jupiter", house: 8 },
    why: "your Jupiter, the planet of help and growth, is in your 8th, the house of shared money and what is passed down",
    ideas: [
      {
        idea: "You may find it easy to accept help and support from the people close to you",
        scene: "When you need a deposit for a flat, a relative offers to help before you even ask",
        sources: [video("@the_innercosmos", "7642803501839518983"), doctrine("Jupiter; the 8th house")],
      },
      {
        idea: "You tend to dig to the root of things, and subjects that shock others rarely shock you",
        scene: "A friend lowers their voice to tell you something awkward, and you just ask what happened next",
        sources: [inbox("@sarahmoodyofficial", 57), site("Cafe Astrology (Annie Heese)", "https://cafeastrology.com/articles/jupiterinhouses.html")],
      },
    ],
  },
  {
    id: "saturn-1-waits-for-permission",
    key: { kind: "planet-in-house", body: "saturn", house: 1 },
    why: "your Saturn, the planet of where you get good slowly, is in your 1st, the house of self",
    ideas: [
      {
        idea: "You may hold back from being fully yourself until you feel allowed, and confidence comes slowly but lasts",
        scene: "In a new job you keep quiet for months, then one day say exactly what you think, and it lands",
        sources: [video("@the_innercosmos", "7595271659750231304"), doctrine("Saturn; the 1st house")],
      },
    ],
  },
  {
    id: "saturn-2-worth-and-enough",
    key: { kind: "planet-in-house", body: "saturn", house: 2 },
    why: "your Saturn, the planet of fear and limits, is in your 2nd, the house of money and whether you feel you have enough",
    ideas: [
      {
        idea: "You may tie your sense of worth to what you earn and own, and feel you never quite have enough",
        scene: "Even with savings in the bank, a surprise bill makes you feel like you are back at zero",
        sources: [video("@the_innercosmos", "7595271659750231304"), doctrine("Saturn; the 2nd house")],
      },
    ],
  },
  {
    id: "saturn-5-fun-takes-permission",
    key: { kind: "planet-in-house", body: "saturn", house: 5 },
    why: "your Saturn, the planet of fear and limits, is in your 5th, the house of fun and making things",
    ideas: [
      {
        idea: "Letting yourself play, create or be seen enjoying something may not come easily, and fun can feel like something you must earn",
        scene: "At a party, you hang back from the dance floor until the room is nearly empty",
        sources: [video("@the_innercosmos", "7595271659750231304"), video("@the_innercosmos", "7634201685237173511"), doctrine("Saturn; the 5th house")],
      },
    ],
  },
  {
    id: "saturn-7-slow-to-trust-partners",
    key: { kind: "planet-in-house", body: "saturn", house: 7 },
    why: "your Saturn, the planet of fear and staying power, is in your 7th, the house of partners",
    ideas: [
      {
        idea: "You tend to start close relationships slowly, and once you commit you take it very seriously",
        scene: "Looking back, you notice the people you chose were often ones who could never quite commit",
        sources: [video("@the_innercosmos", "7595280983746825480"), video("@the_innercosmos", "7641613715170675976"), video("@the_innercosmos", "7645683992129260808"), doctrine("Saturn; the 7th house"), site("Cafe Astrology (Annie Heese)", "https://cafeastrology.com/articles/saturninhouses.html"), site("Astrolibrary", "https://astrolibrary.org/interpretations/saturn-house/")],
      },
    ],
  },
  {
    id: "saturn-8-hard-to-let-go",
    key: { kind: "planet-in-house", body: "saturn", house: 8 },
    why: "your Saturn, the planet of fear, is in your 8th, the house of shared money and what you cannot control",
    ideas: [
      {
        idea: "Letting go and being emotionally open with someone may not come easily to you, and shared money can feel heavy",
        scene: "A partner suggests a joint account, and you find a dozen reasons to wait",
        sources: [video("@the_innercosmos", "7595280983746825480"), video("@the_innercosmos", "7665056734293101842"), doctrine("Saturn; the 8th house")],
      },
    ],
  },
  {
    id: "saturn-9-big-trips-feel-daunting",
    key: { kind: "planet-in-house", body: "saturn", house: 9 },
    why: "your Saturn, the planet of fear and slow growth, is in your 9th, the house of long trips, study and belief",
    ideas: [
      {
        idea: "You may want to travel far or study further, yet it can feel daunting, and your own beliefs form slowly and carefully",
        scene: "You keep a list of countries you want to see, but booking the flight takes you a long time",
        sources: [video("@the_innercosmos", "7595280983746825480"), video("@the_innercosmos", "7646472360928775442"), doctrine("Saturn; the 9th house")],
      },
    ],
  },
  {
    id: "saturn-12-alone-but-not-switched-off",
    key: { kind: "planet-in-house", body: "saturn", house: 12 },
    why: "your Saturn, the planet of being hard on yourself, is in your 12th, the house of time alone",
    ideas: [
      {
        idea: "You may need time alone, yet find it hard to fully switch off when you get it",
        scene: "You clear an evening for yourself, then spend it going over what you should have done better",
        sources: [video("@the_innercosmos", "7595280983746825480"), doctrine("Saturn; the 12th house")],
      },
    ],
  },
  {
    id: "pluto-1-remakes-self",
    key: { kind: "planet-in-house", body: "pluto", house: 1 },
    why: "your Pluto, the planet of deep change, is in your 1st, the house of self",
    ideas: [
      {
        idea: "You tend to change deeply over time, and after a hard stretch you may feel like a different person",
        scene: "Old friends meet you after a few years and say you seem like someone new, in a good way",
        sources: [video("@the_innercosmos", "7592300380881521928"), video("@the_innercosmos", "7642803501839518983"), doctrine("Pluto; the 1st house")],
      },
    ],
  },
  {
    id: "pluto-2-money-and-control",
    key: { kind: "planet-in-house", body: "pluto", house: 2 },
    why: "your Pluto, the planet of intensity and control, is in your 2nd, the house of money and what you own",
    ideas: [
      {
        idea: "Money and what you own can feel tied to your safety, and earning it can take over your attention",
        scene: "A work project about money swallows your evenings, and you only notice when a friend asks where you have been",
        sources: [video("@the_innercosmos", "7592300380881521928"), video("@the_innercosmos", "7668777458413374727"), doctrine("Pluto; the 2nd house")],
      },
    ],
  },
  {
    id: "pluto-3-words-carry-weight",
    key: { kind: "planet-in-house", body: "pluto", house: 3 },
    why: "your Pluto, the planet of intensity and power, is in your 3rd, the house of everyday talk and siblings",
    ideas: [
      {
        idea: "Words carry a lot of weight for you, and everyday talk can turn into a quiet tug of war",
        scene: "A small comment from a sibling stays with you all day, and you replay what you should have said",
        sources: [video("@the_innercosmos", "7592300380881521928"), doctrine("Pluto; the 3rd house")],
      },
    ],
  },
  {
    id: "pluto-4-family-stirs-strong-feelings",
    key: { kind: "planet-in-house", body: "pluto", house: 4 },
    why: "your Pluto, the planet of intensity, is in your 4th, the house of family and roots",
    ideas: [
      {
        idea: "Home and family can stir strong feelings in you, and you may want to set your own rules for home",
        scene: "After a family dinner, you sit in the car for a few minutes before you feel ready to drive",
        sources: [video("@the_innercosmos", "7592300380881521928"), video("@the_innercosmos", "7662856904208616712"), doctrine("Pluto; the 4th house")],
      },
    ],
  },
  {
    id: "pluto-5-all-in-on-love-and-making",
    key: { kind: "planet-in-house", body: "pluto", house: 5 },
    why: "your Pluto, the planet of intensity, is in your 5th, the house of romance and making things",
    ideas: [
      {
        idea: "You tend to love and create with great intensity, and it can sting when someone else outshines you",
        scene: "A creative project takes over your nights, and a friend's similar idea feels oddly personal",
        sources: [video("@the_innercosmos", "7592300380881521928"), video("@the_innercosmos", "7668777458413374727"), doctrine("Pluto; the 5th house")],
      },
    ],
  },
  {
    id: "pluto-6-loses-self-in-work",
    key: { kind: "planet-in-house", body: "pluto", house: 6 },
    why: "your Pluto, the planet of intensity, is in your 6th, the house of daily work and service",
    ideas: [
      {
        idea: "You may push hard to be useful and get every task right, to the point of losing yourself in work",
        scene: "You redo a report three times at midnight, though nobody asked for it to be perfect",
        sources: [video("@the_innercosmos", "7592300380881521928"), video("@the_innercosmos", "7663926797062475026"), video("@the_innercosmos", "7668777458413374727"), doctrine("Pluto; the 6th house")],
      },
    ],
  },
  {
    id: "pluto-7-nothing-casual",
    key: { kind: "planet-in-house", body: "pluto", house: 7 },
    why: "your Pluto, the planet of intensity and deep change, is in your 7th, the house of partners",
    ideas: [
      {
        idea: "Your close relationships tend to be intense, and there is rarely anything casual about them for you",
        scene: "Even a short fling leaves you changed, and you think about it for months",
        sources: [video("@the_innercosmos", "7592308142399081746"), video("@the_innercosmos", "7662112110750567688"), video("@the_innercosmos", "7637716925233057031"), doctrine("Pluto; the 7th house")],
      },
    ],
  },
  {
    id: "pluto-8-watches-for-betrayal",
    key: { kind: "planet-in-house", body: "pluto", house: 8 },
    why: "your Pluto, the planet of what you cannot control, is in your 8th, the house of closeness, fear and what is lost",
    ideas: [
      {
        idea: "Being emotionally open with someone may feel risky, and part of you may watch for betrayal",
        scene: "Someone you are dating is slow to text back, and your mind goes straight to the worst reason",
        sources: [video("@the_innercosmos", "7592308142399081746"), doctrine("Pluto; the 8th house")],
      },
    ],
  },
  {
    id: "pluto-9-beliefs-change-deeply",
    key: { kind: "planet-in-house", body: "pluto", house: 9 },
    why: "your Pluto, the planet of deep change, is in your 9th, the house of belief",
    ideas: [
      {
        idea: "Your beliefs tend to go through big changes, and you may let go of views you were handed",
        scene: "A trip or a book shakes something you believed for years, and you rebuild your view from scratch",
        sources: [video("@the_innercosmos", "7592308142399081746"), doctrine("Pluto; the 9th house")],
      },
    ],
  },
  {
    id: "pluto-10-success-matters-intensely",
    key: { kind: "planet-in-house", body: "pluto", house: 10 },
    why: "your Pluto, the planet of intensity and power, is in your 10th, the house of career and reputation",
    ideas: [
      {
        idea: "Success and how people see you can matter intensely to you",
        scene: "One bad review at work keeps you up at night, while ten good ones barely register",
        sources: [video("@the_innercosmos", "7592308142399081746"), doctrine("Pluto; the 10th house")],
      },
    ],
  },
  {
    id: "pluto-11-intense-friendships",
    key: { kind: "planet-in-house", body: "pluto", house: 11 },
    why: "your Pluto, the planet of intensity and power, is in your 11th, the house of friends and groups",
    ideas: [
      {
        idea: "Friendships and groups can be intense for you, and you may often ask yourself where you really fit",
        scene: "A falling-out in your friend group affects you more than a break-up would",
        sources: [video("@the_innercosmos", "7592308142399081746"), video("@the_innercosmos", "7642803501839518983"), doctrine("Pluto; the 11th house")],
      },
    ],
  },
  {
    id: "pluto-12-hidden-fears",
    key: { kind: "planet-in-house", body: "pluto", house: 12 },
    why: "your Pluto, the planet of what you cannot control, is in your 12th, the house of what is hidden and how you trip yourself up",
    ideas: [
      {
        idea: "You may keep some fears well out of sight, and notice you sometimes work against yourself without knowing why",
        scene: "Just as something good is about to happen, you find a reason to step back from it",
        sources: [video("@the_innercosmos", "7592308142399081746"), doctrine("Pluto; the 12th house")],
      },
    ],
  },
  {
    id: "chiron-3-second-guesses-voice",
    key: { kind: "planet-in-house", body: "chiron", house: 3 },
    why: "your Chiron, your sore spot, is in your 3rd, the house of everyday talk and learning",
    ideas: [
      {
        idea: "You may second-guess how you speak and think, even when you know your stuff",
        scene: "In a meeting you know the answer, but you rehearse it in your head until the moment has passed",
        sources: [video("@the_innercosmos", "7664354208983862546"), video("@the_innercosmos", "7693693721165991176"), doctrine("Chiron; the 3rd house")],
      },
    ],
  },
  {
    id: "chiron-4-belonging-is-tender",
    key: { kind: "planet-in-house", body: "chiron", house: 4 },
    why: "your Chiron, your sore spot, is in your 4th, the house of home and family",
    ideas: [
      {
        idea: "Feeling that you belong at home may be a tender spot, and you may become good at making others feel at home",
        scene: "A friend is new in town, and you are the first to invite them for dinner",
        sources: [video("@the_innercosmos", "7693693721165991176"), doctrine("Chiron; the 4th house")],
      },
    ],
  },
  {
    id: "chiron-2-money-is-tender",
    key: { kind: "planet-in-house", body: "chiron", house: 2 },
    why: "your Chiron, your sore spot, is in your 2nd, the house of money and what you value",
    ideas: [
      {
        idea: "Money and your own worth may be a tender spot, and a small money worry can hit harder than it should",
        scene: "A friend jokes about how much you spend, and it stays with you all evening",
        sources: [video("@the_innercosmos", "7693693721165991176"), doctrine("Chiron; the 2nd house")],
      },
    ],
  },
  {
    id: "chiron-7-partnership-is-tender",
    key: { kind: "planet-in-house", body: "chiron", house: 7 },
    why: "your Chiron, your sore spot, is in your 7th, the house of partners",
    ideas: [
      {
        idea: "One-to-one relationships may be a tender spot, and you may end up helping others with theirs",
        scene: "Friends come to you for advice about their partners, even when your own love life feels unsure",
        sources: [video("@the_innercosmos", "7693693721165991176"), doctrine("Chiron; the 7th house")],
      },
    ],
  },
  {
    id: "north-node-1-grows-by-self-discovery",
    key: { kind: "planet-in-house", body: "north_node", house: 1 },
    why: "your North Node, the direction you grow in, is in your 1st, the house of self",
    ideas: [
      {
        idea: "You tend to grow by putting your own path first, even when fitting around others feels easier",
        scene: "You turn down a plan that suits everyone else and take the course you have wanted for years",
        sources: [video("@the_innercosmos", "7629719711424515346"), doctrine("North Node; the 1st house")],
      },
    ],
  },
  {
    id: "uranus-4-friends-become-family",
    key: { kind: "planet-in-house", body: "uranus", house: 4 },
    why: "Uranus, the planet of standing apart, sits in your 4th, the house of home and roots",
    ideas: [
      {
        idea: "You may not always feel you fit in at home, so you often build your own base, where friends become family",
        scene: "At the holidays, the table you look forward to most is the one with your friends",
        sources: [creator("@astronotebook", 11), site("Cafe Astrology (Annie Heese)", "https://cafeastrology.com/articles/uranusinhouses.html"), site("The AstroTwins, astrostyle.com", "https://astrostyle.com/astrology/4th-house/")],
      },
    ],
  },
  {
    id: "jupiter-12-quiet-faith",
    key: { kind: "planet-in-house", body: "jupiter", house: 12 },
    why: "your Jupiter, the planet of hope, sits in your 12th, the house of the inner life and time alone",
    ideas: [
      {
        idea: "You tend to carry a quiet faith that things will work out, even when they look hard",
        scene: "On a bad week, you go for a walk alone and come back calmer than when you left",
        sources: [inbox("@sarahmoodyofficial", 64), creator("@anemowitch", 38), site("Cafe Astrology (Annie Heese)", "https://cafeastrology.com/articles/jupiterinhouses.html"), site("Astrolibrary", "https://astrolibrary.org/interpretations/jupiter-house/")],
      },
    ],
  },
  {
    id: "ruler-4-in-10-family-and-work",
    key: { kind: "ruler-in-house", of: 4, house: 10 },
    why: "the planet in charge of your 4th, the house of family, sits in your 10th, the house of your work",
    ideas: [
      {
        idea: "Your family and your work tend to be linked, through big hopes they have for your career or through working together",
        scene: "At a family dinner, the talk turns to your job again, and everyone has a view on your next step",
        sources: [creator("@astronotebook", 23), doctrine("the 4th and 10th houses; a house plays out where its planet in charge sits")],
      },
    ],
  },
  {
    id: "aries-on-2-starts-on-instinct",
    key: { kind: "sign-on-house", sign: "Aries", house: 2 },
    why: "Aries, a sign that moves first and fast, starts your 2nd, the house of money and what you're good at",
    ideas: [
      {
        idea: "Your strength is getting things started on instinct, and the same push can show up as impulse buys",
        scene: "You start a side project the night you think of it, and order the kit for it before bed",
        sources: [inbox("@sarahmoodyofficial", 31), video("@the_innercosmos", "7588954773794098440")],
      },
    ],
  },
  {
    id: "taurus-on-2-knows-what-is-worth-it",
    key: { kind: "sign-on-house", sign: "Taurus", house: 2 },
    why: "Taurus, a steady sign that likes what lasts, starts your 2nd, the house of money and value",
    ideas: [
      {
        idea: "You often have natural taste and know what gets better with time, so you won't rush a good thing",
        scene: "Friends buy the trend, and you buy the one coat you will still wear in ten years",
        sources: [inbox("@sarahmoodyofficial", 32), video("@the_innercosmos", "7648743147853335815")],
      },
      {
        idea: "You tend to stay in your comfort zone with money, and a risk can feel bigger to you than it is",
        scene: "A good chance to start something on the side comes up, and you wait so long it passes",
        sources: [video("@the_innercosmos", "7588954773794098440"), doctrine("Taurus; the 2nd house")],
      },
    ],
  },
  {
    id: "gemini-on-2-earns-with-words",
    key: { kind: "sign-on-house", sign: "Gemini", house: 2 },
    why: "Gemini, a sign that is quick with words, starts your 2nd, the house of money and what you're good at",
    ideas: [
      {
        idea: "Your strength is your mind and your words, and one single way of earning is rarely enough for you",
        scene: "You have a day job, a small tutoring gig and an idea for a newsletter, and you like it that way",
        sources: [inbox("@sarahmoodyofficial", 33), video("@the_innercosmos", "7629868337488563463")],
      },
    ],
  },
  {
    id: "cancer-on-2-warmth-is-the-gift",
    key: { kind: "sign-on-house", sign: "Cancer", house: 2 },
    why: "Cancer, the sign that protects itself and gets defensive under strain, is on your 2nd, the house of money",
    ideas: [
      {
        idea: "Your gift is often a warmth that lets people drop their shoulders around you",
        scene: "A nervous new colleague sits next to you, and by lunch they are laughing",
        sources: [inbox("@sarahmoodyofficial", 34), doctrine("Cancer; the 2nd house")],
      },
      {
        idea: "When money gets tight, you may pull back into your shell instead of facing it head on",
        scene: "A worrying bank email arrives, and you leave it unopened for days",
        sources: [video("@the_innercosmos", "7588954773794098440"), doctrine("Cancer; the 2nd house")],
      },
    ],
  },
  {
    id: "virgo-on-2-small-fixes",
    key: { kind: "sign-on-house", sign: "Virgo", house: 2 },
    why: "Virgo, a sign that notices details, starts your 2nd, the house of what you're good at",
    ideas: [
      {
        idea: "You see what others miss, and you know how one small change can make the whole thing better",
        scene: "You move one line in a friend's CV, and suddenly it reads like a different person",
        sources: [inbox("@sarahmoodyofficial", 36), video("@the_innercosmos", "7671694847346068754")],
      },
      {
        idea: "You may hold off on earning from something until every detail is right",
        scene: "Your side project sits ready for months while you fix one more small thing",
        sources: [video("@the_innercosmos", "7588954773794098440"), doctrine("Virgo; the 2nd house")],
      },
    ],
  },
  {
    id: "libra-on-2-beauty-matters",
    key: { kind: "sign-on-house", sign: "Libra", house: 2 },
    why: "Libra, a sign with good taste, starts your 2nd, the house of money and value",
    ideas: [
      {
        idea: "You tend to know what a moment needs to feel beautiful, and how your work and money look matters to you",
        scene: "You redo the slides for a work pitch because the colours didn't sit right, and the pitch goes better",
        sources: [inbox("@sarahmoodyofficial", 37), video("@the_innercosmos", "7648743147853335815")],
      },
    ],
  },
  {
    id: "scorpio-on-2-asks-the-hard-question",
    key: { kind: "sign-on-house", sign: "Scorpio", house: 2 },
    why: "Scorpio, a sign that wants to know what is really going on, starts your 2nd, the house of what you're good at",
    ideas: [
      {
        idea: "You often ask the questions people have been avoiding, and that honesty is one of your strengths",
        scene: "A friend talks about their job for an hour, and you ask the one thing they hadn't said out loud",
        sources: [inbox("@sarahmoodyofficial", 38), doctrine("Scorpio; the 2nd house")],
      },
      {
        idea: "You tend to keep money matters private, and they go better that way",
        scene: "Friends talk salaries over dinner, and you change the subject",
        sources: [video("@the_innercosmos", "7640208559560494344"), doctrine("Scorpio; the 2nd house")],
      },
    ],
  },
  {
    id: "sagittarius-on-2-turns-experience-into-advice",
    key: { kind: "sign-on-house", sign: "Sagittarius", house: 2 },
    why: "Sagittarius, a sign that teaches and says what it thinks, starts your 2nd, the house of what you're good at",
    ideas: [
      {
        idea: "You turn what you have lived through into advice people can use",
        scene: "A friend facing a move abroad calls you, because you always know what to say after your own year away",
        sources: [inbox("@sarahmoodyofficial", 39), doctrine("Sagittarius; the 2nd house")],
      },
      {
        idea: "You tend to love the start of a money idea more than the follow-through",
        scene: "You have three half-built side hustles, each one exciting for the first month",
        sources: [video("@the_innercosmos", "7588993184147967240"), doctrine("Sagittarius; the 2nd house")],
      },
    ],
  },
  {
    id: "capricorn-on-2-builds-quietly",
    key: { kind: "sign-on-house", sign: "Capricorn", house: 2 },
    why: "Capricorn, a sign that plays the long game, starts your 2nd, the house of money and what you build",
    ideas: [
      {
        idea: "You tend to build quietly and patiently, and you don't announce what you are making until it is real",
        scene: "Friends only hear about your business when it already has its first customers",
        sources: [inbox("@sarahmoodyofficial", 40), video("@the_innercosmos", "7588993184147967240")],
      },
    ],
  },
  {
    id: "aquarius-on-2-ahead-of-its-time",
    key: { kind: "sign-on-house", sign: "Aquarius", house: 2 },
    why: "Aquarius, a sign that thinks in patterns and cares about the group, starts your 2nd, the house of what you're good at",
    ideas: [
      {
        idea: "Your ideas can be ahead of their time, and you do best when your work gives something back to a group",
        scene: "People shrug at your idea in one year and ask about it three years later",
        sources: [inbox("@sarahmoodyofficial", 41), video("@the_innercosmos", "7671694847346068754")],
      },
    ],
  },
  {
    id: "pisces-on-2-imagination-needs-structure",
    key: { kind: "sign-on-house", sign: "Pisces", house: 2 },
    why: "Pisces, an imaginative sign, starts your 2nd, the house of money and what you're good at",
    ideas: [
      {
        idea: "Your strength is often imagination and feeling, and a little structure is what lets it pay off",
        scene: "Your best ideas live in a notebook of sketches, and they only move once you put them in a plan",
        sources: [inbox("@sarahmoodyofficial", 42), video("@the_innercosmos", "7588993184147967240")],
      },
    ],
  },
  {
    id: "taurus-on-3-learns-slowly",
    key: { kind: "sign-on-house", sign: "Taurus", house: 3 },
    why: "Taurus, a sign that won't be rushed, starts your 3rd, the house of learning",
    ideas: [
      {
        idea: "You tend to take your time when you learn something new",
        scene: "You read the manual twice before you try the new phone, and then you know it better than anyone",
        sources: [video("@the_innercosmos", "7644348208428125448"), doctrine("Taurus; the 3rd house")],
      },
    ],
  },
  {
    id: "gemini-on-3-picks-up-languages",
    key: { kind: "sign-on-house", sign: "Gemini", house: 3 },
    why: "Gemini, a sign that is quick with words, starts your 3rd, the house of talking and learning",
    ideas: [
      {
        idea: "You tend to pick up new languages and new ways of talking quickly",
        scene: "Two weeks into a trip, you are ordering food in the local language",
        sources: [video("@the_innercosmos", "7629868337488563463"), doctrine("Gemini; the 3rd house")],
      },
    ],
  },
  {
    id: "virgo-on-3-speaks-precisely",
    key: { kind: "sign-on-house", sign: "Virgo", house: 3 },
    why: "Virgo, a sign that cares about details, starts your 3rd, the house of everyday talk",
    ideas: [
      {
        idea: "You tend to be very precise in the way you say things",
        scene: "You correct one word in a group message because it changes what the sentence means",
        sources: [video("@the_innercosmos", "7637716925233057031"), doctrine("Virgo; the 3rd house")],
      },
    ],
  },
  {
    id: "capricorn-on-3-speaks-slowly",
    key: { kind: "sign-on-house", sign: "Capricorn", house: 3 },
    why: "Capricorn, a careful, serious sign, starts your 3rd, the house of talking",
    ideas: [
      {
        idea: "You may need time to find the words for what you feel, so you tend to speak slowly and carefully",
        scene: "In a hard conversation, you say less than the others, and what you say is what they remember",
        sources: [inbox("@sarahmoodyofficial", 24), doctrine("Capricorn; the 3rd house")],
      },
    ],
  },
  {
    id: "pisces-on-3-speaks-dreamily",
    key: { kind: "sign-on-house", sign: "Pisces", house: 3 },
    why: "Pisces, an imaginative sign, starts your 3rd, the house of everyday talk",
    ideas: [
      {
        idea: "You tend to talk in a dreamy way, in pictures and feelings more than facts",
        scene: "Asked for directions, you describe the blue door and the smell of the bakery, not the street names",
        sources: [video("@the_innercosmos", "7637716925233057031"), doctrine("Pisces; the 3rd house")],
      },
    ],
  },
  {
    id: "cancer-on-4-attached-to-home",
    key: { kind: "sign-on-house", sign: "Cancer", house: 4 },
    why: "Cancer, a sign that holds on to memories, starts your 4th, the house of home",
    ideas: [
      {
        idea: "You get very attached to your home and want it soft and cosy, so moving can be hard",
        scene: "Packing up a flat, you keep stopping to sit with old cards and photos",
        sources: [video("@the_innercosmos", "7637971474736811271"), doctrine("Cancer; the 4th house")],
      },
    ],
  },
  {
    id: "virgo-on-4-clutter-free-home",
    key: { kind: "sign-on-house", sign: "Virgo", house: 4 },
    why: "Virgo, a tidy, careful sign, starts your 4th, the house of home",
    ideas: [
      {
        idea: "You tend to want a home that is organised and clutter-free",
        scene: "Before guests arrive, you clear every surface, and you feel calmer than they do",
        sources: [video("@the_innercosmos", "7670618877193243922"), doctrine("Virgo; the 4th house")],
      },
    ],
  },
  {
    id: "libra-on-4-well-decorated-home",
    key: { kind: "sign-on-house", sign: "Libra", house: 4 },
    why: "Libra, a sign with good taste, starts your 4th, the house of home",
    ideas: [
      {
        idea: "You tend to want a home that looks good, and you care how every room is put together",
        scene: "You spend a month choosing one lamp, and friends notice it the moment they walk in",
        sources: [video("@the_innercosmos", "7670618877193243922"), doctrine("Libra; the 4th house")],
      },
    ],
  },
  {
    id: "aquarius-on-5-likes-the-unusual-ones",
    key: { kind: "sign-on-house", sign: "Aquarius", house: 5 },
    why: "Aquarius, a sign that stands a little apart, starts your 5th, the house of love and fun",
    ideas: [
      {
        idea: "You tend to fall for people who are a bit unusual and proudly themselves",
        scene: "Your friends meet your new date and say they are not who they expected, and you take that as a good sign",
        sources: [video("@the_innercosmos", "7639030539202104594"), doctrine("Aquarius; the 5th house")],
      },
    ],
  },
  {
    id: "capricorn-on-5-no-casual-dating",
    key: { kind: "sign-on-house", sign: "Capricorn", house: 5 },
    why: "Capricorn, a serious sign that plans for the long run, starts your 5th, the house of love",
    ideas: [
      {
        idea: "You tend not to do casual dating, and if it is not going anywhere you lose interest",
        scene: "Three dates in, you ask where it is heading, and you mean it",
        sources: [video("@the_innercosmos", "7640208559560494344"), doctrine("Capricorn; the 5th house")],
      },
      {
        idea: "Even your hobbies tend to need a goal, and pure play can feel like wasted time",
        scene: "You take up running for fun, and within a month you have signed up for a race",
        sources: [video("@the_innercosmos", "7648743147853335815"), doctrine("Capricorn; the 5th house")],
      },
    ],
  },
  {
    id: "gemini-on-6-needs-variety",
    key: { kind: "sign-on-house", sign: "Gemini", house: 6 },
    why: "Gemini, a restless, curious sign, starts your 6th, the house of daily work and routine",
    ideas: [
      {
        idea: "The same routine every day wears you out, so you tend to mix up how and where you work",
        scene: "By Wednesday you have worked from the kitchen, a cafe and the office, and you got more done that way",
        sources: [video("@the_innercosmos", "7629868337488563463"), doctrine("Gemini; the 6th house")],
      },
    ],
  },
  {
    id: "virgo-on-6-likes-a-set-routine",
    key: { kind: "sign-on-house", sign: "Virgo", house: 6 },
    why: "Virgo, a sign that likes method, starts your 6th, the house of daily routine",
    ideas: [
      {
        idea: "You tend to do best when your days are structured, organised and predictable",
        scene: "Your week runs on a list, and an unplanned day off makes you more tired, not less",
        sources: [video("@the_innercosmos", "7683565924439297298"), doctrine("Virgo; the 6th house")],
      },
    ],
  },
  {
    id: "leo-on-6-needs-a-creative-outlet",
    key: { kind: "sign-on-house", sign: "Leo", house: 6 },
    why: "Leo, a sign that wants to make things, starts your 6th, the house of daily life",
    ideas: [
      {
        idea: "Your daily life often needs room for something creative, or the routine starts to feel flat",
        scene: "Even on a busy weekday, you make time to sketch, cook properly or sing in the car",
        sources: [video("@the_innercosmos", "7683565924439297298"), doctrine("Leo; the 6th house")],
      },
    ],
  },
  {
    id: "aries-on-7-fights-hard-in-love",
    key: { kind: "sign-on-house", sign: "Aries", house: 7 },
    why: "Aries, a sign that is quick to fight, starts your 7th, the house of partners",
    ideas: [
      {
        idea: "You may come across as easygoing, but you can fight hard in your close relationships",
        scene: "Everyone thinks of you as the calm one, and your partner knows you never back down in a row",
        sources: [video("@the_innercosmos", "7669812308712901896"), doctrine("Aries; the 7th house")],
      },
    ],
  },
  {
    id: "scorpio-on-7-keeps-love-private",
    key: { kind: "sign-on-house", sign: "Scorpio", house: 7 },
    why: "Scorpio, a private sign, starts your 7th, the house of partners",
    ideas: [
      {
        idea: "You tend to keep your relationships private, and they do better away from other people's eyes",
        scene: "You have been together a year before most of your friends know their name",
        sources: [video("@the_innercosmos", "7640208559560494344"), doctrine("Scorpio; the 7th house")],
      },
    ],
  },
  {
    id: "aquarius-on-7-quirky-partners",
    key: { kind: "sign-on-house", sign: "Aquarius", house: 7 },
    why: "Aquarius, a sign that stands a little apart, starts your 7th, the house of one-to-one bonds",
    ideas: [
      {
        idea: "You tend to be drawn into one-to-one bonds with quirky, unconventional people",
        scene: "Your closest people would never meet at a normal party, and that is why you love them",
        sources: [video("@the_innercosmos", "7664354208983862546"), doctrine("Aquarius; the 7th house")],
      },
    ],
  },
  {
    id: "pisces-on-7-blurs-limits-in-love",
    key: { kind: "sign-on-house", sign: "Pisces", house: 7 },
    why: "Pisces, a sign that finds it hard to keep clear limits, starts your 7th, the house of partners",
    ideas: [
      {
        idea: "In close relationships you may blur your own limits and lose yourself in the other person",
        scene: "Six months into a relationship, you realise you have stopped seeing your own friends",
        sources: [video("@the_innercosmos", "7632551227552795911"), doctrine("Pisces; the 7th house")],
      },
    ],
  },
  {
    id: "gemini-on-9-views-keep-changing",
    key: { kind: "sign-on-house", sign: "Gemini", house: 9 },
    why: "Gemini, a curious sign that sees another angle, starts your 9th, the house of what you believe",
    ideas: [
      {
        idea: "Your view of life tends to change a lot over the years",
        scene: "You reread something you believed strongly at twenty and barely recognise yourself",
        sources: [video("@the_innercosmos", "7629868337488563463"), doctrine("Gemini; the 9th house")],
      },
    ],
  },
  {
    id: "capricorn-on-9-plans-the-trip",
    key: { kind: "sign-on-house", sign: "Capricorn", house: 9 },
    why: "Capricorn, a sign that plans for the long run, starts your 9th, the house of long trips",
    ideas: [
      {
        idea: "You tend to plan a trip properly before you go",
        scene: "Your holiday has a spreadsheet with train times, and you still come home with money left over",
        sources: [video("@the_innercosmos", "7666841398510931207"), doctrine("Capricorn; the 9th house")],
      },
    ],
  },
  {
    id: "cancer-on-10-known-for-caring",
    key: { kind: "sign-on-house", sign: "Cancer", house: 10 },
    why: "Cancer, a sign that senses what people need, starts your 10th, the house of what you're known for",
    ideas: [
      {
        idea: "Your care is often one of the most visible things about you, and people know you for sensing what is needed",
        scene: "At work, you are the one people come to when something is wrong and they can't name it",
        sources: [inbox("@sarahmoodyofficial", 25), doctrine("Cancer; the 10th house")],
      },
    ],
  },
  {
    id: "gemini-on-10-wears-many-hats",
    key: { kind: "sign-on-house", sign: "Gemini", house: 10 },
    why: "Gemini, a sign that wants to know a little about everything, starts your 10th, the house of your work",
    ideas: [
      {
        idea: "You tend to wear more than one hat at work, and one fixed title rarely fits you",
        scene: "Your job description says one thing, and your week covers four",
        sources: [video("@the_innercosmos", "7629868337488563463"), doctrine("Gemini; the 10th house")],
      },
    ],
  },
  {
    id: "taurus-on-11-takes-time-with-friends",
    key: { kind: "sign-on-house", sign: "Taurus", house: 11 },
    why: "Taurus, a slow, loyal sign, starts your 11th, the house of friends",
    ideas: [
      {
        idea: "You take your time making new friends, and the ones you make tend to stay",
        scene: "You took a year to warm up to your neighbour, and now you have keys to each other's flats",
        sources: [video("@the_innercosmos", "7644348208428125448"), doctrine("Taurus; the 11th house")],
      },
    ],
  },
  {
    id: "gemini-on-11-many-friend-groups",
    key: { kind: "sign-on-house", sign: "Gemini", house: 11 },
    why: "Gemini, a friendly, curious sign, starts your 11th, the house of friends and groups",
    ideas: [
      {
        idea: "You make friends fast, and you tend to have several different friend groups",
        scene: "Your birthday has three groups who have never met, and you move between them all night",
        sources: [video("@the_innercosmos", "7629868337488563463"), doctrine("Gemini; the 11th house")],
      },
    ],
  },
  {
    id: "cancer-on-11-holds-on-to-old-friends",
    key: { kind: "sign-on-house", sign: "Cancer", house: 11 },
    why: "Cancer, a sign that remembers everything, starts your 11th, the house of friends",
    ideas: [
      {
        idea: "Your friendships tend to be nostalgic, and old friends are hard for you to let go",
        scene: "You still meet your school friends every December, even though you have little else in common",
        sources: [video("@the_innercosmos", "7637971474736811271"), doctrine("Cancer; the 11th house")],
      },
    ],
  },
  {
    id: "cancer-on-12-senses-more-than-you-say",
    key: { kind: "sign-on-house", sign: "Cancer", house: 12 },
    why: "Cancer, a sign that senses what others feel, starts your 12th, the house of what stays out of sight",
    ideas: [
      {
        idea: "You pick up a lot that you never say out loud, and it can pile up when it has nowhere to go",
        scene: "After a family visit, you need a long walk alone to sort out everything you felt in the room",
        sources: [inbox("@sarahmoodyofficial", 27), doctrine("Cancer; the 12th house")],
      },
    ],
  },
  {
    id: "gemini-1-hates-the-box",
    key: { kind: "sign-on-house", sign: "Gemini", house: 1 },
    why: "Gemini, the sign of change and curiosity, is on your 1st, the house of self",
    ideas: [
      {
        idea: "You may reinvent yourself often, and you dislike being put in one box",
        scene: "Someone introduces you as 'the sporty one', and you feel the urge to prove you are more than that",
        sources: [video("@the_innercosmos", "7629868337488563463"), doctrine("Gemini; the 1st house")],
      },
    ],
  },
  {
    id: "gemini-4-home-is-a-feeling",
    key: { kind: "sign-on-house", sign: "Gemini", house: 4 },
    why: "Gemini, the restless and adaptable sign, is on your 4th, the house of home",
    ideas: [
      {
        idea: "Home tends to be a feeling more than a place for you, and moving may not scare you",
        scene: "You have lived in five flats in eight years, and each one felt like home within a week",
        sources: [video("@the_innercosmos", "7629868337488563463"), doctrine("Gemini; the 4th house")],
      },
    ],
  },
  {
    id: "gemini-5-likes-variety",
    key: { kind: "sign-on-house", sign: "Gemini", house: 5 },
    why: "Gemini, the curious and changeable sign, is on your 5th, the house of fun, romance and making things",
    ideas: [
      {
        idea: "You tend to like variety in dating and in what you make, and your interests go through phases",
        scene: "This year it is pottery, last year it was guitar, and you enjoyed both fully",
        sources: [video("@the_innercosmos", "7629868337488563463"), doctrine("Gemini; the 5th house")],
      },
    ],
  },
  {
    id: "gemini-7-needs-talk-and-change",
    key: { kind: "sign-on-house", sign: "Gemini", house: 7 },
    why: "Gemini, the sign of talk and change, is on your 7th, the house of partners",
    ideas: [
      {
        idea: "You need a partner you can always talk to, and a relationship that stands still may start to feel flat",
        scene: "The bond that lasts is the one where you can still talk for hours on a long drive",
        sources: [video("@the_innercosmos", "7629868337488563463"), doctrine("Gemini; the 7th house")],
      },
    ],
  },
  {
    id: "gemini-8-steps-back-from-heavy",
    key: { kind: "sign-on-house", sign: "Gemini", house: 8 },
    why: "Gemini, the light and restless sign, is on your 8th, the house of closeness and shared money",
    ideas: [
      {
        idea: "You may pull back when things get too deep or heavy",
        scene: "A late-night heart-to-heart gets intense, and you find yourself making a joke to lighten it",
        sources: [video("@the_innercosmos", "7629868337488563463"), doctrine("Gemini; the 8th house")],
      },
    ],
  },
  {
    id: "gemini-12-new-ways-to-trip-up",
    key: { kind: "sign-on-house", sign: "Gemini", house: 12 },
    why: "Gemini, the changeable sign, is on your 12th, the house of how you trip yourself up",
    ideas: [
      {
        idea: "The ways you get in your own way tend to change over time, rarely the same one twice",
        scene: "Just as you stop putting things off, you notice you have started overthinking instead",
        sources: [video("@the_innercosmos", "7629868337488563463"), doctrine("Gemini; the 12th house")],
      },
    ],
  },
  {
    id: "leo-2-spends-to-feel-special",
    key: { kind: "sign-on-house", sign: "Leo", house: 2 },
    why: "Leo, the warm and generous sign that wants to be seen, is on your 2nd, the house of money",
    ideas: [
      {
        idea: "You may spend on things that make you feel special, and you tend to be generous with money",
        scene: "You pick the nicer restaurant for a friend's birthday and quietly pay for the table",
        sources: [video("@the_innercosmos", "7588954773794098440"), doctrine("Leo; the 2nd house")],
      },
    ],
  },
  {
    id: "scorpio-4-intense-private-home",
    key: { kind: "sign-on-house", sign: "Scorpio", house: 4 },
    why: "Scorpio, the intense and private sign, is on your 4th, the house of home and private life",
    ideas: [
      {
        idea: "Home tends to feel intense and private for you, and you like to have a say in what happens there",
        scene: "A relative drops by without warning, and it takes you the rest of the evening to settle",
        sources: [video("@the_innercosmos", "7632551227552795911"), doctrine("Scorpio; the 4th house")],
      },
    ],
  },
  {
    id: "aquarius-4-unusual-home",
    key: { kind: "sign-on-house", sign: "Aquarius", house: 4 },
    why: "Aquarius, the sign that does things its own way, is on your 4th, the house of home",
    ideas: [
      {
        idea: "You may want a home life that is a bit unusual and does not follow the usual rules",
        scene: "Your flat has a desk in the kitchen and a bike in the hall, and it works perfectly for you",
        sources: [video("@the_innercosmos", "7671694847346068754"), doctrine("Aquarius; the 4th house")],
      },
    ],
  },
  {
    id: "aquarius-1-own-unusual-way",
    key: { kind: "sign-on-house", sign: "Aquarius", house: 1 },
    why: "Aquarius, the sign that stands a little apart, is on your 1st, the house of self",
    ideas: [
      {
        idea: "You often live in your own unusual way, and you may feel like the odd one out even among your people",
        scene: "At a family wedding, everyone asks what you are doing now, because it is never what they expected",
        sources: [video("@the_innercosmos", "7662856904208616712"), video("@the_innercosmos", "7671008252712226066"), doctrine("Aquarius; the 1st house")],
      },
    ],
  },
  {
    id: "cancer-5-protective-of-children",
    key: { kind: "sign-on-house", sign: "Cancer", house: 5 },
    why: "Cancer, the sign that protects and cares, is on your 5th, the house of children",
    ideas: [
      {
        idea: "You tend to be protective of children, even ones who are not your own",
        scene: "At the park, you are the first to notice a toddler wandering towards the road",
        sources: [video("@the_innercosmos", "7665056734293101842"), doctrine("Cancer; the 5th house")],
      },
    ],
  },
  {
    id: "leo-12-hidden-wish-to-shine",
    key: { kind: "sign-on-house", sign: "Leo", house: 12 },
    why: "Leo, the sign that wants to be seen, is on your 12th, the house of what is hidden",
    ideas: [
      {
        idea: "You may keep your wish to be seen and praised private, sometimes even from yourself",
        scene: "You sing well, but only when you are sure the house is empty",
        sources: [video("@the_innercosmos", "7636839710832233735"), doctrine("Leo; the 12th house")],
      },
    ],
  },
  {
    id: "leo-10-leaves-own-mark",
    key: { kind: "sign-on-house", sign: "Leo", house: 10 },
    why: "Leo, the sign that wants to be seen, sits on your 10th, the house of work and public life",
    ideas: [
      {
        idea: "You tend to do best in work that carries your own mark, where you stand out rather than blend in",
        scene: "A project with your name on it gets your best effort, while a faceless task drags",
        sources: [creator("@anemowitch", 15), site("Cafe Astrology (Annie Heese)", "https://cafeastrology.com/natal/midheaven-signs.html"), site("The AstroTwins, astrostyle.com", "https://astrostyle.com/astrology/midheaven/")],
      },
    ],
  },
  {
    id: "taurus-4-cares-by-providing",
    key: { kind: "sign-on-house", sign: "Taurus", house: 4 },
    why: "Taurus, the sign of comfort and security, sits on your 4th, the house of home",
    ideas: [
      {
        idea: "You often show care at home by making it secure and comfortable and by providing for the people in it",
        scene: "When someone at home is upset, you make them dinner before you ask what is wrong",
        sources: [creator("@astronotebook", 20), site("Cafe Astrology (Annie Heese)", "https://cafeastrology.com/natal/signsonhouses.html/4/"), site("Astrolibrary", "https://astrolibrary.org/interpretations/taurus-cusp/")],
      },
    ],
  },
  {
    id: "moon-aries-moves-it-out",
    key: { kind: "planet-in-sign", body: "moon", sign: "Aries" },
    why: "your Moon, the planet of feelings, is in Aries, the sign that goes first and fast",
    ideas: [
      {
        idea: "When you are upset, you often need to do something physical, and moving is what clears it",
        scene: "After a bad call, you go for a hard run, and by the end you know what you want to say",
        sources: [video("@the_innercosmos", "7593392174302121223"), doctrine("Moon; Aries")],
      },
      {
        idea: "You tend to burn through feelings fast, almost before they have time to land",
        scene: "You are furious at lunch and completely over it by dinner, while the other person is still upset",
        sources: [video("@the_innercosmos", "7668777458413374727"), doctrine("Moon; Aries")],
      },
      {
        idea: "You may be put off when someone hides their feelings and makes you guess",
        scene: "A date answers 'nothing' when you ask what is wrong, and you feel your interest drop",
        sources: [video("@the_innercosmos", "7635424513567640839"), doctrine("Moon; Aries")],
      },
    ],
  },
  {
    id: "moon-taurus-senses-bring-you-back",
    key: { kind: "planet-in-sign", body: "moon", sign: "Taurus" },
    why: "your Moon, which is about feelings, is in Taurus, a sign that wants comfort",
    ideas: [
      {
        idea: "When you feel low, your senses tend to bring you back: your favourite food, music you love, soft clothes",
        scene: "After a long week, a slow dinner and your softest pyjamas fix more than any talk would",
        sources: [video("@the_innercosmos", "7593392174302121223"), doctrine("Moon; Taurus")],
      },
      {
        idea: "Having your quiet, comfortable time interrupted can put you off someone quickly",
        scene: "Someone calls just as you settle in with a blanket and a film, and you feel oddly cross",
        sources: [video("@the_innercosmos", "7635424513567640839"), doctrine("Moon; Taurus")],
      },
    ],
  },
  {
    id: "moon-gemini-talks-it-through",
    key: { kind: "planet-in-sign", body: "moon", sign: "Gemini" },
    why: "your Moon, which is about feelings, is in Gemini, a sign that wants to talk things over",
    ideas: [
      {
        idea: "You often work out how you feel by talking about it, sometimes over and over, until it makes sense",
        scene: "After an argument, you call two friends and tell it twice, and by the second call it makes sense to you",
        sources: [creator("@astrologyobserver", 33), video("@the_innercosmos", "7593392174302121223"), doctrine("Moon; Gemini")],
      },
      {
        idea: "You may lose interest in someone who shuts down your questions or stops talking",
        scene: "You ask a date about their job and get one-word answers, and by dessert you are done",
        sources: [video("@the_innercosmos", "7635424513567640839"), doctrine("Moon; Gemini")],
      },
    ],
  },
  {
    id: "moon-cancer-cries-it-out",
    key: { kind: "planet-in-sign", body: "moon", sign: "Cancer" },
    why: "your Moon, which is about feelings, is in Cancer, its own sign, which feels everything fully",
    ideas: [
      {
        idea: "When something hurts, you often need to cry it out somewhere cosy, not play it tough",
        scene: "After a hard day, you curl up under a blanket with a sad film, and the next morning you feel lighter",
        sources: [video("@the_innercosmos", "7593392174302121223"), doctrine("Moon; Cancer")],
      },
      {
        idea: "You may carry the feelings of the people close to you as if they were your job",
        scene: "Your mum sounds a bit flat on the phone, and you think about it for the rest of the day",
        sources: [video("@the_innercosmos", "7648743147853335815"), doctrine("Moon; Cancer")],
      },
      {
        idea: "Being met with coldness when you share something personal can close you off for a long time",
        scene: "You tell a friend about a worry, they check their phone, and you decide not to share again soon",
        sources: [video("@the_innercosmos", "7635424513567640839"), doctrine("Moon; Cancer")],
      },
    ],
  },
  {
    id: "moon-leo-needs-a-cheerleader",
    key: { kind: "planet-in-sign", body: "moon", sign: "Leo" },
    why: "your Moon, which is about what you need, is in Leo, a sign that wants to be seen",
    ideas: [
      {
        idea: "When you are low, you often need someone in your corner who makes you feel seen and valued",
        scene: "A friend sends a long message about why you are great, and the bad day is over",
        sources: [video("@the_innercosmos", "7593392174302121223"), doctrine("Moon; Leo")],
      },
      {
        idea: "Being ignored, or told you are too dramatic, can sting you more than people expect",
        scene: "You share good news at dinner and someone changes the subject, and it stays with you",
        sources: [video("@the_innercosmos", "7635424513567640839"), doctrine("Moon; Leo")],
      },
    ],
  },
  {
    id: "moon-virgo-tidies-to-calm-down",
    key: { kind: "planet-in-sign", body: "moon", sign: "Virgo" },
    why: "your Moon, the planet of what makes you feel safe, is in Virgo, the sign that wants things to work properly",
    ideas: [
      {
        idea: "When you are upset, you tend to calm down by organising something: a list, a chore, a tidy drawer",
        scene: "After bad news, you clean the whole kitchen, and only then can you sit down and think",
        sources: [video("@the_innercosmos", "7593392174302121223"), doctrine("Moon; Virgo")],
      },
      {
        idea: "You may replay a hurt over and over, going through every detail again",
        scene: "A small comment from last month comes back to you while you brush your teeth, word for word",
        sources: [video("@the_innercosmos", "7624759271179177223"), doctrine("Moon; Virgo")],
      },
      {
        idea: "You may feel most loved when you are useful, and you tend to show care by helping in practical ways",
        scene: "A friend is sad, and before you say much you have made tea and sorted their week's shopping",
        sources: [video("@the_innercosmos", "7639030539202104594"), doctrine("Moon; Virgo")],
      },
      {
        idea: "Lateness and last-minute changes to plans can put you off someone more than you show",
        scene: "A date cancels an hour before, and even though you say it's fine, the spark is gone",
        sources: [video("@the_innercosmos", "7635424513567640839"), video("@the_innercosmos", "7638667161669553415"), doctrine("Moon; Virgo")],
      },
    ],
  },
  {
    id: "moon-libra-needs-to-feel-liked",
    key: { kind: "planet-in-sign", body: "moon", sign: "Libra" },
    why: "your Moon, which is about feelings, is in Libra, a sign that needs others to agree",
    ideas: [
      {
        idea: "When you are upset, you often need someone on your side who reminds you that you are liked",
        scene: "After a row, you call the friend who always says you did nothing wrong",
        sources: [video("@the_innercosmos", "7593398061506841874"), doctrine("Moon; Libra")],
      },
      {
        idea: "You may keep the peace first and check what others think before you know what you feel",
        scene: "Someone upsets you at dinner, and you smooth things over, then work out on the drive home that you were hurt",
        sources: [video("@the_innercosmos", "7634201685237173511"), video("@the_innercosmos", "7682567228151106823"), doctrine("Moon; Libra")],
      },
    ],
  },
  {
    id: "moon-scorpio-senses-a-change",
    key: { kind: "planet-in-sign", body: "moon", sign: "Scorpio" },
    why: "your Moon, which is about feelings, is in Scorpio, a sign that wants to know what is really going on",
    ideas: [
      {
        idea: "You can tell when someone's energy toward you changes, often before they realise they are acting differently",
        scene: "A friend answers your message a little more briefly than usual, and you can tell something is different before they say a word",
        sources: [creator("@astrologyobserver", 29), doctrine("Moon; Scorpio")],
      },
      {
        idea: "When something hurts, you tend to go off on your own and deal with it privately, without telling anyone",
        scene: "Something goes wrong at work, and you spend the evening alone with the phone off, then come back as if nothing happened",
        sources: [video("@the_innercosmos", "7593398061506841874"), doctrine("Moon; Scorpio")],
      },
      {
        idea: "If someone shares your secret or lies to you, your trust in them may not come back",
        scene: "A friend repeats something you told them in private, and you quietly stop telling them things",
        sources: [video("@the_innercosmos", "7635424513567640839"), video("@the_innercosmos", "7638667161669553415"), doctrine("Moon; Scorpio")],
      },
    ],
  },
  {
    id: "moon-sagittarius-needs-freedom",
    key: { kind: "planet-in-sign", body: "moon", sign: "Sagittarius" },
    why: "your Moon, which is about what you need, is in Sagittarius, a sign that wants freedom",
    ideas: [
      {
        idea: "When you feel stuck, you need to remind yourself you are free, often by doing something spontaneous",
        scene: "On a heavy week, you book a train to somewhere you have never been, just for the day",
        sources: [video("@the_innercosmos", "7593398061506841874"), doctrine("Moon; Sagittarius")],
      },
      {
        idea: "Someone who needs to be with you all the time can quickly make you feel boxed in",
        scene: "A new partner texts every hour while you are on a trip, and you start to dread your phone",
        sources: [video("@the_innercosmos", "7635424513567640839"), doctrine("Moon; Sagittarius")],
      },
    ],
  },
  {
    id: "moon-capricorn-works-it-off",
    key: { kind: "planet-in-sign", body: "moon", sign: "Capricorn" },
    why: "your Moon, which is about feelings, is in Capricorn, a sign that keeps going",
    ideas: [
      {
        idea: "When you are upset, you would often rather work hard at something than sit with the feeling",
        scene: "After a breakup, you clear your whole inbox and start a new project the same night",
        sources: [video("@the_innercosmos", "7593398061506841874"), doctrine("Moon; Capricorn")],
      },
      {
        idea: "You may be used to handling your feelings alone, and asking for comfort may not come naturally",
        scene: "After a hard day, you sort it out in your head on the way home and tell no one",
        sources: [video("@the_innercosmos", "7648743147853335815"), doctrine("Moon; Capricorn")],
      },
      {
        idea: "You may lose interest in someone who has no goals or never follows through",
        scene: "A date says they will figure out life 'at some point', and you quietly cross them off",
        sources: [video("@the_innercosmos", "7635424513567640839"), video("@the_innercosmos", "7638667161669553415"), doctrine("Moon; Capricorn")],
      },
    ],
  },
  {
    id: "moon-aquarius-thinks-feelings-through",
    key: { kind: "planet-in-sign", body: "moon", sign: "Aquarius" },
    why: "your Moon, which is about feelings, is in Aquarius, a sign that stands back and thinks things through",
    ideas: [
      {
        idea: "You can be very emotional, but you tend to think a feeling through from a safe distance before you let anyone see it",
        scene: "When something upsets you at work, you go quiet for a day, sort out what you think, and only then talk about it",
        sources: [creator("@astrologyobserver", 26), video("@the_innercosmos", "7593398061506841874"), doctrine("Moon; Aquarius")],
      },
      {
        idea: "Being pushed to talk about your feelings too soon can make you pull away",
        scene: "On a second date, someone asks how you really feel about them, and you want to leave",
        sources: [video("@the_innercosmos", "7635424513567640839"), doctrine("Moon; Aquarius")],
      },
    ],
  },
  {
    id: "moon-pisces-feelings-spill-over",
    key: { kind: "planet-in-sign", body: "moon", sign: "Pisces" },
    why: "your Moon, which is about feelings, is in Pisces, a sign that takes on the moods around it",
    ideas: [
      {
        idea: "Your feelings sit close to the surface, and they can spill over when you are tired or with people you love",
        scene: "Late in the evening with old friends, a kind word makes your eyes fill up, and you laugh it off",
        sources: [creator("@astrologyobserver", 28), doctrine("Moon; Pisces")],
      },
      {
        idea: "You may find it hard to keep other people's drama from becoming yours, because you take in everything",
        scene: "Two friends fall out, and you are the one who can't sleep that night",
        sources: [video("@the_innercosmos", "7662112110750567688"), doctrine("Moon; Pisces")],
      },
      {
        idea: "Having your daydreams picked apart can put you off someone fast",
        scene: "You share a wild plan to live by the sea, and they start listing why it can't work",
        sources: [video("@the_innercosmos", "7635424513567640839"), doctrine("Moon; Pisces")],
      },
    ],
  },
  {
    id: "mercury-aries-no-filter",
    key: { kind: "planet-in-sign", body: "mercury", sign: "Aries" },
    why: "your Mercury, the planet of talk, is in Aries, an honest, blunt sign",
    ideas: [
      {
        idea: "If someone wants an honest answer, they tend to ask you, because you say it with no filter",
        scene: "A friend shows you their new haircut and asks what you think, and they know you will tell them",
        sources: [video("@the_innercosmos", "7680330663429475591"), doctrine("Mercury; Aries")],
      },
    ],
  },
  {
    id: "mercury-taurus-holds-the-view",
    key: { kind: "planet-in-sign", body: "mercury", sign: "Taurus" },
    why: "your Mercury, the planet of thinking, is in Taurus, a sign that likes what works and holds on",
    ideas: [
      {
        idea: "Once you have made up your mind, you tend not to change it",
        scene: "Your friends know there is no point arguing about your favourite restaurant",
        sources: [video("@the_innercosmos", "7680330663429475591"), doctrine("Mercury; Taurus")],
      },
    ],
  },
  {
    id: "mercury-gemini-fits-the-listener",
    key: { kind: "planet-in-sign", body: "mercury", sign: "Gemini" },
    why: "your Mercury, the planet of talk, is in Gemini, a sign that adapts quickly",
    ideas: [
      {
        idea: "You may tell the same story differently depending on who is listening, not to lie, but to suit the person in front of you",
        scene: "Your boss and your best friend both hear about your weekend, and the two versions sound like different trips",
        sources: [creator("@astrologyobserver", 33), video("@the_innercosmos", "7680330663429475591"), doctrine("Mercury; Gemini")],
      },
    ],
  },
  {
    id: "mercury-cancer-gets-people-talking",
    key: { kind: "planet-in-sign", body: "mercury", sign: "Cancer" },
    why: "your Mercury, the planet of talk, is in Cancer, a caring sign that senses what people need",
    ideas: [
      {
        idea: "You are often good at getting people to open up about their feelings when they had no plan to",
        scene: "A colleague comes over to ask about a file and ends up telling you about their divorce",
        sources: [video("@the_innercosmos", "7680330663429475591"), doctrine("Mercury; Cancer")],
      },
    ],
  },
  {
    id: "mercury-leo-tells-it-warmly",
    key: { kind: "planet-in-sign", body: "mercury", sign: "Leo" },
    why: "your Mercury, the planet of talk, is in Leo, a warm sign that likes to be seen",
    ideas: [
      {
        idea: "You tend to tell a story with a lot of feeling and show, and people are genuinely interested in what you say",
        scene: "At dinner, you act out the funny part of your day, voices and all, and the table goes quiet to hear it",
        sources: [creator("@astrologyobserver", 34), video("@the_innercosmos", "7680330663429475591"), doctrine("Mercury; Leo")],
      },
    ],
  },
  {
    id: "mercury-virgo-spots-what-does-not-fit",
    key: { kind: "planet-in-sign", body: "mercury", sign: "Virgo" },
    why: "your Mercury, the planet of thinking, is in Virgo, a sign that cares about details",
    ideas: [
      {
        idea: "People can tell you ten things, and you remember the one detail that didn't add up",
        scene: "A colleague walks you through a plan, and you notice the one date that doesn't match the rest",
        sources: [creator("@astrologyobserver", 37), video("@the_innercosmos", "7680330663429475591"), doctrine("Mercury; Virgo")],
      },
    ],
  },
  {
    id: "mercury-libra-argues-gently",
    key: { kind: "planet-in-sign", body: "mercury", sign: "Libra" },
    why: "your Mercury, the planet of talk, is in Libra, a tactful sign",
    ideas: [
      {
        idea: "You tend to argue a point without it ever feeling like an argument",
        scene: "You change your landlord's mind about the rent, and they thank you at the end of the call",
        sources: [video("@the_innercosmos", "7680330663429475591"), doctrine("Mercury; Libra")],
      },
    ],
  },
  {
    id: "mercury-scorpio-hears-the-unsaid",
    key: { kind: "planet-in-sign", body: "mercury", sign: "Scorpio" },
    why: "your Mercury, the planet of thinking, is in Scorpio, a sign that digs below the surface",
    ideas: [
      {
        idea: "You often get what is happening under the surface without anyone having to tell you",
        scene: "In a meeting, you notice the one question nobody answered, and later you are the one who asks it again",
        sources: [creator("@anemowitch", 39), video("@the_innercosmos", "7632154002427268370"), doctrine("Mercury; Scorpio")],
      },
    ],
  },
  {
    id: "mercury-sagittarius-big-picture",
    key: { kind: "planet-in-sign", body: "mercury", sign: "Sagittarius" },
    why: "your Mercury, the planet of thinking, is in Sagittarius, a sign drawn to big ideas",
    ideas: [
      {
        idea: "You see the big picture and the bright side, and the small details can lose you",
        scene: "You sell your friends on a trip in one message, and someone else has to check the dates",
        sources: [video("@the_innercosmos", "7634201685237173511"), doctrine("Mercury; Sagittarius")],
      },
    ],
  },
  {
    id: "mercury-capricorn-skips-small-talk",
    key: { kind: "planet-in-sign", body: "mercury", sign: "Capricorn" },
    why: "your Mercury, the planet of talk, is in Capricorn, a serious, practical sign",
    ideas: [
      {
        idea: "You tend not to enjoy small talk, but you are the friend who gives real, practical advice",
        scene: "Someone tells you their problem, and you skip the sympathy and send them a plan",
        sources: [video("@the_innercosmos", "7680330663429475591"), doctrine("Mercury; Capricorn")],
      },
    ],
  },
  {
    id: "mercury-aquarius-odd-remarks",
    key: { kind: "planet-in-sign", body: "mercury", sign: "Aquarius" },
    why: "your Mercury, the planet of thinking, is in Aquarius, a sign that thinks its own way",
    ideas: [
      {
        idea: "Your mind jumps in ways others can't follow, and you may come out with remarks so specific people wonder how you got there",
        scene: "Mid-conversation about lunch, you ask whether pigeons have favourite streets, and you mean it",
        sources: [creator("@astrologyobserver", 30), video("@the_innercosmos", "7680330663429475591"), site("Astrolibrary", "https://astrolibrary.org/interpretations/mercury/"), site("Cafe Astrology (Annie Heese)", "https://cafeastrology.com/articles/mercuryinsigns_page2.html")],
      },
    ],
  },
  {
    id: "mercury-pisces-hard-to-put-into-words",
    key: { kind: "planet-in-sign", body: "mercury", sign: "Pisces" },
    why: "your Mercury, the planet of words, is in Pisces, a dreamy sign where it struggles",
    ideas: [
      {
        idea: "Your inner world is rich, and putting it into words can be hard, so you may feel misunderstood",
        scene: "You know exactly what you mean, but by the third try at explaining, you give up and say never mind",
        sources: [video("@the_innercosmos", "7680330663429475591"), doctrine("Mercury; Pisces")],
      },
    ],
  },
  {
    id: "venus-aries-wants-openly",
    key: { kind: "planet-in-sign", body: "venus", sign: "Aries" },
    why: "your Venus, the planet of love, is in Aries, a sign that moves first",
    ideas: [
      {
        idea: "You tend not to hide what you want in love, and you would rather go after someone than wait to be chosen",
        scene: "You like someone, so you ask them out that same week instead of waiting for a sign",
        sources: [inbox("@sarahmoodyofficial", 68), video("@the_innercosmos", "7627666202323651848")],
      },
      {
        idea: "You may move very fast in love, and lose interest just as fast once it feels finished in your head",
        scene: "On a first date you are already picturing a trip together, and a week later you feel nothing",
        sources: [video("@the_innercosmos", "7627666202323651848"), doctrine("Venus; Aries")],
      },
    ],
  },
  {
    id: "venus-taurus-lets-it-build",
    key: { kind: "planet-in-sign", body: "venus", sign: "Taurus" },
    why: "your Venus, the planet of love, is in Taurus, its own sign, steady and in no hurry",
    ideas: [
      {
        idea: "Rather than chase love, you tend to let it build slowly and on your own terms",
        scene: "You turn down a fourth date midweek because Sunday suits you better, and they wait",
        sources: [inbox("@sarahmoodyofficial", 66), doctrine("Venus; Taurus")],
      },
    ],
  },
  {
    id: "venus-gemini-mind-first",
    key: { kind: "planet-in-sign", body: "venus", sign: "Gemini" },
    why: "your Venus, the planet of attraction, is in Gemini, a curious sign that loves to talk",
    ideas: [
      {
        idea: "You often fall for a mind more than a look, and a good question is your way of flirting",
        scene: "You can't remember what they wore, but you remember the conversation word for word",
        sources: [inbox("@sarahmoodyofficial", 65), video("@the_innercosmos", "7632154002427268370")],
      },
      {
        idea: "You may jump from one interest to the next, and love tends to deepen when you stay curious about the same person",
        scene: "Months in, you ask your partner something new about their childhood and feel the spark come back",
        sources: [video("@the_innercosmos", "7669812308712901896"), doctrine("Venus; Gemini")],
      },
    ],
  },
  {
    id: "venus-cancer-gives-the-heart-slowly",
    key: { kind: "planet-in-sign", body: "venus", sign: "Cancer" },
    why: "your Venus, the planet of love, is in Cancer, a caring sign that remembers everything",
    ideas: [
      {
        idea: "You tend to notice what is unspoken and remember what matters, and you don't give your heart casually",
        scene: "You remember the name of their childhood dog, and you still wait months before saying I love you",
        sources: [inbox("@sarahmoodyofficial", 5), doctrine("Venus; Cancer")],
      },
    ],
  },
  {
    id: "venus-leo-notices-fading-effort",
    key: { kind: "planet-in-sign", body: "venus", sign: "Leo" },
    why: "your Venus, the planet of love, is in Leo, a sign that wants to be seen and appreciated",
    ideas: [
      {
        idea: "You may not need constant attention in love, but you notice right away when the effort and admiration start to fade",
        scene: "When the small gestures stop, like the good-morning text or a word about how you look, you feel it before you say anything",
        sources: [creator("@astrologyobserver", 35), doctrine("Venus; Leo")],
      },
      {
        idea: "You tend to show affection openly and warmly, and you leave room for the people around you to shine too",
        scene: "At your friend's birthday, you make the loudest toast, then hand the spotlight straight back to them",
        sources: [inbox("@sarahmoodyofficial", 6), doctrine("Venus; Leo")],
      },
    ],
  },
  {
    id: "venus-virgo-notices-the-little-things",
    key: { kind: "planet-in-sign", body: "venus", sign: "Virgo" },
    why: "your Venus, the planet of love, is in Virgo, a sign that notices details",
    ideas: [
      {
        idea: "You often notice the small things about the people you love, and you show love by improving things for them",
        scene: "You fix the wobbly shelf in your partner's flat before they even mention it",
        sources: [inbox("@sarahmoodyofficial", 7), video("@the_innercosmos", "7635865866432679186"), video("@the_innercosmos", "7645683992129260808"), doctrine("Venus; Virgo")],
      },
    ],
  },
  {
    id: "venus-libra-puts-people-at-ease",
    key: { kind: "planet-in-sign", body: "venus", sign: "Libra" },
    why: "your Venus, the planet of love and peace, is in Libra, its own sign",
    ideas: [
      {
        idea: "People tend to feel more at ease and more like themselves around you, because you keep things balanced without it feeling managed",
        scene: "At a tense family lunch, you seat the right people together and the afternoon goes easily",
        sources: [inbox("@sarahmoodyofficial", 8), doctrine("Venus; Libra")],
      },
    ],
  },
  {
    id: "venus-scorpio-sees-beneath",
    key: { kind: "planet-in-sign", body: "venus", sign: "Scorpio" },
    why: "your Venus, the planet of love, is in Scorpio, the private sign that can turn suspicious",
    ideas: [
      {
        idea: "You tend to see past what people show on the surface, and you keep your own feelings back until you trust someone",
        scene: "You know a date is nervous before they do, and you still tell them very little about yourself",
        sources: [inbox("@sarahmoodyofficial", 9), video("@the_innercosmos", "7637971474736811271"), video("@the_innercosmos", "7650542126542982408"), video("@the_innercosmos", "7634201685237173511"), doctrine("Venus; Scorpio")],
      },
    ],
  },
  {
    id: "venus-sagittarius-love-makes-life-bigger",
    key: { kind: "planet-in-sign", body: "venus", sign: "Sagittarius" },
    why: "your Venus, the planet of love, is in Sagittarius, a sign that wants freedom and more to explore",
    ideas: [
      {
        idea: "You tend to want love to make life bigger, not smaller, and you are drawn to whatever excites you",
        scene: "Your best dates are the ones where you end up somewhere neither of you planned",
        sources: [inbox("@sarahmoodyofficial", 10), doctrine("Venus; Sagittarius")],
      },
    ],
  },
  {
    id: "venus-capricorn-keeps-the-bar-high",
    key: { kind: "planet-in-sign", body: "venus", sign: "Capricorn" },
    why: "your Venus, the planet of love, is in Capricorn, a serious sign that plays the long game",
    ideas: [
      {
        idea: "Your standards in love are often high, and you don't fully invest until you see a long-term future",
        scene: "You enjoy the dates, but you only call it a relationship after months of seeing how they show up",
        sources: [inbox("@sarahmoodyofficial", 11), video("@the_innercosmos", "7637971474736811271")],
      },
    ],
  },
  {
    id: "venus-aquarius-likes-people-who-are-different",
    key: { kind: "planet-in-sign", body: "venus", sign: "Aquarius" },
    why: "your Venus, the planet of love, is in Aquarius, a sign that values freedom and friendship",
    ideas: [
      {
        idea: "You tend to like people who are a bit different, and you give them room to be themselves without pinning them down",
        scene: "You want your partner to be friends with your friends, and you don't mind if they spend Saturday apart",
        sources: [inbox("@sarahmoodyofficial", 4), video("@the_innercosmos", "7639030539202104594")],
      },
    ],
  },
  {
    id: "venus-pisces-feels-the-room",
    key: { kind: "planet-in-sign", body: "venus", sign: "Pisces" },
    why: "your Venus, the planet of love, is in Pisces, a sign that picks up how everyone is feeling",
    ideas: [
      {
        idea: "You often feel the mood of a room before anyone speaks, and you take in other people's feelings like your own",
        scene: "You walk into a party and know at once which couple has just argued",
        sources: [inbox("@sarahmoodyofficial", 2), video("@the_innercosmos", "7668041069497453831")],
      },
      {
        idea: "After love ends, you may need real distance to stop feeling the other person's moods as your own",
        scene: "You keep checking how your ex is doing, until you mute them and finally sleep well",
        sources: [video("@the_innercosmos", "7668041069497453831"), doctrine("Venus; Pisces")],
      },
    ],
  },
  {
    id: "mars-aries-quick-to-anger",
    key: { kind: "planet-in-sign", body: "mars", sign: "Aries" },
    why: "your Mars, the planet of anger, is in Aries, its own sign, which acts first",
    ideas: [
      {
        idea: "You can get angry before you even know what about, and you don't have the patience to hold a grudge",
        scene: "You snap at a slow driver, and five minutes later you are singing along to the radio",
        sources: [video("@the_innercosmos", "7634906840723098888"), doctrine("Mars; Aries")],
      },
    ],
  },
  {
    id: "mars-taurus-slow-to-act",
    key: { kind: "planet-in-sign", body: "mars", sign: "Taurus" },
    why: "your Mars, the planet of anger, is in Taurus, a steady sign that holds on",
    ideas: [
      {
        idea: "You are slow to act and slow to anger, and once you are hurt, you can hold a grudge for a long time",
        scene: "Years later, you still won't go back to the shop where they were rude to you",
        sources: [video("@the_innercosmos", "7634906840723098888"), doctrine("Mars; Taurus")],
      },
    ],
  },
  {
    id: "mars-gemini-all-bark",
    key: { kind: "planet-in-sign", body: "mars", sign: "Gemini" },
    why: "your Mars, the planet of anger, is in Gemini, a sign that fights with words",
    ideas: [
      {
        idea: "When you are angry, your words may get sharp and messy, but you don't really want a fight",
        scene: "You send a heated message, then follow it with a joke ten minutes later",
        sources: [video("@the_innercosmos", "7634906840723098888"), doctrine("Mars; Gemini")],
      },
    ],
  },
  {
    id: "mars-cancer-needs-to-care",
    key: { kind: "planet-in-sign", body: "mars", sign: "Cancer" },
    why: "your Mars, the planet of drive, is in Cancer, a feeling sign where it works through the heart",
    ideas: [
      {
        idea: "You rarely fight unless it is personal, and then your words can cut deep because you know where it hurts",
        scene: "You put off a task for weeks, then do it in a night once you see who it will help",
        sources: [video("@the_innercosmos", "7634906840723098888"), doctrine("Mars; Cancer"), video("@the_innercosmos", "7629719711424515346"), video("@the_innercosmos", "7662856904208616712")],
      },
    ],
  },
  {
    id: "mars-leo-pride-or-love",
    key: { kind: "planet-in-sign", body: "mars", sign: "Leo" },
    why: "your Mars, the planet of drive, is in Leo, a proud, loyal sign",
    ideas: [
      {
        idea: "You tend to be driven by your pride or by the people you love, and you will do a lot for either",
        scene: "You stay up all night to finish a friend's wedding speech because you want it to be perfect for them",
        sources: [video("@the_innercosmos", "7634906840723098888"), doctrine("Mars; Leo")],
      },
    ],
  },
  {
    id: "mars-virgo-plans-before-acting",
    key: { kind: "planet-in-sign", body: "mars", sign: "Virgo" },
    why: "your Mars, the planet of action, is in Virgo, a careful sign that likes a method",
    ideas: [
      {
        idea: "Rather than act on impulse, you tend to plan a move many times in your head before you make it",
        scene: "You rewrite your resignation letter for a week, then hand it in and never look back",
        sources: [video("@the_innercosmos", "7634906840723098888"), doctrine("Mars; Virgo")],
      },
    ],
  },
  {
    id: "mars-libra-gets-others-to-fight",
    key: { kind: "planet-in-sign", body: "mars", sign: "Libra" },
    why: "your Mars, the planet of fighting, is in Libra, a sign that avoids conflict",
    ideas: [
      {
        idea: "You would often rather not fight your own battles, and you are good at getting other people to act for you",
        scene: "You mention a problem with the neighbour at dinner, and your flatmate goes round to sort it out",
        sources: [video("@the_innercosmos", "7634906840723098888"), doctrine("Mars; Libra")],
      },
    ],
  },
  {
    id: "mars-scorpio-keeps-the-memory",
    key: { kind: "planet-in-sign", body: "mars", sign: "Scorpio" },
    why: "your Mars, the planet of anger, is in Scorpio, a sign that holds on hard",
    ideas: [
      {
        idea: "You rarely forget what made you angry, and you may forgive someone while remembering exactly how they made you feel",
        scene: "Years after a friend let you down, you are friendly with them, and you still remember every detail",
        sources: [creator("@astrologyobserver", 27), doctrine("Mars; Scorpio")],
      },
      {
        idea: "People rarely see your next move coming, because you plan quietly",
        scene: "Your team only hears about the new job once you have signed the contract",
        sources: [video("@the_innercosmos", "7634906840723098888"), doctrine("Mars; Scorpio")],
      },
    ],
  },
  {
    id: "mars-sagittarius-guards-its-freedom",
    key: { kind: "planet-in-sign", body: "mars", sign: "Sagittarius" },
    why: "your Mars, the planet of fighting, is in Sagittarius, a sign that wants freedom",
    ideas: [
      {
        idea: "You don't usually like conflict, but you will fight if someone tries to limit your freedom",
        scene: "You let a lot slide in a relationship, until they start asking where you have been",
        sources: [video("@the_innercosmos", "7634906840723098888"), doctrine("Mars; Sagittarius")],
      },
    ],
  },
  {
    id: "mars-capricorn-always-has-a-plan",
    key: { kind: "planet-in-sign", body: "mars", sign: "Capricorn" },
    why: "your Mars, the planet of action, is in Capricorn, a sign where it is strong and plans for the long run",
    ideas: [
      {
        idea: "You almost always have a plan, for everything",
        scene: "Before the holiday starts, you have already booked dinner on the last night",
        sources: [video("@the_innercosmos", "7634906840723098888"), doctrine("Mars; Capricorn")],
      },
    ],
  },
  {
    id: "mars-aquarius-goes-against-the-grain",
    key: { kind: "planet-in-sign", body: "mars", sign: "Aquarius" },
    why: "your Mars, the planet of pushing back, is in Aquarius, a sign that stands apart",
    ideas: [
      {
        idea: "You may push against the usual way of doing things, sometimes just because it is the usual way",
        scene: "When everyone at work agrees, you are the one who argues the other side",
        sources: [video("@the_innercosmos", "7634906840723098888"), doctrine("Mars; Aquarius")],
      },
    ],
  },
  {
    id: "jupiter-capricorn-builds-before-it-grows",
    key: { kind: "planet-in-sign", body: "jupiter", sign: "Capricorn" },
    why: "your Jupiter, the planet of growth, is in Capricorn, a careful sign where it doubts good things will come",
    ideas: [
      {
        idea: "You may not feel ready for big good things until you have built the structure to hold them",
        scene: "You get the promotion and spend the first month fixing the systems before you enjoy it",
        sources: [video("@the_innercosmos", "7633306951140625671"), doctrine("Jupiter; Capricorn")],
      },
    ],
  },
  {
    id: "mars-pisces-blurs-lines",
    key: { kind: "planet-in-sign", body: "mars", sign: "Pisces" },
    why: "your Mars, the planet of action and fighting, is in Pisces, a soft sign that rarely pushes directly",
    ideas: [
      {
        idea: "When you want something badly, you may blur the usual lines to get it",
        scene: "You promised yourself you would not message them, but by midnight you have found a reason to",
        sources: [video("@the_innercosmos", "7634906840723098888"), video("@the_innercosmos", "7629719711424515346"), doctrine("Mars; Pisces")],
      },
      {
        idea: "You often go with the flow, and you tend to work around a conflict rather than face it head-on",
        scene: "When a flatmate keeps leaving dishes, you quietly change your routine instead of raising it",
        sources: [site("Astrolibrary", "https://astrolibrary.org/interpretations/mars/"), site("Cafe Astrology (Annie Heese)", "https://cafeastrology.com/articles/marsinsigns_pg2.html")],
      },
    ],
  },
  {
    id: "saturn-leo-play-feels-earned",
    key: { kind: "planet-in-sign", body: "saturn", sign: "Leo" },
    why: "your Saturn, the planet of fear and slow growth, is in Leo, the sign that wants to stand out",
    ideas: [
      {
        idea: "You may find it hard to let yourself shine or play freely, and confidence in being seen grows slowly",
        scene: "You have a great idea for the talent show, and you talk yourself out of it every year until one year you don't",
        sources: [video("@the_innercosmos", "7634201685237173511"), doctrine("Saturn; Leo")],
      },
    ],
  },
  {
    id: "north-node-aries-learns-self-trust",
    key: { kind: "planet-in-sign", body: "north_node", sign: "Aries" },
    why: "your North Node, the direction you grow in, is in Aries, the sign that goes first",
    ideas: [
      {
        idea: "You tend to grow by trusting yourself and acting alone, even when keeping everyone happy feels safer",
        scene: "You stop asking three friends for their opinion and just book the course you want",
        sources: [video("@the_innercosmos", "7598696691256069394"), video("@the_innercosmos", "7604945709443321096"), doctrine("North Node; Aries")],
      },
    ],
  },
  {
    id: "north-node-taurus-learns-steady",
    key: { kind: "planet-in-sign", body: "north_node", sign: "Taurus" },
    why: "your North Node, the direction you grow in, is in Taurus, the steady and patient sign",
    ideas: [
      {
        idea: "You tend to grow by choosing what is steady and simple, even if calm feels boring after so much intensity",
        scene: "A quiet relationship with no drama feels strange at first, and then it starts to feel like rest",
        sources: [video("@the_innercosmos", "7598696691256069394"), video("@the_innercosmos", "7604945709443321096"), doctrine("North Node; Taurus")],
      },
    ],
  },
  {
    id: "north-node-gemini-learns-to-ask",
    key: { kind: "planet-in-sign", body: "north_node", sign: "Gemini" },
    why: "your North Node, the direction you grow in, is in Gemini, the curious sign that sees another angle",
    ideas: [
      {
        idea: "You tend to grow by asking questions and listening, rather than holding tight to what you already believe",
        scene: "Mid-argument, you ask the other person why they think that, and you learn something real",
        sources: [video("@the_innercosmos", "7598696691256069394"), video("@the_innercosmos", "7637971474736811271"), video("@the_innercosmos", "7604945709443321096"), doctrine("North Node; Gemini")],
      },
    ],
  },
  {
    id: "north-node-cancer-learns-to-lean",
    key: { kind: "planet-in-sign", body: "north_node", sign: "Cancer" },
    why: "your North Node, the direction you grow in, is in Cancer, the caring sign shaped by where it belongs",
    ideas: [
      {
        idea: "You tend to grow by letting yourself need people and accept their help, not only by working harder",
        scene: "Instead of pulling another late night alone, you call a friend and let them help",
        sources: [video("@the_innercosmos", "7598696691256069394"), video("@the_innercosmos", "7604945709443321096"), doctrine("North Node; Cancer")],
      },
    ],
  },
  {
    id: "north-node-leo-learns-to-be-seen",
    key: { kind: "planet-in-sign", body: "north_node", sign: "Leo" },
    why: "your North Node, the direction you grow in, is in Leo, the sign that wants to stand out",
    ideas: [
      {
        idea: "You tend to grow by letting yourself be seen and leading with your heart, rather than blending into the group",
        scene: "For once you share your own idea at the team meeting instead of backing someone else's",
        sources: [video("@the_innercosmos", "7598696691256069394"), video("@the_innercosmos", "7604945709443321096"), doctrine("North Node; Leo")],
      },
    ],
  },
  {
    id: "north-node-virgo-learns-clarity",
    key: { kind: "planet-in-sign", body: "north_node", sign: "Virgo" },
    why: "your North Node, the direction you grow in, is in Virgo, the sign that wants things to work properly",
    ideas: [
      {
        idea: "You tend to grow by choosing clear details and practical steps over drifting along",
        scene: "You finally make a budget and a calendar, and the vague worry you carried for months eases",
        sources: [video("@the_innercosmos", "7598696691256069394"), video("@the_innercosmos", "7604945709443321096"), doctrine("North Node; Virgo")],
      },
    ],
  },
  {
    id: "north-node-libra-learns-to-share",
    key: { kind: "planet-in-sign", body: "north_node", sign: "Libra" },
    why: "your North Node, the direction you grow in, is in Libra, the sign of balance and partnership",
    ideas: [
      {
        idea: "You tend to grow by learning to compromise and work with others, and your self-trust gives you a steady base",
        scene: "You let a colleague change your plan, and the result is better than what you would have done alone",
        sources: [video("@the_innercosmos", "7598703218113121554"), video("@the_innercosmos", "7604939923510021394"), doctrine("North Node; Libra")],
      },
    ],
  },
  {
    id: "north-node-scorpio-learns-to-let-go",
    key: { kind: "planet-in-sign", body: "north_node", sign: "Scorpio" },
    why: "your North Node, the direction you grow in, is in Scorpio, the sign that would rather change completely",
    ideas: [
      {
        idea: "Letting go of an old version of your life may be hard for you, and growth comes when you allow deep change",
        scene: "You stay in a job that feels safe long after it stops fitting, and leaving changes everything",
        sources: [video("@the_innercosmos", "7598703218113121554"), video("@the_innercosmos", "7641613715170675976"), video("@the_innercosmos", "7682567228151106823"), doctrine("North Node; Scorpio")],
      },
    ],
  },
  {
    id: "north-node-sagittarius-learns-big-picture",
    key: { kind: "planet-in-sign", body: "north_node", sign: "Sagittarius" },
    why: "your North Node, the direction you grow in, is in Sagittarius, the sign of meaning and big ideas",
    ideas: [
      {
        idea: "You tend to grow by stepping back to the big picture and committing to what you believe, rather than getting lost in details",
        scene: "You stop polling friends on a choice and decide based on what matters most to you",
        sources: [video("@the_innercosmos", "7598703218113121554"), video("@the_innercosmos", "7604939923510021394"), doctrine("North Node; Sagittarius")],
      },
    ],
  },
  {
    id: "north-node-capricorn-learns-authority",
    key: { kind: "planet-in-sign", body: "north_node", sign: "Capricorn" },
    why: "your North Node, the direction you grow in, is in Capricorn, the sign that takes responsibility",
    ideas: [
      {
        idea: "You tend to grow by taking charge and building something step by step, even when it feels lonely at first",
        scene: "You agree to lead the project, and the first weeks feel cold, then you see what you are building",
        sources: [video("@the_innercosmos", "7598703218113121554"), video("@the_innercosmos", "7604939923510021394"), doctrine("North Node; Capricorn")],
      },
    ],
  },
  {
    id: "north-node-aquarius-learns-the-group",
    key: { kind: "planet-in-sign", body: "north_node", sign: "Aquarius" },
    why: "your North Node, the direction you grow in, is in Aquarius, the sign that cares about the group",
    ideas: [
      {
        idea: "You tend to grow when your talents serve a group or a cause, not only your own applause",
        scene: "You use your knack for performing to run a fundraiser, and it feels better than any solo show",
        sources: [video("@the_innercosmos", "7598703218113121554"), video("@the_innercosmos", "7648743147853335815"), video("@the_innercosmos", "7604939923510021394"), doctrine("North Node; Aquarius")],
      },
    ],
  },
  {
    id: "north-node-pisces-learns-to-trust",
    key: { kind: "planet-in-sign", body: "north_node", sign: "Pisces" },
    why: "your North Node, the direction you grow in, is in Pisces, the open and intuitive sign",
    ideas: [
      {
        idea: "You tend to grow by trusting your gut and letting go of control, rather than perfecting every detail",
        scene: "You send the email without a fourth check, and nothing bad happens",
        sources: [video("@the_innercosmos", "7598703218113121554"), video("@the_innercosmos", "7604939923510021394"), doctrine("North Node; Pisces")],
      },
    ],
  },
  {
    id: "pluto-sagittarius-hope-through-change",
    key: { kind: "planet-in-sign", body: "pluto", sign: "Sagittarius" },
    why: "your Pluto, the planet of deep change, is in Sagittarius, the hopeful sign that looks for meaning, and since Pluto stays in a sign for years, many people your age share this",
    ideas: [
      {
        idea: "Like most people born in your years, you may keep your hope through big changes and look for the meaning in them",
        scene: "A plan falls apart, and within a day you are telling friends what it taught you",
        sources: [video("@the_innercosmos", "7640208559560494344"), video("@the_innercosmos", "7676889731648605447"), doctrine("Pluto; Sagittarius")],
      },
      {
        idea: "Like many people born in your years, you may shrug off traditions that feel empty and keep only what means something to you",
        scene: "Your family expects a big formal wedding, and you would honestly rather elope somewhere far away",
        sources: [video("@the_innercosmos", "7676889731648605447"), doctrine("Pluto; Sagittarius")],
      },
    ],
  },
  {
    id: "neptune-capricorn-dreams-built-solid",
    key: { kind: "planet-in-sign", body: "neptune", sign: "Capricorn" },
    why: "your Neptune, the planet of ideals, is in Capricorn, the sign that builds for the long run, and since Neptune stays in a sign for years, many people your age share this",
    ideas: [
      {
        idea: "Like most people born in your years, you may dream in practical terms and want your plans to feel meaningful, not just solid",
        scene: "You build a sensible career, then realise you want it to mean something too, and start a side project that does",
        sources: [video("@the_innercosmos", "7678109105730506002"), doctrine("Neptune; Capricorn")],
      },
    ],
  },
  {
    id: "neptune-aquarius-ideals-for-the-group",
    key: { kind: "planet-in-sign", body: "neptune", sign: "Aquarius" },
    why: "your Neptune, the planet of ideals, is in Aquarius, the sign that thinks in systems and cares about the group, and since Neptune stays in a sign for years, many people your age share this",
    ideas: [
      {
        idea: "Like most people born in your years, you may hold big ideals about how people should live together, and feelings can trail behind them",
        scene: "You can talk for hours about fixing how a city works, and still go quiet when a friend asks how you feel",
        sources: [video("@the_innercosmos", "7678109105730506002"), doctrine("Neptune; Aquarius")],
      },
    ],
  },
  {
    id: "sun-capricorn-wacky-humour",
    key: { kind: "planet-in-sign", body: "sun", sign: "Capricorn" },
    why: "your Sun is in Capricorn, a serious sign known for a dry, down-to-earth sense of humour",
    ideas: [
      {
        idea: "You can seem serious, yet once you are at ease with someone your humour is often wackier than people expect",
        scene: "A new colleague hears your first silly joke at the leaving drinks and does a double take",
        sources: [creator("@astrologyobserver", 36), site("The AstroTwins, astrostyle.com", "https://astrostyle.com/astrology/sun-in-capricorn/")],
      },
    ],
  },
  {
    id: "sun-aquarius-cool-on-the-surface",
    key: { kind: "planet-in-sign", body: "sun", sign: "Aquarius" },
    why: "your Sun is in Aquarius, a cool, detached sign that keeps feelings at a distance",
    ideas: [
      {
        idea: "Under a cool surface you may feel more anxious than you let on, and you tend to act as if everything is fine",
        scene: "After a tense day you tell everyone you are good, then lie awake going over it",
        sources: [creator("@astrologyobserver", 26), site("The AstroTwins, astrostyle.com", "https://astrostyle.com/astrology/sun-in-aquarius/")],
      },
    ],
  },
  {
    id: "venus-opposite-jupiter-love-runs-big",
    key: { kind: "aspect", a: "venus", b: "jupiter", aspect: "opposition" },
    why: "your Venus, the planet of love, faces your Jupiter, which makes things big and overdoes it",
    ideas: [
      {
        idea: "Love can feel all or nothing for you, growing very fast and dropping just as fast",
        scene: "Two weeks in, you are planning a trip together, and a month later you can't remember why",
        sources: [video("@the_innercosmos", "7647992941860080904"), doctrine("Venus and Jupiter; the opposition")],
      },
    ],
  },
  {
    id: "jupiter-saturn-conjunction-earned-luck",
    key: { kind: "aspect", a: "jupiter", b: "saturn", aspect: "conjunction" },
    why: "your Jupiter, the planet of help, sits with your Saturn, the planet of what you earn slowly, so neither works without the other",
    ideas: [
      {
        idea: "You may feel you have to earn your good luck, and you tend to grow most when you face what scares you",
        scene: "Early jobs feel like an uphill climb, and the break comes after you finally ask for the role you feared",
        sources: [video("@the_innercosmos", "7639464922228739346"), video("@the_innercosmos", "7635865866432679186"), doctrine("Jupiter conjunct Saturn")],
      },
    ],
  },
  {
    id: "sun-jupiter-opposition-overreaches",
    key: { kind: "aspect", a: "sun", b: "jupiter", aspect: "opposition" },
    why: "your Sun, the planet of who you are, faces your Jupiter, the planet that says yes too fast",
    ideas: [
      {
        idea: "You may think big about yourself and say yes to more than fits, then need to bring things back to size",
        scene: "You agree to lead two projects and plan a move in the same month, and by week three it's too much",
        sources: [video("@the_innercosmos", "7647992941860080904"), doctrine("Sun opposite Jupiter")],
      },
    ],
  },
  {
    id: "moon-jupiter-opposition-big-feelings",
    key: { kind: "aspect", a: "moon", b: "jupiter", aspect: "opposition" },
    why: "your Moon, the planet of feelings, faces your Jupiter, the planet that makes things bigger",
    ideas: [
      {
        idea: "Your feelings tend to run big, and a small upset can grow fast",
        scene: "A short reply from a friend turns into a whole evening of worry before you hear it was nothing",
        sources: [video("@the_innercosmos", "7647992941860080904"), doctrine("Moon opposite Jupiter")],
      },
    ],
  },
  {
    id: "moon-mercury-opposition-head-and-heart",
    key: { kind: "aspect", a: "moon", b: "mercury", aspect: "opposition" },
    why: "your Moon, the planet of feelings, faces your Mercury, the planet of thinking, so each pulls the other way",
    ideas: [
      {
        idea: "You may feel torn between what your head says and what your heart wants, and the middle ground takes work",
        scene: "Your list says take the job, your gut says stay, and you go back and forth for a week",
        sources: [video("@the_innercosmos", "7694024733184019719"), doctrine("Moon opposite Mercury")],
      },
    ],
  },
  {
    id: "mercury-chiron-conjunction-doubts-own-mind",
    key: { kind: "aspect", a: "mercury", b: "chiron", aspect: "conjunction" },
    why: "your Mercury, the planet of thinking and talking, sits with your Chiron, your sore spot",
    ideas: [
      {
        idea: "You may doubt your own mind and voice, and you may become patient with others who struggle to learn",
        scene: "You explain things slowly and kindly to a new colleague, the way you wish someone had for you",
        sources: [video("@the_innercosmos", "7693693721165991176"), doctrine("Mercury conjunct Chiron")],
      },
    ],
  },
  {
    id: "moon-chiron-conjunction-feelings-are-tender",
    key: { kind: "aspect", a: "moon", b: "chiron", aspect: "conjunction" },
    why: "your Moon, the planet of feelings, sits with your Chiron, your sore spot",
    ideas: [
      {
        idea: "Getting close to your own feelings may feel uncomfortable, and you may be good at comforting others in pain",
        scene: "A friend cries on the phone, and you know exactly what to say, though your own tears come rarely",
        sources: [video("@the_innercosmos", "7693693721165991176"), doctrine("Moon conjunct Chiron")],
      },
    ],
  },
  {
    id: "venus-conjunction-jupiter-warm",
    key: { kind: "aspect", a: "venus", b: "jupiter", aspect: "conjunction" },
    why: "your Venus, the planet of liking and being liked, works with Jupiter, which makes things big and generous",
    ideas: [
      {
        idea: "You are often warm, generous and easy to like, with a ready smile",
        scene: "At a party where you know nobody, someone is laughing with you within ten minutes",
        sources: [creator("@anemowitch", 24), site("Cafe Astrology (Annie Heese)", "https://cafeastrology.com/natal/venusjupiteraspects.html")],
      },
    ],
  },
  {
    id: "venus-trine-jupiter-warm",
    key: { kind: "aspect", a: "venus", b: "jupiter", aspect: "trine" },
    why: "your Venus, the planet of liking and being liked, works with Jupiter, which makes things big and generous",
    ideas: [
      {
        idea: "You are often warm, generous and easy to like, with a ready smile",
        scene: "At a party where you know nobody, someone is laughing with you within ten minutes",
        sources: [creator("@anemowitch", 24), site("Cafe Astrology (Annie Heese)", "https://cafeastrology.com/natal/venusjupiteraspects.html")],
      },
    ],
  },
  {
    id: "sun-trine-saturn-cool-head",
    key: { kind: "aspect", a: "sun", b: "saturn", aspect: "trine" },
    why: "your Sun works easily with Saturn, the planet of limits and patience",
    ideas: [
      {
        idea: "You tend to keep a cool head under pressure, and you often know your limits well",
        scene: "When a deadline moves up by a week, you redo the plan while others panic",
        sources: [creator("@anemowitch", 40), site("Astrolibrary", "https://astrolibrary.org/interpretations/sun-saturn/")],
      },
    ],
  },
  {
    id: "sun-sextile-saturn-cool-head",
    key: { kind: "aspect", a: "sun", b: "saturn", aspect: "sextile" },
    why: "your Sun works easily with Saturn, the planet of limits and patience",
    ideas: [
      {
        idea: "You tend to keep a cool head under pressure, and you often know your limits well",
        scene: "When a deadline moves up by a week, you redo the plan while others panic",
        sources: [creator("@anemowitch", 40), site("Astrolibrary", "https://astrolibrary.org/interpretations/sun-saturn/")],
      },
    ],
  },
  {
    id: "mars-trine-saturn-cool-head",
    key: { kind: "aspect", a: "mars", b: "saturn", aspect: "trine" },
    why: "your Mars works easily with Saturn, the planet of limits and patience",
    ideas: [
      {
        idea: "You tend to keep a cool head under pressure, and you often know your limits well",
        scene: "When a deadline moves up by a week, you redo the plan while others panic",
        sources: [creator("@anemowitch", 40), site("Cafe Astrology (Annie Heese)", "https://cafeastrology.com/natal/marssaturnaspects.html")],
      },
    ],
  },
  {
    id: "mars-sextile-saturn-cool-head",
    key: { kind: "aspect", a: "mars", b: "saturn", aspect: "sextile" },
    why: "your Mars works easily with Saturn, the planet of limits and patience",
    ideas: [
      {
        idea: "You tend to keep a cool head under pressure, and you often know your limits well",
        scene: "When a deadline moves up by a week, you redo the plan while others panic",
        sources: [creator("@anemowitch", 40), site("Cafe Astrology (Annie Heese)", "https://cafeastrology.com/natal/marssaturnaspects.html")],
      },
    ],
  },
  {
    id: "moon-conjunction-saturn-arms-length",
    key: { kind: "aspect", a: "moon", b: "saturn", aspect: "conjunction" },
    why: "your Moon, the planet of feelings, meets Saturn, the planet of caution and holding back",
    ideas: [
      {
        idea: "You tend to keep people at arm's length at first, and you share how you feel once trust is there",
        scene: "Months into a friendship, you finally tell them what has been worrying you",
        sources: [video("@the_innercosmos", "7668777458413374727"), site("Cafe Astrology (Annie Heese)", "https://cafeastrology.com/natal/moonsaturnaspects.html")],
      },
    ],
  },
  {
    id: "moon-square-saturn-arms-length",
    key: { kind: "aspect", a: "moon", b: "saturn", aspect: "square" },
    why: "your Moon, the planet of feelings, meets Saturn, the planet of caution and holding back",
    ideas: [
      {
        idea: "You tend to keep people at arm's length at first, and you share how you feel once trust is there",
        scene: "Months into a friendship, you finally tell them what has been worrying you",
        sources: [video("@the_innercosmos", "7668777458413374727"), site("Cafe Astrology (Annie Heese)", "https://cafeastrology.com/natal/moonsaturnaspects.html")],
      },
    ],
  },
  {
    id: "moon-opposition-saturn-arms-length",
    key: { kind: "aspect", a: "moon", b: "saturn", aspect: "opposition" },
    why: "your Moon, the planet of feelings, meets Saturn, the planet of caution and holding back",
    ideas: [
      {
        idea: "You tend to keep people at arm's length at first, and you share how you feel once trust is there",
        scene: "Months into a friendship, you finally tell them what has been worrying you",
        sources: [video("@the_innercosmos", "7668777458413374727"), site("Cafe Astrology (Annie Heese)", "https://cafeastrology.com/natal/moonsaturnaspects.html")],
      },
    ],
  },
  {
    id: "sun-opposition-moon-pulled-two-ways",
    key: { kind: "aspect", a: "sun", b: "moon", aspect: "opposition" },
    why: "your Sun, what you want, faces your Moon, what you need, from opposite sides of the sky",
    ideas: [
      {
        idea: "You often feel pulled two ways between what you want and what you need, and a choice can bring a quick \"but what if\"",
        scene: "You accept the job in the city and lie awake missing the quiet you just gave up",
        sources: [site("Cafe Astrology (Annie Heese)", "https://cafeastrology.com/natal/sunmoonaspects.html"), site("Astrolibrary", "https://astrolibrary.org/interpretations/sun-moon/")],
      },
    ],
  },
  {
    id: "mars-conjunction-pluto-all-in",
    key: { kind: "aspect", a: "mars", b: "pluto", aspect: "conjunction" },
    why: "your Mars, the planet of drive, sits with Pluto, the planet of intensity",
    ideas: [
      {
        idea: "Once you commit to something, you tend to go all in and rarely waver",
        scene: "You decide to run the marathon, and from that day the training plan is not up for debate",
        sources: [video("@the_innercosmos", "7668041069497453831"), site("Cafe Astrology (Annie Heese)", "https://cafeastrology.com/natal/marsplutoaspects.html")],
      },
    ],
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
    case "sign-on-house":
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
      case "sign-on-house":
        return hasHorizon(chart) && chart.houses?.[String(key.house)]?.sign === key.sign;
      case "aspect":
        return chart.aspects.some((a) =>
          a.type === key.aspect && ((a.planet1 === key.a && a.planet2 === key.b) || (a.planet1 === key.b && a.planet2 === key.a)));
    }
  };
  return OBSERVATIONS.filter((o) => matches(o.key)).map((observation) => ({ observation, house: cardOf(observation.key) }));
}

/**
 * Lens 1, Partners: the five day-to-day chapters (ADR-63, ADR-64, ADR-69).
 * The grounding is doctrine and never named on the page; the love languages
 * are a vocabulary of care, named generically, never a match and never by
 * the numbered book title.
 */
import { lensChapter, type PairSectionSpec } from "../../shapes.js";

const love = lensChapter({
  lens: "partners",
  n: 2,
  title: "How you love",
  draws: ["relationships", "triad", "overview"],
  scenes: ["the end of a long day", "a birthday, planned badly", "the thumbs-up"],
  grounding: "Care is shown and wanted in five currencies, words, time, help, gifts and touch, and most people give in the currency they want to receive. The gap between the currency one gives and the one the other reads is where most feelings of being unloved come from, and it is a translation problem, not a love problem. Ask what each does when they want to show care and what each notices when they feel cared for; the mismatch is the chapter.",
  instructions: `Write How you love: how each of these two shows care and how each wants it shown, and what happens at the seam between the two.

The scene is the chosen one: one of them comes home, plans a birthday, sends a two-word reply, and the other reads it in their own currency. What just happened says what each was doing in their own terms, from their personal report's words on how they love and what partnership asks of them. The pattern names whether the two currencies flow or rub and what the mismatch trains. Next time gives each of them one thing to do in the other's currency, and one for both. Name the currencies of care generically, as words, time, help, gifts or touch; never as a test, a type or a match.`,
});

const fight = lensChapter({
  lens: "partners",
  n: 3,
  title: "How you fight and repair",
  draws: ["relationships", "mind", "superpowers"],
  scenes: ["the argument at 11 pm", "the silent car ride", "day two of an apology"],
  grounding: "In most couples one pursues and one withdraws: the pursuer raises the volume to get a response, the withdrawer goes quiet to lower the temperature, and each move makes the other's worse. Four habits corrode a relationship, criticism, contempt, defensiveness and shutting down, and each has a plain antidote: name the specific behaviour instead of the person, say what you appreciate, take your part of it, and take a break and come back. A repair is any move that lowers the temperature and is accepted; what matters is not the fight but whether the repair lands, and each person accepts a different kind.",
  instructions: `Write How you fight and repair: who pursues and who withdraws when these two disagree, the habit each falls into, and the repair each will actually accept.

The scene is the chosen one, in present tense, with the actual words one of them says. What just happened gives the need under the pursuit and the fear under the withdrawal, from each person's report, in their words on how they think and where they leave the room. The pattern says whether this is where it rubs and what the friction trains. Next time gives each of them one repair move the other accepts, plain and doable, and one for both: the break, the return, the words. Describe the corrosive habits as behaviour, never by a label or a list name.`,
});

const home = lensChapter({
  lens: "partners",
  n: 4,
  title: "Home, chores and money",
  draws: ["money", "family", "overview"],
  scenes: ["the dishwasher, again", "the bill nobody expected", "guests on Saturday"],
  grounding: "Every household runs on one person's standard for what clean, on time and enough mean, and on one person carrying the list of what needs doing, which is work even when the doing is shared. Fairness is felt, not counted: each person weighs the tasks they see, so the one who carries the list feels the load and the other cannot see it. Money is the same argument in numbers: how a bill lands depends on what each grew up thinking money was for.",
  instructions: `Write Home, chores and money: whose standard the home runs on, who carries the list, how a bill lands between these two, and fairness as each of them feels it.

The scene is the chosen one, concrete: the dishwasher, the bill, the guests, with both names and what each does in the first minute. What just happened gives what money and home mean to each, from their report's words on resources and roots. The pattern says whether this is where it flows or rubs and what it trains. Next time gives one item each that makes the invisible work visible or the bill land softer, and one for both. No sum of money, no percentage, no number.`,
});

const fun = lensChapter({
  lens: "partners",
  n: 5,
  title: "Fun, weekends and holidays",
  draws: ["overview", "superpowers", "discoveries"],
  scenes: ["Friday, 7 pm, no plan", "booking the summer in January", "day three of the holiday"],
  grounding: "Rest divides people two ways: out against in, and planner against drifter. One recharges with people and a plan, the other with quiet and no plan, and a weekend that suits one drains the other. A holiday that fits both has a shape, not a destination: a planned spine with unplanned days, or a place one chose and a pace the other set. The chapter never names a destination.",
  instructions: `Write Fun, weekends and holidays: what each of these two does to rest, out or in, planned or drifting, and the shape of a weekend or a holiday that fits both.

The scene is the chosen one: Friday with no plan, the booking, the third day, with both names. What just happened gives what each needs from time off, from their report's words on temperament and their paradoxes. The pattern says whether this is where it flows or rubs. Next time gives each one thing to offer the other's kind of rest and one for both: a shape for the next weekend or holiday, never a destination, never a place name.`,
});

const building = lensChapter({
  lens: "partners",
  n: 6,
  title: "What you are building",
  draws: ["career", "relationships", "focus"],
  scenes: ["the job offer in another city", "two weeks apart", "the five-year conversation"],
  grounding: "Two ambitions in one household compete for the same hours, and the argument is rarely about the job: it is about whose life the other's plan assumes. Time apart is neutral; what each does with it is the tell. Distance is survivable when the reasons are shared and corrosive when one person is doing it for the other. The strengths as a pair are what the two can do that neither could alone, in behaviour.",
  instructions: `Write What you are building: ambition, time apart and distance between these two, and the strengths they have as a pair.

The scene is the chosen one: the offer, the fortnight apart, the five-year talk, with both names and one exchange. What just happened gives what work and the future mean to each, from their report's words on calling and what partnership asks. The pattern says whether this is where it flows or rubs and what it trains. Next time gives each one thing to say about the future, plainly, and one for both. No prediction, no date, no promise of an outcome.`,
});

export const PARTNERS: readonly PairSectionSpec[] = [love, fight, home, fun, building];

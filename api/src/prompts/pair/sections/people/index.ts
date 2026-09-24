/**
 * Lens 3, Two people (ADR-68, ADR-69): anyone who is not a partner and not
 * a parent and child. How they know each other, family, friends or
 * colleagues, comes in the free label and picks which scene fits and a few
 * words of register, never the engine. Birth order is not used.
 */
import { lensChapter, type PairSectionSpec } from "../../shapes.js";

const register = "How the two know each other, family, friends or colleagues, is in the brief. It picks which of the three scenes fits and a few words of register, a kitchen or an office or a bar, and nothing else: the reading is the same two charts. Birth order is never used.";

const room = lensChapter({
  lens: "people",
  n: 2,
  title: "In a room together",
  draws: ["overview", "triad", "mind"],
  scenes: ["the big dinner", "the meeting where one goes quiet", "the party you both said yes to"],
  grounding: `${register} In a room one of two people usually fills the silence and the other reads it; one arrives already talking and the other needs ten minutes. Neither is the right way, and the mismatch is only a problem when each takes the other's pace personally.`,
  instructions: `Write In a room together: what happens when these two are in the same room with other people, who fills the silence and who reads it, and what each takes personally that is only pace.

The scene is the chosen one, in present tense with both names and what each does in the first ten minutes. What just happened gives what each needs from a room, from their report's words on temperament and how they come across. The pattern says whether this is where it flows or rubs. Next time gives each one thing to do for the other in the next room they share, and one for both.`,
});

const working = lensChapter({
  lens: "people",
  n: 3,
  title: "Working on something together",
  draws: ["career", "mind", "superpowers"],
  scenes: ["planning mum's sixtieth", "the project with the deadline", "moving day"],
  grounding: `${register} Two people working on one thing divide by pace and by standard: one starts and the other finishes, one wants it right and the other wants it done. The job goes well when each knows which part is theirs before it starts, and badly when both assume the same part.`,
  instructions: `Write Working on something together: how these two divide a job, who starts and who finishes, whose standard wins, and where the assumption about who does what goes wrong.

The scene is the chosen one, in present tense with both names and one exchange. What just happened gives what getting it done means to each, from their report's words on calling, the mind and their superpower. The pattern says whether this is where it flows or rubs and what it trains. Next time gives each one thing to say before the next job starts, and one for both.`,
});

const fun = lensChapter({
  lens: "people",
  n: 4,
  title: "Having fun",
  draws: ["overview", "superpowers", "discoveries"],
  scenes: ["the weekend away", "the night that ended early, or late", "the hobby one of you wanted to share"],
  grounding: `${register} Fun between two people is a question of energy and of plan: one wants the night to go on and the other wants it to have a shape, one brings the idea and the other the company. The best of it is the thing only these two do together.`,
  instructions: `Write Having fun: what these two actually enjoy together, who wants the night to go on and who wants it to end well, who brings the idea and who brings the company, and the thing only these two do.

The scene is the chosen one, in present tense with both names. What just happened gives what each is looking for when they are off duty, from their report's words on temperament, their superpower and their paradoxes. The pattern says whether this is where it flows or rubs. Next time gives each one thing to offer the other's kind of fun, and one for both.`,
});

const hardTalk = lensChapter({
  lens: "people",
  n: 5,
  title: "The hard talk",
  draws: ["mind", "relationships", "money"],
  scenes: ["money between you", "the feedback at work", "the thing unsaid for a year"],
  grounding: `${register} The hard talk between two people who are not partners has no shared bed to repair it in, so it is put off longer and lands harder. One of the two will say it too early and the other too late; the talk goes best when the one who waits names the day and the one who rushes names the one thing they want from it.`,
  instructions: `Write The hard talk: the conversation these two put off, who would say it too early and who too late, and how it goes when it finally happens.

The scene is the chosen one, in present tense with both names and the actual words one of them opens with. What just happened gives the fear under each side's timing, from their report's words on how they are understood, intimacy and what they hold. The pattern says whether this is where it rubs and what it trains. Next time gives each one line to open with and one for both: when, where, and the one thing wanted.`,
});

const give = lensChapter({
  lens: "people",
  n: 6,
  title: "What you give each other",
  draws: ["relationships", "family", "focus"],
  scenes: ["three months without talking", "the favour too big to ask", "the joke only you two get"],
  grounding: `${register} What two people give each other is what each has that the other lacks and does not resent: the one who calls after three months, the one who says yes to the favour, the joke that holds when nothing else does. It is the reason the relationship survives its silences.`,
  instructions: `Write What you give each other: what each of these two brings that the other does not have, what survives a silence between them, and what each could ask for and does not.

The scene is the chosen one, in present tense with both names. What just happened gives what each gives and what each finds hard to ask, from their report's words on love, roots and what to lean into. The pattern says whether this is where it flows or rubs and what it trains. Next time gives each one thing to ask the other for, plainly, and one for both. No prediction, no promise.`,
});

export const PEOPLE: readonly PairSectionSpec[] = [room, working, fun, hardTalk, give];

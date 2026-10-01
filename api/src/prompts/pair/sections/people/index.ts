/**
 * Lens 3, Two people (ADR-68, ADR-69, ADR-176): anyone who is not a partner
 * and not a parent and child, one fixed scene a chapter. How they know each
 * other, family, friends or colleagues, comes in the free label and sets a
 * few words of register, never the scene or the engine. Birth order is not
 * used.
 */
import { lensChapter, type PairSectionSpec } from "../../shapes.js";

const register = "How the two know each other, family, friends or colleagues, is in the brief. It sets a few words of register in the scene, a kitchen or an office or a bar, and nothing else: the scene stays the chapter's own and the reading is the same two charts. Birth order is never used.";

const room = lensChapter({
  lens: "people",
  n: 2,
  title: "In a room together",
  draws: ["overview", "triad", "mind"],
  scene: "The big dinner",
  grounding: `${register} In a room one of two people usually fills the silence and the other reads it; one arrives already talking and the other needs ten minutes. Neither is the right way, and the mismatch is only a problem when each takes the other's pace personally.`,
  instructions: `Write In a room together: what happens when these two are in the same room with other people, who fills the silence and who reads it, and what each takes personally that is only pace.

The scene is the big dinner, in present tense with both names and what each does in the first ten minutes. What just happened gives what each needs when other people are around, from their report's words on temperament and how they come across. The pattern says whether this comes naturally or is the challenge ("This is the challenge: …"). Next time gives each one thing to do for the other when they are next out with other people, and one for both.`,
});

const working = lensChapter({
  lens: "people",
  n: 3,
  title: "Working on something together",
  draws: ["career", "mind", "superpowers"],
  scene: "The project with the deadline",
  grounding: `${register} Two people working on one thing divide by pace and by standard: one starts and the other finishes, one wants it right and the other wants it done. The job goes well when each knows which part is theirs before it starts, and badly when both assume the same part.`,
  instructions: `Write Working on something together: how these two divide a job, who starts and who finishes, whose standard wins, and where the assumption about who does what goes wrong.

The scene is the project with the deadline, in present tense with both names and one exchange. What just happened gives what getting it done means to each, from their report's words on calling, the mind and their superpower. The pattern says whether this comes naturally or is the challenge ("This is the challenge: …"), and what it trains. Next time gives each one thing to say before the next job starts, and one for both.`,
});

const fun = lensChapter({
  lens: "people",
  n: 4,
  title: "Having fun",
  draws: ["overview", "superpowers", "discoveries"],
  scene: "The weekend away",
  grounding: `${register} Fun between two people is a question of energy and of plan: one wants the night to go on and the other wants it to have a shape, one brings the idea and the other the company. The best of it is the thing only these two do together.`,
  instructions: `Write Having fun: what these two actually enjoy together, who wants the night to go on and who wants it to end well, who brings the idea and who brings the company, and the thing only these two do.

The scene is the weekend away, in present tense with both names. What just happened gives what each is looking for when they are off duty, from their report's words on temperament, their superpower and their paradoxes. The pattern says whether this comes naturally or is the challenge ("This is the challenge: …"). Next time gives each one thing to offer the other's kind of fun, and one for both.`,
});

const hardTalk = lensChapter({
  lens: "people",
  n: 5,
  title: "The hard talk",
  draws: ["mind", "relationships", "money"],
  scene: "Money between you",
  grounding: `${register} The hard talk between two people who are not partners has no shared bed to repair it in, so it is put off longer and lands harder. One of the two will say it too early and the other too late; the talk goes best when the one who waits names the day and the one who rushes names the one thing they want from it.`,
  instructions: `Write The hard talk: the conversation these two put off, who would say it too early and who too late, and how it goes when it finally happens.

The scene is money between the two of them and the talk about it, in present tense with both names and the actual words one of them opens with. What just happened gives the fear under each side's timing, from their report's words on how they are understood, intimacy and what they hold. The pattern says whether this is the challenge ("This is the challenge: …") and what it trains. Next time gives each one line to open with and one for both: when, where, and the one thing wanted.`,
});

const give = lensChapter({
  lens: "people",
  n: 6,
  title: "What you give each other",
  draws: ["relationships", "family", "focus"],
  scene: "The favour too big to ask",
  grounding: `${register} What two people give each other is what each has that the other lacks and does not resent: the one who calls after three months, the one who says yes to the favour, the joke that holds when nothing else does. It is the reason the relationship survives its silences.`,
  instructions: `Write What you give each other: what each of these two brings that the other does not have, what survives a silence between them, and what each could ask for and does not.

The scene is the favour too big to ask, in present tense with both names. What just happened gives what each gives and what each finds hard to ask, from their report's words on love, roots and what to lean into. The pattern says whether this comes naturally or is the challenge ("This is the challenge: …"), and what it trains. Next time gives each one thing to ask the other for, plainly, and one for both. No prediction, no promise.`,
});

export const PEOPLE: readonly PairSectionSpec[] = [room, working, fun, hardTalk, give];

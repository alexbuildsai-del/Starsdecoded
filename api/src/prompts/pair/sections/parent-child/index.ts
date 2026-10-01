/**
 * Lens 2, Parent and child: goodness of fit (ADR-40 as amended, ADR-67,
 * ADR-69). The child is read as potential, the parent addressed as the one
 * who adapts, and every line is written for the child's age band, the
 * band's own scene included (ADR-176). The research below is doctrine: the
 * reader gets its conclusion as behaviour and never its name. No clinical
 * claim, no diagnosis, no birth order.
 */
import type { Band } from "../../../../lib/pairBrief.js";
import { lensChapter, type BandDoctrine, type ChapterScene, type PairSectionSpec } from "../../shapes.js";
import { BAND_DOCTRINE, bandLines } from "./doctrine.js";

export { BAND_DOCTRINE };

/** The band's own scene and never a neutral one, so the scene is always the child's age (ADR-176). */
function byBand(scenes: Record<Band, string>): ChapterScene {
  return (band) => scenes[band ?? "school"];
}

const fit = "Goodness of fit: a child's temperament is not a problem to fix but a shape the parent's expectations either meet or miss, and the fit, not the temperament, predicts how the days go. The parent is the one who adapts. The child's chart is read as potential, never a verdict.";

function chapter(input: { n: number; title: string; draws: PairSectionSpec["draws"]; scenes: Record<Band, string>; grounding: string; instructions: string }) {
  return lensChapter({
    lens: "parent_child",
    n: input.n,
    title: input.title,
    draws: input.draws!,
    scene: byBand(input.scenes),
    grounding: `${fit} ${input.grounding} ${bandLines()}`,
    instructions: `${input.instructions}\n\nEvery scene, card line and "fair at this age" line is written for the child's age on the day, as the brief gives it, and never contradicts what is fair at that age. Describe situations of this age now. A later stage may be discussed, framed as later. Once the child is over 18, nothing from childhood is described as present: the focus is a young adult's life, moving out, work, money, partners, visits home, and childhood is remembered in the past tense only. Address the parent by name as the one who adapts. Describe the child's behaviour as what the child is for, never what is wrong with them. No diagnosis, no clinical word, no birth order.`,
    bandDoctrine: BAND_DOCTRINE as BandDoctrine,
  });
}

const needs = chapter({
  n: 2,
  title: "What your child needs from you",
  draws: ["relationships", "family", "triad"],
  scenes: { little: "Bedtime, the third call", school: "The morning rush", teen: "The closed door", grown: "The Sunday call" },
  grounding: "What a child needs from a parent is a fit between the child's pace and the parent's, and it changes with age: presence and predictability when little, being seen and given a job when at school, privacy and a door that can close as a teen, and being asked rather than told once grown.",
  instructions: `Write What your child needs from you: what this child's chart says they need from a parent at this age, what this parent's chart reaches for first, and where the two meet or miss.

The scene is the one the brief names for the child's band, at the child's age, in present tense with both names. What just happened gives what the child was reaching for and what the parent was doing, from each report's words on safety, roots and how they come across. The pattern says whether this comes naturally or is the challenge ("This is the challenge: …"), and what the fit trains in the parent. Next time gives the parent two things to try this week and one for both. Include one "fair at this age" line in the pattern or an item: what is reasonable to expect of a child in this band.`,
});

const feelings = chapter({
  n: 3,
  title: "Feelings and the big reactions",
  draws: ["mind", "superpowers", "discoveries"],
  scenes: { little: "The supermarket floor", school: "Losing the game", teen: "The door slam after a text", grown: "The call that ends in silence" },
  grounding: "Emotion coaching has five moves: notice the feeling early, treat it as a chance to get close, listen and take it seriously, help name it, and only then set a limit or solve the problem. Most parents skip one of the five. Which one this parent skips is the chapter. A big reaction is the child's regulation running out, not defiance, and the parent's own regulation is the first tool.",
  instructions: `Write Feelings and the big reactions: how this child's chart carries a feeling and lets it out at this age, how this parent's chart meets a big reaction, and which of the moves that calm a child this parent tends to skip.

The scene is the one the brief names for the child's band, at the child's age, in present tense with both names and what each does in the first minute. What just happened gives the feeling under the child's reaction and the reflex under the parent's response, from each report's words on how they think and their chronic patterns. The pattern says whether this comes naturally or is the challenge ("This is the challenge: …"), and what it trains in the parent. Next time gives the parent the move they skip, as behaviour, and one thing for both. Describe the calming moves as plain behaviour, never as a method with a name.`,
});

const home = chapter({
  n: 4,
  title: "Home, chores and contributing",
  draws: ["money", "family", "overview"],
  scenes: { little: "Tidying before dinner", school: "The room, the deal, the pocket money", teen: "The kitchen after they cooked", grown: "A week back home" },
  grounding: "Contributing at home is how a child learns they matter to the household, and the job has to fit the age: putting toys away and helping carry when little. A set table, a fed pet, a made bed and simple meals at school age. Real cooking, laundry and their own room as a teen. A guest's share when grown. A chore that is too big teaches failure, one that is too small teaches that they are not needed.",
  instructions: `Write Home, chores and contributing: what this child can fairly contribute at this age, what this parent's chart expects of a home, and where the standard and the child's pace meet or miss.

The scene is the one the brief names for the child's band, at the child's age, in present tense with both names. What just happened gives what order and contribution mean to each, from the reports' words on resources, roots and temperament. The pattern says whether this comes naturally or is the challenge ("This is the challenge: …"), and what it trains in the parent. Next time gives the parent one job that fits this age and one way to ask for it, and one thing for both. Include one "fair at this age" line: what a child in this band can reasonably be asked to do at home.`,
});

const school = chapter({
  n: 5,
  title: "School, homework and how they learn",
  draws: ["mind", "career", "superpowers"],
  scenes: { little: "The drawing that isn't \"right\"", school: "Homework at the kitchen table", teen: "\"I've revised\"", grown: "The choice you don't understand" },
  grounding: "Autonomy support beats control: a child learns more and fights less when the parent explains why, offers a choice inside the limit, and lets the child's own way of learning lead. Homework is fair at about ten minutes a night per school year and none before school age. A teen's revision is theirs to own. A grown child's course or job is a choice to ask about, not to correct.",
  instructions: `Write School, homework and how they learn: how this child's chart takes things in and shows what it knows at this age, how this parent's chart helps and where the help becomes control.

The scene is the one the brief names for the child's band, at the child's age, in present tense with both names. What just happened gives how the child learns and what the parent's help is for, from the reports' words on the mind and calling. The pattern says whether this comes naturally or is the challenge ("This is the challenge: …"), and what it trains in the parent. Next time gives the parent one way to support without steering and one thing for both. Include one "fair at this age" line on homework or study at this band.`,
});

const rules = chapter({
  n: 6,
  title: "Rules, freedom and screens",
  draws: ["relationships", "focus", "discoveries"],
  scenes: { little: "Turning off the tablet", school: "One more episode", teen: "The phone at midnight", grown: "The rule that no longer applies" },
  grounding: "Warm and firm together works. Warm alone and firm alone each fail in their own way. Screens are fair by age: none before eighteen months except a video call, an hour of good content a day watched together up to five, consistent limits and no screen in the bedroom at school age, devices out of the bedroom at night as a teen, and no rule at all once grown. Between a parent and a grown child the frictions are lifestyle, money, how often they talk and how the grandchildren are raised, and the only rule that holds is the one both agreed.",
  instructions: `Write Rules, freedom and screens: how this parent's chart sets a limit and how this child's chart tests one at this age, and what warm and firm looks like between these two.

The scene is the one the brief names for the child's band, at the child's age, in present tense with both names and one exchange. What just happened gives what the limit protects for the parent and what the child is reaching for past it, from the reports' words on intimacy, focus and paradoxes. The pattern says whether this comes naturally or is the challenge ("This is the challenge: …"), and what it trains in the parent. Next time gives the parent one rule to hold and one to hand over, and one thing for both. Include one "fair at this age" line on screens or freedom at this band. For a grown child, say that the rule is now an agreement.`,
});

export const PARENT_CHILD: readonly PairSectionSpec[] = [needs, feelings, home, school, rules];

/**
 * The band doctrine (ADR-67): the research lines per band, carried in every
 * parent-and-child prompt and never named on the page. Tantrum norms, chores
 * by age, the ten-minute homework rule, the screen guidance by age, and the
 * frictions between a parent and a grown child. The `never` lists are the
 * contradictions the validator rejects: a line that treats a child as
 * another age.
 */
import type { Band } from "../../../../lib/pairBrief.js";
import { BAND_LABELS } from "../../../../lib/pairBrief.js";

export interface BandEntry {
  /** What is fair at this age, in doctrine: the lines the model writes from. */
  fair: string[];
  /** What a line at this band may never say, with why. */
  never: Array<[string, RegExp]>;
}

export const BAND_DOCTRINE: Record<Band, BandEntry> = {
  little: {
    fair: [
      "tantrums are normal, most between two and four, most over inside five minutes, and they are regulation running out, not defiance",
      "chores are putting toys away, helping carry and wiping a table; nothing that needs a routine kept alone",
      "there is no homework; play, drawing and being read to are the learning",
      "screens: none before eighteen months except a video call, then about an hour a day of good content watched together",
      "bedtime needs the same order every night and a parent who leaves the room the same way",
    ],
    never: [
      ["homework is not fair before school age", /\bhomework\b/i],
      ["pocket money and an allowance belong to school age", /\bpocket money\b|\ban allowance\b/i],
      // "a phone call" is any age; a phone of their own is a teen's.
      ["their own phone and a midnight rule belong to a teen", /\b(their|a) own phone\b|\btheir phone\b|\bmidnight\b/i],
      ["a curfew belongs to a teen", /\bcurfew\b/i],
      // "revise the plan" is any age; revision for exams is a teen's.
      ["exams and revision belong to a teen", /\bexams?\b|\brevision\b/i],
    ],
  },
  school: {
    fair: [
      "big reactions come from losing, unfairness and tiredness; naming the feeling first still works",
      "chores by age: a set table, a fed pet, a made bed and simple food at six to eight; laundry, a packed bag and a simple meal at nine to twelve, with pocket money as its own thing, not a wage",
      "homework is fair at about ten minutes a night per school year, at the kitchen table, with a parent nearby and not doing it",
      "screens: consistent limits, no screen in the bedroom, the same rule every day",
      "a job of their own at home tells the child they are needed",
    ],
    never: [
      ["nappies, potty training and toddler words belong to a little child", /\b(nappy|nappies|diaper|potty|toddler)\b/i],
      ["a midnight phone belongs to a teen", /\bphone at midnight\b|\bmidnight\b/i],
      ["dating belongs to a teen or a grown child", /\b(dating|boyfriend|girlfriend)\b/i],
      // "rent" alone is a verb and a false hit; a mortgage is a grown child's.
      ["a mortgage belongs to a grown child", /\bmortgage\b/i],
    ],
  },
  teen: {
    fair: [
      "autonomy support over control: explain why, give a choice inside the limit, let their way of studying lead",
      "revision is theirs to own; a parent asks how it is going and does not check it",
      "chores are real: cooking a meal, their own laundry, their own room, and being counted on",
      "screens: devices out of the bedroom at night; the rule is agreed with them and kept by both",
      "the closed door is a need for room, not a rejection; a big reaction is best met later, not in the doorway",
    ],
    never: [
      ["tantrums, bedtime stories and toddler care belong to a little child", /\b(tantrum|toddler|nappy|nappies|potty|bedtime story)\b/i],
      ["a nap belongs to a little child", /\bnaps?\b/i],
      ["a star chart belongs to a little or school child", /\bstar chart\b/i],
    ],
  },
  grown: {
    fair: [
      "there is no rule now; what holds is an agreement both made, and the old rule that no longer applies is named as such",
      "the frictions between a parent and a grown child are lifestyle and choices, money, how often they talk, and how any grandchildren are raised",
      "advice is given when asked; a choice the parent does not understand is asked about, not corrected",
      "a week back home is a guest's share of the house, offered and not assigned",
      "the Sunday call is kept by both or by neither; the parent who calls three times gets one answer",
    ],
    never: [
      ["tantrums, bedtime and homework belong to a child", /\b(tantrum|bedtime|homework)\b/i],
      // "grounded" is a compliment for an adult, and a tablet sits on any desk.
      ["pocket money belongs to a child", /\bpocket money\b/i],
      ["a curfew and screen time belong to a child", /\b(curfew|screen time)\b/i],
      ["a chore chart belongs to a child", /\bchore chart\b/i],
    ],
  },
};

/** The doctrine as one block for the prompt, every band, so a scene for one age never borrows another's lines. */
export function bandLines(): string {
  return (Object.keys(BAND_DOCTRINE) as Band[])
    .map((b) => `Fair at ${BAND_LABELS[b]}: ${BAND_DOCTRINE[b].fair.join("; ")}.`)
    .join(" ");
}

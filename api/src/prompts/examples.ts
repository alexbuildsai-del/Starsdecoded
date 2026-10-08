/**
 * Model passages for the Personal report's chapters (ADR-383): short paragraphs in the four moves (explain-like-a-friend
 * §4), each on a real fixture chart outside the Release's five. A writer copies what it is shown, so no passage is handed
 * out alone or to every call: a chapter gets two, and one reader's chapters walk the set in pairs (MB-92's lesson).
 * Every placement a passage names was computed from its fixture with `calculateNatalChart`, never typed from memory, so
 * `fixture` is the file to recompute it from.
 */
import type { ReportSectionId } from "./index.js";

export interface ModelPassage {
  id: string;
  /** The `fixtures/charts/` file the passage was written on. */
  fixture: string;
  /** The fixture's birth date (YYYY-MM-DD): a reader born that day is never shown the passage. */
  birthDate: string;
  text: string;
}

export const PASSAGES: readonly ModelPassage[] = [
  {
    id: "self-george",
    fixture: "george",
    birthDate: "2013-07-22",
    text: "People may tell you, a few months in, that you seemed hard to read at first. Saturn sits in your 1st house, which is about how you come across. Saturn is where you are strict with yourself and take your time. So you might keep your guard up until you know how a place works. On your first day somewhere new, you could be the one who listens and says very little. That care tends to earn trust over time. Share one thing that makes you laugh in your first week, so people see your warm side sooner.",
  },
  {
    id: "mind-beatrice",
    fixture: "beatrice",
    birthDate: "1988-08-08",
    text: "You might answer a message before you've read it all. Mars is in your 3rd house, where everyday talk and learning happen. Mars is the part of you that pushes and acts. Yours is in Aries, a home sign for Mars, since both like to go first. That's why your words tend to come out quick and direct. In a family group chat, you could settle the weekend plan in two minutes, and someone may feel rushed. When a reply feels urgent, wait one minute before you send it, so it comes across the way you meant.",
  },
  {
    id: "work-william",
    fixture: "william",
    birthDate: "1982-06-21",
    text: "Your best workdays may start slow and pleasant. Venus is in your 6th house, the one for daily work and habits. Venus shows what you like and what puts you at ease. Your Venus is at home in Taurus, because both like comfort and a pace that isn't rushed. A calm routine can help you get more done. On a Monday, you might tidy your desk and make a cup of tea before you open the hard email. Do the hard task first and keep the nice part for after, so a good start doesn't turn into putting it off.",
  },
  {
    id: "money-charles",
    fixture: "charles",
    birthDate: "1948-11-14",
    text: "Money might feel like something to guard, even when there is enough. Saturn sits in your 2nd house, your money and what you own. Saturn is where you are careful, and sometimes afraid of getting it wrong. So you may save well and still find it hard to spend on yourself. You could want a good winter coat for three years before you let yourself buy it. Set a small amount aside each month just for you. Spend it without guilt, so saving stays a choice, not a worry.",
  },
  {
    id: "love-beatrice",
    fixture: "beatrice",
    birthDate: "1988-08-08",
    text: "You may feel most like yourself when one person gives you their full attention. The Sun is in your 7th house, the house of partners. The Sun is the core of you. Yours is in Leo, which wants to shine. So the right partner can bring out your best. On a date, you might notice the second they look at their phone. That small thing could stay with you all evening. Tell a partner what you'd like them to notice, so you don't have to wait to be seen.",
  },
  {
    id: "family-charlotte",
    fixture: "charlotte",
    birthDate: "2015-05-02",
    text: "At family meals, you might make sure everyone gets a turn to talk. The Moon is in your 4th house, which is home and family. The Moon is what you need to feel safe and calm. Yours is in Libra, which cares about fairness and keeping the peace. Home may only feel right to you when it feels fair. If two people argue over Sunday lunch, you may smooth it over before dessert. Say one thing you want at home this week, even if it starts a small debate, so your needs get a turn too.",
  },
  {
    id: "empty-house-william",
    fixture: "william",
    birthDate: "1982-06-21",
    text: "At work, people may come to know you one good conversation at a time. Your 10th house, your career, has no planets in it. Virgo starts that house, and Virgo's planet is Mercury, your mind and your words. Yours is at home in Gemini, because Mercury likes words and questions, and so does Gemini. It sits in your 7th house, the part of life you share with one other person. So your career story tends to happen across a table. A coffee with the right person could do more for you than a big meeting. Ask for the one-to-one chat, not the group call.",
  },
  {
    id: "friends-charlotte",
    fixture: "charlotte",
    birthDate: "2015-05-02",
    text: "With friends, you might be slow to push, then hard to move. Mars is in your 11th house, the one about friends and groups. Mars is your drive, the push to get what you want. Yours is least at ease in Taurus, since Mars wants to move fast and Taurus would rather stay where it is. Your push may build up and come out all at once. When the group moves the trip date a third time, you could dig in on the first one. Name the date you want the first time it comes up, so it doesn't turn into a fight.",
  },
  {
    id: "belief-athena",
    fixture: "athena",
    birthDate: "2025-01-22",
    text: "Speaking up for an idea may come easier to you than talking about yourself. The Sun is in your 9th house, which covers big ideas and long trips. The Sun is who you are and what you stand for. Your Sun is least at ease in Aquarius, since it likes to stand alone and Aquarius thinks of the group first. So you may show who you are through the causes you pick. On a long train ride, you could talk about the world for hours and never mention your week. When someone asks how you are, give one real answer about your own life.",
  },
  {
    id: "play-charles",
    fixture: "charles",
    birthDate: "1948-11-14",
    text: "A free Saturday can fill up fast when you make the plans. Jupiter is in your 5th house, which is fun and making things. Jupiter is the side of you that wants more of a good thing. Yours is in Sagittarius, Jupiter's home sign, since both aim far and like the big picture. You may go big on fun and start more than you finish. By ten in the morning, you could have planned a long walk, a new recipe and a film. Pick one thing this weekend and let the rest wait, so you have time to enjoy it.",
  },
];

// Report order, so one reader's chapters take consecutive pairs from their own order of the set: each passage is
// shown about twice a report, and two chapters side by side never share one.
const CHAPTERS: readonly ReportSectionId[] = [
  "overview", "houses", "mind", "career", "money", "relationships", "family", "superpowers", "discoveries", "focus",
];

// FNV-1a: a fixed spread with no dependency, so the same reader and chapter always draw the same two.
function seedOf(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193);
  return h >>> 0;
}

/** Two passages for one chapter call, the same two for the same chapter and birth date. */
export function examplesFor(section: string, birthDate: string): readonly ModelPassage[] {
  const day = birthDate.slice(0, 10);
  const order = PASSAGES.filter((p) => p.birthDate !== day)
    .map((p) => ({ p, rank: seedOf(`${day}|${p.id}`) }))
    .sort((a, b) => a.rank - b.rank)
    .map(({ p }) => p);
  const id = section.replace(/^natal:/, "");
  const chapter = (CHAPTERS as readonly string[]).indexOf(id);
  const start = (2 * (chapter >= 0 ? chapter : seedOf(id))) % order.length;
  return [order[start], order[(start + 1) % order.length]];
}

/** The block a chapter's user prompt carries: the passages as a pattern, their words and placements someone else's. */
export function renderExamples(passages: readonly ModelPassage[]): string {
  if (passages.length === 0) return "";
  return [
    "MODEL PASSAGES. Each was written for someone else's chart. They show a pattern, never words to copy: their placements, scenes and words belong to other people, not to this reader. Take only the shape. Open on the reader's life. Name one placement once and say what it means in one plain sentence. Show one moment the reader can check. Use could, might and may, never will. End on one thing to do.",
    ...passages.flatMap((p, i) => ["", `Passage ${i + 1}: ${p.text}`]),
  ].join("\n");
}

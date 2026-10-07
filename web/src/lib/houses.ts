/**
 * The one house set (ADR-321, report-loading-story §3). For each of the twelve houses: the product's word, the
 * object Reading the sky gives it, a plain line on what it covers, and the house across the wheel with the
 * pair's two words. The loading story, /learn/whole-sign-houses, House by House and the film's data read the
 * houses from here, so no other copy of the words is kept in `web/`.
 */

/**
 * One word per house, the first word of each title (ADR-98) except the 12th, whose title opens "Time alone":
 * the word stays "Solitude" so the 12th keeps one word on the wheel. The API's prompt test reads this literal
 * to hold the writer's vocabulary to the page's words, so it stays one array of plain strings.
 */
export const HOUSE_WORDS = [
  "Self", "Money", "Mind", "Home", "Play", "Work",
  "Partnership", "Depth", "Belief", "Career", "Friends", "Solitude",
] as const;

export type HouseWord = (typeof HOUSE_WORDS)[number];

/**
 * What each house covers, in everyday words: the house set's after column, where the 5th says "love" for the
 * old "romance" (the Owner's Review 05/10 note). Lower case, since each line reads after its house's word or
 * inside a sentence.
 */
export const HOUSE_COVERS = [
  "your body and how you come across",
  "money and the things you own",
  "talking, learning, brothers and sisters",
  "home, family, your roots",
  "fun, making things, love, children",
  "daily work, habits, health",
  "partners and the people you face one to one",
  "what you share, what's passed down",
  "long trips, big ideas, what you believe",
  "your work and what you're known for",
  "friends, groups, shared hopes",
  "rest, time alone, what goes on out of sight",
] as const;

/** The twelve objects, house by house, named as the house set prints them ("1 Mirror · Self"). */
export const HOUSE_OBJECTS = [
  "Mirror", "Wallet", "Phone", "Family tree", "Paintbrush", "To-do list",
  "Handshake", "Locked box", "Passport", "Spotlight", "Team", "Pillow",
] as const;

export type HouseObjectId = (typeof HOUSE_OBJECTS)[number];

/** One opposite pair as the house set lists it: the house from 1 to 6, its side, then the side of the house six on. */
export type HousePair = readonly [house: number, side: string, oppositeSide: string];

/** 3 and 9 read "everyday · big picture", not the film's "near · far": the Owner found "far" meant nothing. */
export const PAIRS: readonly HousePair[] = [
  [1, "me", "the other person"],
  [2, "mine", "shared"],
  [3, "everyday", "big picture"],
  [4, "private", "public"],
  [5, "my joy", "our hopes"],
  [6, "doing", "resting"],
];

export interface House {
  /** 1 to 12. */
  n: number;
  word: HouseWord;
  object: HouseObjectId;
  covers: string;
  /** The house across the wheel, six on. */
  opposite: number;
  /** The pair's two words from this house's side: the 1st reads "me · the other person", the 7th "the other person · me". */
  pair: readonly [string, string];
}

export const HOUSES: readonly House[] = HOUSE_WORDS.map((word, i) => {
  const n = i + 1;
  const [, side, oppositeSide] = PAIRS[i % 6];
  return {
    n,
    word,
    object: HOUSE_OBJECTS[i],
    covers: HOUSE_COVERS[i],
    opposite: n <= 6 ? n + 6 : n - 6,
    pair: n <= 6 ? [side, oppositeSide] : [oppositeSide, side],
  };
});

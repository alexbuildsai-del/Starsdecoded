/**
 * What a Timeline reading may not say (ADR-210; annex rows 44 to 48). Three
 * faults block because the text would be wrong for the reader (ADR-81): a
 * date or degree the event did not compute, a life event foretold, and a do
 * or a don't. Every message names the kind of fault and the field, never the
 * words that broke it, so a birth date a writer slipped in never reaches the
 * failure log (R-3.5).
 *
 * The call path counts rule 13's words (chk-39) and the writer's rule
 * (chk-43) on every reply, as it does for a report, so they are not counted
 * here a second time.
 */
import { DATA_CLOSE, DATA_LABELS, DATA_OPEN, restoreBlocks } from "../data.js";
import { block, buffered, fixed, type Check, type Validated } from "../checks.js";
import { semicolonsToFullStops } from "../pair/shapes.js";
import { BODY_WORDS, LINE_WORDS, eventFacts, type ReadingInput, type ReadingOutput } from "./reading.js";

/** What a text may name: every instant the engine computed, and every degree the facts state. */
export interface AllowedFacts {
  instants: readonly Date[];
  degrees: readonly number[];
}

const DAY_MS = 86_400_000;

/** 20% around the counts the prompt states (R-4.3), as the pair's card line and link cards take it (annex rows 23, 32). */
export const LINE_BUFFER = Math.round(LINE_WORDS * 1.2);
export const BODY_BUFFER: readonly [number, number] = [Math.round(BODY_WORDS[0] * 0.8), Math.round(BODY_WORDS[1] * 1.2)];

const words = (s: string): number => (s.trim() ? s.trim().split(/\s+/).length : 0);

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MONTH_SHORT: Readonly<Record<string, number>> = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Sept: 8, Oct: 9, Nov: 10, Dec: 11 };
const MONTH = `(${MONTH_NAMES.join("|")}|${Object.keys(MONTH_SHORT).join("|")})\\.?`;
const DAY = String.raw`([12]\d|3[01]|0?[1-9])(?:st|nd|rd|th)?`;
const YEAR = String.raw`(1[89]\d{2}|2[01]\d{2})`;
const NUMBER_WORDS = ["a", "an", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "a few", "a couple of"];
const SEASON = "(?:spring|summer|autumn|winter)";

function monthOf(name: string): number {
  const full = MONTH_NAMES.indexOf(name);
  return full >= 0 ? full : MONTH_SHORT[name];
}

/** A day as the reader may see it: the computed instant's UTC day, or one either side for their zone. */
function daysAround(instants: readonly Date[]): Date[] {
  return instants.flatMap((at) => {
    const day = Math.floor(at.getTime() / DAY_MS) * DAY_MS;
    return [day - DAY_MS, day, day + DAY_MS].map((ms) => new Date(ms));
  });
}

type DateKind = "date" | "day" | "month" | "year" | "season" | "holiday" | "relative" | "clock";

const KIND_WORDS: Record<DateKind, [string, string]> = {
  date: ["a date", "dates"],
  day: ["a day of a month", "days of a month"],
  month: ["a month", "months"],
  year: ["a year", "years"],
  season: ["a season", "seasons"],
  holiday: ["a holiday or a birthday", "holidays or birthdays"],
  relative: ["a time counted from today", "times counted from today"],
  clock: ["a clock time", "clock times"],
};

interface Found {
  kind: DateKind;
  /** Whether a day the reader may see matches it; a season, a holiday, a time from today or a clock time never does. */
  ok: (days: readonly Date[]) => boolean;
}

const sameDay = (y: number, m: number, d: number) => (day: Date) => day.getUTCFullYear() === y && day.getUTCMonth() === m && day.getUTCDate() === d;
const never = () => false;

interface Pattern {
  re: RegExp;
  found: (m: RegExpExecArray) => Found | null;
}

const fullYear = (y: string): number => (y.length === 2 ? 2000 + Number(y) : Number(y));

/** Most specific first: each match is blanked before the next pattern runs, so "12 March 2026" never counts again as a year. */
const DATE_PATTERNS: readonly Pattern[] = [
  {
    re: /\b(\d{4})-(\d{2})-(\d{2})\b/g,
    found: (m) => ({ kind: "date", ok: (days) => days.some(sameDay(Number(m[1]), Number(m[2]) - 1, Number(m[3]))) }),
  },
  {
    // Either order, since the reader's language decides which a writer used.
    re: /\b(\d{1,2})[/.](\d{1,2})[/.](\d{4}|\d{2})\b/g,
    found: (m) => {
      const [a, b, y] = [Number(m[1]), Number(m[2]), fullYear(m[3])];
      return { kind: "date", ok: (days) => days.some((d) => sameDay(y, b - 1, a)(d) || sameDay(y, a - 1, b)(d)) };
    },
  },
  {
    re: new RegExp(String.raw`\b(?:the\s+)?${DAY}\s+(?:of\s+)?${MONTH}(?:,?\s+${YEAR})?\b`, "g"),
    found: (m) => dayMonth(Number(m[1]), monthOf(m[2]), m[3]),
  },
  {
    re: new RegExp(String.raw`\b${MONTH}\s+${DAY}(?:,?\s+${YEAR})?\b`, "g"),
    found: (m) => dayMonth(Number(m[2]), monthOf(m[1]), m[3]),
  },
  {
    re: new RegExp(String.raw`\b${MONTH}\s+(?:of\s+)?${YEAR}\b`, "g"),
    found: (m) => {
      const [month, year] = [monthOf(m[1]), Number(m[2])];
      return { kind: "month", ok: (days) => days.some((d) => d.getUTCFullYear() === year && d.getUTCMonth() === month) };
    },
  },
  {
    re: new RegExp(String.raw`\b(?:(?:this|next|last|coming)\s+${SEASON}|${SEASON}\s+(?:of\s+)?${YEAR}|(?:by|until|till|before|after|around|in|during|over|through)\s+(?:the\s+)?(?:early\s+|late\s+)?${SEASON})\b`, "gi"),
    found: () => ({ kind: "season", ok: never }),
  },
  {
    // Capitals only for the holidays, since "a new year of your life" is no date.
    re: /\b(?:Christmas|New Year|Easter|Thanksgiving|Halloween)\b|\b[Yy]our\s+(?:next\s+)?birthday\b/g,
    found: () => ({ kind: "holiday", ok: never }),
  },
  {
    re: new RegExp(String.raw`\b(?:tomorrow|tonight|yesterday|(?:next|last|this|coming)\s+(?:week|weekend|fortnight|month|year)|in\s+(?:${NUMBER_WORDS.join("|")}|\d+)\s+(?:days?|weeks?|months?|years?)(?:['’]?\s*time)?|(?:${NUMBER_WORDS.join("|")}|\d+)\s+(?:days?|weeks?|months?|years?)\s+(?:from now|ago))\b`, "gi"),
    found: () => ({ kind: "relative", ok: never }),
  },
  {
    re: /\b(?:[01]?\d|2[0-3]):[0-5]\d\b|\b(?:1[0-2]|0?[1-9])\s*(?:am|pm|a\.m\.|p\.m\.)(?!\w)|\bo['’]clock\b/gi,
    found: () => ({ kind: "clock", ok: never }),
  },
  {
    // A year beside a unit is a count, not a date.
    re: new RegExp(String.raw`(?<![£$€\d.,])\b${YEAR}\b(?!\s*(?:words?|people|times|km|miles|metres|meters|%|°))`, "g"),
    found: (m) => {
      const year = Number(m[1]);
      return { kind: "year", ok: (days) => days.some((d) => d.getUTCFullYear() === year) };
    },
  },
];

function dayMonth(day: number, month: number, year: string | undefined): Found {
  if (year) return { kind: "date", ok: (days) => days.some(sameDay(Number(year), month, day)) };
  return { kind: "day", ok: (days) => days.some((d) => d.getUTCMonth() === month && d.getUTCDate() === day) };
}

/**
 * A month named alone, after a word that makes it one ("in March", "until
 * May"). Alone it could be the reader's own name or "May" opening a sentence,
 * so it counts only after such a word and never when it spells the name.
 */
const MONTH_AFTER = ["in", "by", "until", "till", "through", "since", "from", "to", "before", "after", "around", "during", "early", "late", "mid", "end of", "start of", "beginning of", "middle of", "this", "next", "last", "of", "and", "or"];
// The word before may open a sentence, so its first letter takes either case while the month's stays a capital. A comma
// carries a list of months on: "in May, September and February".
const BARE_MONTH = new RegExp(String.raw`(?:\b(?:${MONTH_AFTER.map((w) => `[${w[0]}${w[0].toUpperCase()}]${w.slice(1)}`).join("|")})|,)\s+(?:early\s+|late\s+|mid-?)?(${MONTH_NAMES.join("|")})\b`, "g");

function blank(text: string, from: number, to: number): string {
  return text.slice(0, from) + " ".repeat(to - from) + text.slice(to);
}

function datesIn(text: string, names: readonly string[]): Found[] {
  const found: Found[] = [];
  let rest = text;
  for (const pattern of DATE_PATTERNS) {
    for (const m of [...rest.matchAll(pattern.re)]) {
      const f = pattern.found(m as RegExpExecArray);
      if (!f) continue;
      found.push(f);
      rest = blank(rest, m.index ?? 0, (m.index ?? 0) + m[0].length);
    }
  }
  const spelled = new Set(names.flatMap((n) => n.split(/\s+/)).map((w) => w.toLowerCase()));
  for (const m of rest.matchAll(BARE_MONTH)) {
    if (spelled.has(m[1].toLowerCase())) continue;
    const month = monthOf(m[1]);
    found.push({ kind: "month", ok: (days) => days.some((d) => d.getUTCMonth() === month) });
  }
  return found;
}

const SPELLED_DEGREES: Readonly<Record<string, number>> = {
  half: 0.5, a: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
};

/** A degree as written, with how far from a stated degree its own precision lets it sit. */
interface WrittenDegree {
  value: number;
  /** Whole degrees match a stated degree cut or rounded, as a chart or a person prints it. */
  whole: boolean;
  tolerance: number;
}

const DEGREE_RE = /(\d+(?:\.(\d+))?)\s*(?:°|º|˚|\s?degrees?\b|\s?deg\b)(?:\s*(\d{1,2})\s*(?:′|'|’|\s?minutes?\b))?/gi;
const SPELLED_DEGREE_RE = /\b(?:(two|three|four|five|six|seven|eight|nine|ten)\s+degrees|(?:within|by|to|than|about|only|just|under)\s+(half|a|one)\s+(?:a\s+)?degree)\b/gi;

function degreesIn(text: string): WrittenDegree[] {
  const out: WrittenDegree[] = [];
  for (const m of text.matchAll(DEGREE_RE)) {
    const minutes = m[3] === undefined ? 0 : Number(m[3]);
    const decimals = m[2]?.length ?? 0;
    const value = Number(m[1]) + minutes / 60;
    if (m[3] !== undefined) out.push({ value, whole: false, tolerance: 1.5 / 60 });
    else if (decimals) out.push({ value, whole: false, tolerance: 0.5 * 10 ** -decimals + 0.005 });
    else out.push({ value, whole: true, tolerance: 0.005 });
  }
  for (const m of text.matchAll(SPELLED_DEGREE_RE)) {
    out.push({ value: SPELLED_DEGREES[(m[1] ?? m[2]).toLowerCase()], whole: true, tolerance: 0.005 });
  }
  return out;
}

function degreeAllowed(written: WrittenDegree, allowed: readonly number[]): boolean {
  return allowed.some((v) => Math.abs(written.value - v) <= written.tolerance || (written.whole && (written.value === Math.floor(v + 1e-9) || written.value === Math.round(v))));
}

function counted([one, many]: [string, string], n: number): string {
  return n === 1 ? one : `${n} ${many}`;
}

/**
 * chk-44 (annex row 44): every date, month, year and degree in the text must
 * be one the event computed, a day either side allowed for the reader's
 * zone. A season, a holiday, a clock time or a time counted from today is
 * never one: no event lists it, and a kept reading is read on another day.
 */
export function dateChecks(text: string, allowed: AllowedFacts, where: string, names: readonly string[] = []): Check[] {
  const days = daysAround(allowed.instants);
  const missed = new Map<DateKind, number>();
  for (const f of datesIn(text, names)) if (!f.ok(days)) missed.set(f.kind, (missed.get(f.kind) ?? 0) + 1);
  const checks = [...missed].map(([kind, n]) => block("chk-44", `${where}: names ${counted(KIND_WORDS[kind], n)} that THE EVENT does not list`));
  const degrees = degreesIn(text).filter((d) => !degreeAllowed(d, allowed.degrees)).length;
  if (degrees) checks.push(block("chk-44", `${where}: names ${counted(["a degree", "degrees"], degrees)} that THE EVENT does not list`));
  return checks;
}

/** Lists find a shape, never a meaning: a sentence counts when a word that looks ahead meets a thing that happens to a life. */
type Listed = ReadonlyArray<readonly [label: string, pattern: RegExp]>;

const LOOKS_AHEAD = String.raw`(?:will|won['’]t|shall|['’]ll|(?:is|are|['’]s|['’]re)\s+(?:going|set|bound|sure|certain|about|likely)\s+to|(?:is|are)\s+(?:coming|on\s+(?:its|their|the)\s+way|in\s+store|around\s+the\s+corner)|lies?\s+ahead|awaits?|expect(?:s|ed)?|(?:could|may|might|can)\s+bring|brings?|bringing|leads?\s+to)`;

/** Words that mark a partner still to come, so "your future husband" is foretold where "your partner" is someone the reader has. */
const TO_COME = String.raw`(?:future|next|new|true|real|perfect|right|special|dream|one\s+true)`;
// "One" is left out: after "new" or "next" it is a thing as often as a person ("you will find a new one").
const PARTNER = String.raw`(?:husband|wife|spouse|partner|lover|love|boyfriend|girlfriend|match|man|woman|person)`;
/**
 * A verb straight after its subject is a habit the report names ("You lose
 * money when you rush, because you will say yes"), not a thing foretold, so
 * the verbs below count only in another form: "you'll lose", "to fall in love".
 */
const HABIT = String.raw`(?<!\b(?:you|they|we|i|he|she|people)\s+(?:(?:often|usually|always|sometimes|rarely|tend\s+to|can|could)\s+)?)`;
const owned = (pattern: string): RegExp => new RegExp(`${HABIT}(?:${pattern})`, "i");

const LIFE_EVENTS: Listed = [
  ["a new job", /\b(?:new|dream|better|different)\s+(?:job|role|position|career)\b|\bjob\s+(?:offer|loss)\b/i],
  ["a promotion", /\bpromot(?:ion|ed)\b|\ba\s+(?:pay\s+)?raise\b|\bpay\s+rise\b/i],
  // "Fired up" is a feeling.
  ["losing a job", /\b(?:fired(?!\s+up\b)|laid\s+off|sacked|redundan(?:t|cy))\b|\blet\s+go\s+from\b/i],
  // Present forms only: "you will think back to when you lost your job" recalls the reader's past.
  ["losing a job", owned(String.raw`\b(?:los(?:e|es|ing)|quit(?:s|ting)?|leav(?:e|es|ing))\s+(?:your|their|his|her|my|our|a|the|this|that)\s+(?:(?:current|day|old)\s+)?(?:job|career)s?\b|\bout\s+of\s+a\s+job\b|\b(?:be|being)\s+out\s+of\s+work\b|\bhand(?:s|ing)?\s+in\s+(?:your|their|his|her|my|our|a|the)\s+notice\b`)],
  // "Resigned" is a feeling and "resign yourself to it" is acceptance: neither is leaving a job.
  ["losing a job", owned(String.raw`\bresign(?:s|ing)?\b(?!\s+(?:yourself|themselves|himself|herself|ourselves|myself|to)\b)`)],
  ["meeting someone", /\bmeet\s+(?:someone|somebody|a\s+(?:new\s+)?(?:partner|lover|love|man|woman|person))\b|\bsoul\s?mate\b|\bthe\s+love\s+of\s+your\s+life\b/i],
  ["meeting someone", owned(String.raw`\b(?:meet|meets|meeting|find|finds|finding)\s+(?:your|the|a|an)\s+(?:${TO_COME}\s+)+${PARTNER}\b`)],
  // "The one" alone is a person; "the one thing you need" is not.
  ["meeting someone", owned(String.raw`\b(?:meet|meets|meeting|find|finds|finding)\s+the\s+one\b(?=\s*(?:[.,;:!?)”"’]|$)|\s+(?:for\s+you|who|you)\b)`)],
  // Love found "in small things" or "for yourself" is a feeling, not a person.
  ["meeting someone", owned(String.raw`\bfind(?:s|ing)?\s+(?:love\b(?!\s+(?:in|for|of)\b)|(?:a|your)\s+(?:partner|lover|husband|wife|boyfriend|girlfriend|spouse)\b)`)],
  ["a new relationship", /\b(?:new|romantic)\s+(?:relationship|romance|love|partner|lover)\b|\ban\s+affair\b/i],
  ["a new relationship", owned(String.raw`\bfall(?:s|ing)?\s+(?:(?:head\s+over\s+heels\s+)?in\s+love|for\s+(?:someone|somebody))\b`)],
  ["a breakup", /\bbreak(?:s|ing)?[\s-]?up\b|\bsplit(?:s|ting)?\s+up\b|\bdivorc(?:e|es|ed|ing)\b/i],
  ["a wedding", /\b(?:wedding|marriage|marr(?:y|ies|ied|ying)|get(?:ting)?\s+engaged|propos(?:e|es|ing)\s+to)\b/i],
  ["a baby", /\bpregnan(?:t|cy)\b|\b(?:a|the)\s+baby\b|\bhave\s+(?:a\s+)?(?:baby|child|children|kids)\b/i],
  // "Die down" is a feeling easing, not a death.
  ["a death", /\b(?:death|dying|pass(?:es)?\s+away)\b|\bdies?\b(?!\s+(?:down|away|off|out))/i],
  ["an illness", /\b(?:illness|sickness|disease|diagnos(?:is|ed)|surgery|injur(?:y|ies|ed))\b|\b(?:an?|the)\s+accident\b|\b(?:fall|falls|get|gets|getting)\s+(?:ill|sick)\b/i],
  ["money coming", /\b(?:windfall|lottery|inheritance|inherit|bankrupt(?:cy)?)\b|\ba\s+(?:small\s+)?fortune\b|\bmoney\s+(?:comes|is\s+coming|arrives|flows\s+in)\b/i],
  ["getting rich", owned(String.raw`\b(?:(?:get|gets|getting|become|becomes|becoming|grow|grows|growing|end\s+up)\s+(?:very\s+|really\s+|so\s+)?(?:rich|wealthy)\b|strike\s+it\s+rich\b|make\s+(?:(?:a\s+lot\s+of|lots\s+of|more|good|big|serious|real)\s+)?money\b|come\s+into\s+(?:some\s+)?money\b)`)],
  // "Rich" after "be" is often a feeling ("this time will be rich"), so it counts only with a person as the subject.
  ["getting rich", /\b(?:you|they|he|she|we)(?:['’]ll|\s+will|\s+(?:are|is|['’]re)\s+going\s+to)\s+(?:soon\s+|finally\s+)?be\s+(?:very\s+|really\s+)?(?:rich|wealthy)\b(?!\s+(?:in|with)\b)/i],
  ["losing money", owned(String.raw`\b(?:los(?:e|es|ing)\s+(?:(?:a\s+lot\s+of|all\s+(?:of\s+)?(?:your|their|his|her)|your|their|his|her|some)\s+)?(?:money|savings)|(?:go|goes|going)\s+broke)\b`)],
  ["buying or selling a home", owned(String.raw`\b(?:buy|buys|buying|sell|sells|selling|purchas(?:e|es|ing))\s+(?:a|an|the|your|their|his|her|our|my)\s+(?:(?:first|new|own|dream|next|bigger|smaller|family)\s+)*(?:house|home|flat|apartment|property|car)\b`)],
  ["a move", /\bmov(?:e|es|ing)\s+(?:house|home|abroad|away|cities|countries|to\s+a\s+new\s+(?:city|country|home|place))\b|\brelocat(?:e|es|ion|ing)\b|\bemigrat(?:e|es|ion|ing)\b/i],
  ["a trip", /\b(?:a|the|your)\s+trip\b|\btravel(?:s|ling|ing)?\s+abroad\b/i],
  ["a deal", /\ba\s+deal\b|\b(?:a|the|new)\s+contract\b|\blawsuit\b|\bcourt\s+case\b/i],
  ["luck", /\b(?:luck|lucky|unlucky|misfortune)\b/i],
];

const FATE: Listed = [
  ["fate", /\b(?:fate|fated|fateful|destin(?:y|ies|ed)|karma|karmic|meant\s+to\s+be|written\s+in\s+the\s+stars|in\s+the\s+cards)\b/i],
];

const OUTCOMES: Listed = [
  ["a promised outcome", new RegExp(String.raw`\b(?:will|['’]ll|(?:is|are)\s+going\s+to)\s+(?:all\s+)?(?:work\s+out|turn\s+out\s+(?:well|fine|right)|be\s+(?:fine|okay|ok|alright|all\s+right|worth\s+it|a\s+success)|go\s+(?:well|smoothly|your\s+way)|pay\s+off|fall\s+into\s+place|get\s+better|succeed|come\s+true)\b`, "i")],
];

const AHEAD_RE = new RegExp(String.raw`\b${LOOKS_AHEAD}\b`, "i");

/** A sentence ends at a stop, with a closing quote or bracket kept on it. */
function sentencesOf(text: string): string[] {
  return text.split(/(?<=[.!?][”"’')\]]?)\s+/).map((s) => s.trim()).filter(Boolean);
}

/**
 * chk-45 (annex row 45): a life event foretold, a promised outcome or fate
 * (R-5.2 as amended, ADR-206). A sky event in the future tense is the
 * reading's own subject and passes: only a thing that happens to a life counts.
 */
export function predictionChecks(text: string, where: string): Check[] {
  const hits = new Set<string>();
  for (const sentence of sentencesOf(text)) {
    const ahead = AHEAD_RE.exec(sentence)?.[0];
    if (ahead) for (const [label, pattern] of LIFE_EVENTS) if (pattern.test(sentence)) hits.add(`"${ahead.toLowerCase().replace(/\s+/g, " ")}" with ${label}`);
    for (const [label, pattern] of [...FATE, ...OUTCOMES]) if (pattern.test(sentence)) hits.add(label);
  }
  return hits.size ? [block("chk-45", `${where}: says what will happen in the reader's life (${[...hits].join(", ")})`)] : [];
}

/**
 * "You feel you should do more" and "as if you must earn rest" say what the
 * reader feels, so a thought or a feeling before the word lets it pass. "You
 * need to feel heard" names a need the way a report does, so "need to" and
 * "have to" are never counted.
 */
const FELT = String.raw`(?<!\b(?:feel|feels|felt|feeling|think|thinks|thought|believe|believes|sense|senses|assume|assumes|assumed|tell\s+yourself|told\s+yourself|telling\s+yourself|wonder\s+(?:if|whether)|as\s+if|as\s+though|like)\s+(?:that\s+)?)`;

/** "What you should have said" and "you must have felt it" look back, and order nothing. */
const LOOKED_BACK = String.raw`(?!(?:\s+have|['’]ve)\s+(?:been|said|done|known|told|felt|seen|gone|made|taken|thought|kept|left|had|got|gotten|given|come|meant|spoken|chosen|let|put|\w+ed)\b)`;

const ADVICE: Listed = [
  ["should", new RegExp(String.raw`${FELT}\b(?:you|we)\s+(?:really\s+|probably\s+)?(?:should|shouldn['’]t|ought\s+(?:not\s+)?to)${LOOKED_BACK}\b`, "i")],
  // "You'd" carries its "would" or "had" with no space before it.
  ["must", new RegExp(String.raw`${FELT}\byou(?:\s+(?:really\s+)?(?:must|mustn['’]t)${LOOKED_BACK}|(?:['’]d|\s+(?:would|had))\s+(?:really\s+)?(?:better|do\s+well\s+to|be\s+(?:wise|smart)\s+to|be\s+better\s+off))\b`, "i")],
  ["be sure to", /\bbe\s+sure\s+to\b/i],
  // "It's important to you" is what matters to the reader: only a verb after "to" makes it advice.
  ["it's best to", /\bit(?:['’]s|\s+is|\s+would\s+be)\s+(?:best|better|wise|smart|important|essential|crucial|vital|a\s+good\s+idea)\s+(?:(?:not\s+)?to\s+(?!(?:you|them|him|her|me|us)\b)\w|that\s+you|if\s+you)/i],
  ["I suggest", /\b(?:i|we)\s+(?:suggest|recommend|advise|urge)\b|\b(?:my|our)\s+advice\b/i],
  ["you might want to", /\byou\s+(?:might|may|could)\s+(?:want|wish|like)\s+to\b/i],
];

/** Verbs a sentence opens on when it tells someone what to do. */
const COMMANDS = new Set([
  "accept", "act", "allow", "ask", "avoid", "be", "begin", "book", "breathe", "buy", "call", "celebrate", "check", "choose", "commit",
  "consider", "decide", "delay", "do", "don't", "don’t", "drop", "embrace", "enjoy", "find", "focus", "follow", "get", "give", "go",
  "guard", "hold", "honour", "honor", "invest", "keep", "lean", "leave", "let", "limit", "listen", "look", "make", "move", "note", "notice",
  "open", "pause", "plan", "postpone", "practise", "practice", "prepare", "protect", "push", "quit", "reach", "reconsider", "reflect",
  "remember", "rest", "review", "revisit", "rush", "save", "say", "schedule", "see", "sell", "sign", "slow", "speak", "spend", "start",
  "stay", "step", "stop", "take", "talk", "tell", "think", "treat", "trust", "try", "use", "wait", "watch", "welcome", "write",
]);

/** Never a noun or a describing word at the head of a sentence, so whatever follows, the sentence is a command. */
const ALWAYS_COMMANDS = new Set(["be", "don't", "don’t", "avoid", "try", "remember", "consider", "embrace", "allow", "postpone", "reconsider", "revisit", "celebrate", "breathe"]);

/** "Slow to trust, you…" and "Open to change, you…" describe the reader: only the particle makes these a command. */
const ONLY_WITH: Readonly<Record<string, string>> = { slow: "down", open: "up" };

/**
 * What comes after an opening verb when it is a command ("Take your time",
 * "Wait until it passes") and not a noun the sentence is about ("Rest feels
 * harder to find", "Trust comes slowly").
 */
const AFTER_COMMAND = new Set([
  "your", "yourself", "yourselves", "it", "them", "this", "that", "these", "those", "things", "time", "a", "an", "the", "some", "any", "no",
  "on", "off", "up", "back", "down", "out", "to", "until", "till", "before", "after", "for", "with", "from", "into", "over", "around",
  "about", "at", "in", "easy", "slow", "slower", "slowly", "calm", "patient", "kind", "careful", "gentle", "honest", "open", "ready", "clear",
  "nothing", "everything", "something", "anything", "someone", "somebody", "anyone", "what", "how", "why", "when", "where", "who", "whether",
  "if", "me", "us", "him", "her", "people", "others", "more", "less", "stock", "care", "charge", "heart", "note", "space", "rest", "not", "too",
  "yes", "sure", "go", "again",
]);

/** Openers and softeners a command may sit behind: "So take it slowly", "For now, wait", "Maybe rest". */
const LEAD = /^(?:(?:so|then|just|now|instead|rather|simply|first|for\s+now|this\s+time|meanwhile|maybe|perhaps|please)\b[,]?\s+)+/i;

/** After an opening verb these begin a phrase, which may be the subject's ("Trust in others comes slowly") or the order's ("Trust in yourself"). */
const PREPOSITIONS = new Set(["on", "to", "for", "with", "from", "into", "over", "around", "about", "at", "in"]);
/** A verb whose subject is the opening word and its phrase: "Rest for you is rare". */
const SUBJECT_VERBS = new Set([
  "is", "isn't", "was", "wasn't", "has", "does", "doesn't", "feels", "seems", "comes", "takes", "gets", "grows", "builds", "makes",
  "helps", "matters", "means", "needs", "asks", "brings", "goes", "keeps", "stays", "becomes", "remains", "sits", "starts", "can",
  "can't", "cannot", "could", "may", "might", "will", "won't", "would",
]);
/** Where a clause of its own begins, so a verb after it is never the opening word's: "Ask for help when it gets heavy". */
const CLAUSE_STARTS = new Set([
  "when", "whenever", "if", "as", "while", "until", "till", "before", "after", "because", "since", "unless", "once", "though",
  "although", "than", "like", "that", "which", "who", "whom", "whose", "what", "how", "why", "where", "whether", "so", "and", "but",
  "or", "then",
]);
/** Past the phrase's own first word, a pronoun starts a clause: "Wait for the day it gets lighter". */
const PRONOUNS = new Set(["i", "you", "we", "they", "he", "she", "it", "there"]);

function nounBeforeVerb(raw: readonly string[], words: readonly string[]): boolean {
  for (let i = 2; i < words.length; i += 1) {
    if (CLAUSE_STARTS.has(words[i]) || (i > 2 && PRONOUNS.has(words[i]))) return false;
    if (SUBJECT_VERBS.has(words[i])) return true;
    if (/[,;:]/.test(raw[i])) return false;
  }
  return false;
}

function commandAt(clause: string): string | null {
  const text = clause.replace(/^[“"‘'(\[]+/, "").replace(LEAD, "");
  const raw = text.split(/\s+/);
  const words = raw.map((w) => w.replace(/[^\p{L}'’-]/gu, "").toLowerCase());
  const [first = "", second = ""] = words;
  if (first === "never") return COMMANDS.has(second) ? `never ${second}` : null;
  if (first === "do" && second === "not") return "do not";
  // A question never reaches here, so "do" before a bare verb leans on an order: "Do take your time".
  if (first === "do" && COMMANDS.has(second)) return "do";
  // "Be it work or home" weighs two things and orders neither.
  if (first === "be" && (second === "it" || second === "they")) return null;
  if (!COMMANDS.has(first)) return null;
  if (ALWAYS_COMMANDS.has(first)) return first;
  if (first in ONLY_WITH) return second === ONLY_WITH[first] ? first : null;
  if (!second) return first;
  if (AFTER_COMMAND.has(second)) return PREPOSITIONS.has(second) && nounBeforeVerb(raw, words) ? null : first;
  // "Stop and think" is two orders, and "Rest and trust come slowly" two nouns before their verb: the second word decides.
  if (second === "and") return commandAt(raw.slice(2).join(" ")) ? first : null;
  return null;
}

/** What stands before the main clause and its comma: a clause or a phrase ("When it gets heavy,", "In this stretch,"), or "Be it…". */
const OPENING = /^(?:when|whenever|if|as|while|whilst|once|until|till|before|after|since|because|though|although|unless|even|wherever|whatever|however|whichever|now\s+that|in\s+case|each\s+time|every\s+time|any\s+time|next\s+time|the\s+moment|for|in|during|through|throughout|with|without|over|at|on|by|from|within|between|across|around|under|amid|despite|given|like|be\s+(?:it|they))\b/i;
/** A word, or a name of up to three words, set off by commas: "Honestly,", "Marie,", "Marie Curie,". */
const SET_OFF = /^(?:\S+|\p{Lu}[\p{L}'’-]*(?:\s+\p{Lu}[\p{L}'’-]*){1,2})$/u;
/** A clause joined on between the opening and the main clause: "When it gets heavy, and it will, take a breath." */
const JOINED = /^(?:and|or|but|nor|yet)\b/i;
/** After a choice, the reader as the subject: "Stay or go, you weigh both" names what they weigh and orders neither. */
const READER_WEIGHS = /^you\b(?!['’](?:ll|d)\b|\s+(?:will|would|should|must|need|have\s+to|are\s+going)\b)/i;

/**
 * Where an order may open in a sentence: its head, unless the head is a
 * choice the reader weighs; the clause after ", so" or a colon; and the main
 * clause after an opening clause, a name or a word set off by a comma. A main
 * clause that is the reader's own ("When it gets heavy, you pull back, take
 * stock") ends the search, since what follows it shares its subject.
 */
function clausesOf(sentence: string): string[] {
  const parts = sentence.replace(/^[“"‘'(\[]+/, "").split(/,\s+/);
  const choice = parts.length > 1 && /\bor\b/i.test(parts[0]) && READER_WEIGHS.test(parts[1]);
  const clauses = choice ? [] : [sentence];
  clauses.push(...sentence.split(/,\s+so\s+|:\s+/i).slice(1));
  if (parts.length > 1 && (OPENING.test(parts[0]) || SET_OFF.test(parts[0]))) {
    for (let i = 1; i < parts.length; i += 1) {
      clauses.push(parts.slice(i).join(", "));
      if (!(JOINED.test(parts[i]) || OPENING.test(parts[i]) || SET_OFF.test(parts[i]))) break;
    }
  }
  return clauses;
}

/**
 * chk-46 (annex row 46): telling the reader to do or not do something (R-5.2
 * as amended, ADR-206): an obligation or advice anywhere, or a clause that
 * opens on a command, wherever `clausesOf` finds one. A question is never
 * one. "A good time to look again" is how astrology reads a time, the house
 * voice of the page's own sample lines, and passes.
 */
export function adviceChecks(text: string, where: string): Check[] {
  const hits = new Set<string>();
  for (const sentence of sentencesOf(text)) {
    if (/\?["”’')\]]*$/.test(sentence)) continue;
    for (const [label, pattern] of ADVICE) if (pattern.test(sentence)) hits.add(label);
    for (const clause of clausesOf(sentence)) {
      const verb = commandAt(clause);
      if (verb) hits.add(`opens on "${verb}"`);
    }
  }
  return hits.size ? [block("chk-46", `${where}: tells the reader what to do (${[...hits].join(", ")})`)] : [];
}

/** The three blocks, for a reading or for any text that names a computed sky (Ask reuses them). */
export function blockingChecks(text: string, allowed: AllowedFacts, where: string, names: readonly string[] = []): Check[] {
  return [...dateChecks(text, allowed, where, names), ...predictionChecks(text, where), ...adviceChecks(text, where)];
}

const MARKERS = new RegExp(String.raw`\s*(?:${[...DATA_LABELS.map(DATA_OPEN), DATA_CLOSE].join("|")})\s*`, "g");

/** chk-48 (annex row 48): a data block's marker copied into the text goes, with the space around it, and the words stay. */
function stripMarkers(text: string): { text: string; stripped: number } {
  let stripped = 0;
  const out = text.replace(MARKERS, (m, at: number, whole: string) => {
    stripped += 1;
    const before = whole.slice(0, at);
    const after = whole.slice(at + m.length);
    return !before || !after || /[\s(“"‘]$/.test(before) || /^[\s.,!?;:)”"’]/.test(after) ? "" : " ";
  });
  return stripped ? { text: out.trim(), stripped } : { text, stripped };
}

/** chk-47 (annex row 47): the line and the body against the counts the prompt states, buffered 20%. */
export function lengthChecks(output: ReadingOutput): Check[] {
  const checks: Check[] = [];
  const line = words(output.line);
  if (line > LINE_BUFFER) checks.push(block("chk-47", `line: ${line} words, the line takes ${LINE_WORDS} at most`));
  else if (line > LINE_WORDS) checks.push(buffered("chk-47", `line: ${line} words, over the ${LINE_WORDS} the prompt asks and inside the buffer`));
  const body = words(output.body);
  if (body < BODY_BUFFER[0] || body > BODY_BUFFER[1]) checks.push(block("chk-47", `body: ${body} words, the body takes ${BODY_WORDS[0]} to ${BODY_WORDS[1]}`));
  else if (body < BODY_WORDS[0] || body > BODY_WORDS[1]) checks.push(buffered("chk-47", `body: ${body} words, outside ${BODY_WORDS[0]} to ${BODY_WORDS[1]} and inside the buffer`));
  return checks;
}

/**
 * A reading as it should be kept, and every check that fired: a copied name
 * block read back as the name, a copied marker taken out (row 48), a
 * semicolon made a full stop as in a report (row 41), then the counts (row
 * 47) and the three blocks (rows 44 to 46) on what would be kept.
 */
export function checkReading(output: ReadingOutput, input: ReadingInput): Validated<ReadingOutput> {
  const checks: Check[] = [];
  const fields = { line: output.line, body: output.body };
  for (const key of ["line", "body"] as const) {
    const markers = stripMarkers(restoreBlocks(fields[key]));
    if (markers.stripped) checks.push(fixed("chk-48", `${key}: ${markers.stripped} data marker(s) copied into the text taken out`));
    const stops = semicolonsToFullStops(markers.text);
    if (stops.replaced) checks.push(fixed("chk-41", `${key}: ${stops.replaced} semicolon(s) became full stops`));
    fields[key] = stops.text;
  }
  const blind = input.blind || input.brief.horizon === "unknown";
  const facts = eventFacts(input.event, input.brief.chart, blind);
  checks.push(...lengthChecks(fields));
  for (const key of ["line", "body"] as const) checks.push(...blockingChecks(fields[key], facts, key, [input.name]));
  return { output: fields, checks };
}

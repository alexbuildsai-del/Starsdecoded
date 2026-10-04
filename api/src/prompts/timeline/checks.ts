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

const LIFE_EVENTS: Listed = [
  ["a new job", /\b(?:new|dream|better|different)\s+(?:job|role|position|career)\b|\bjob\s+(?:offer|loss)\b/i],
  ["a promotion", /\bpromot(?:ion|ed)\b|\ba\s+(?:pay\s+)?raise\b|\bpay\s+rise\b/i],
  ["losing a job", /\b(?:fired|laid\s+off|sacked|redundan(?:t|cy))\b|\blet\s+go\s+from\b/i],
  ["meeting someone", /\bmeet\s+(?:someone|somebody|a\s+(?:new\s+)?(?:partner|lover|love|man|woman|person))\b|\bsoul\s?mate\b|\bthe\s+love\s+of\s+your\s+life\b/i],
  ["a new relationship", /\b(?:new|romantic)\s+(?:relationship|romance|love|partner|lover)\b|\ban\s+affair\b/i],
  ["a breakup", /\bbreak(?:s|ing)?[\s-]?up\b|\bsplit(?:s|ting)?\s+up\b|\bdivorc(?:e|es|ed|ing)\b/i],
  ["a wedding", /\b(?:wedding|marriage|marr(?:y|ies|ied|ying)|get(?:ting)?\s+engaged|propos(?:e|es|ing)\s+to)\b/i],
  ["a baby", /\bpregnan(?:t|cy)\b|\b(?:a|the)\s+baby\b|\bhave\s+(?:a\s+)?(?:baby|child|children|kids)\b/i],
  // "Die down" is a feeling easing, not a death.
  ["a death", /\b(?:death|dying|pass(?:es)?\s+away)\b|\bdies?\b(?!\s+(?:down|away|off|out))/i],
  ["an illness", /\b(?:illness|sickness|disease|diagnos(?:is|ed)|surgery|injur(?:y|ies|ed))\b|\b(?:an?|the)\s+accident\b|\b(?:fall|falls|get|gets|getting)\s+(?:ill|sick)\b/i],
  ["money coming", /\b(?:windfall|lottery|inheritance|inherit|bankrupt(?:cy)?)\b|\ba\s+(?:small\s+)?fortune\b|\bmoney\s+(?:comes|is\s+coming|arrives|flows\s+in)\b/i],
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
 * "You feel you should do more" says what the reader feels, so a thought or a
 * feeling before the word lets it pass. "You need to feel heard" names a need
 * the way a report does, so "need to" and "have to" are never counted.
 */
const FELT = String.raw`(?<!\b(?:feel|feels|felt|feeling|think|thinks|thought|believe|believes|sense|senses|tell\s+yourself|told\s+yourself|wonder\s+(?:if|whether))\s+(?:that\s+)?)`;

const ADVICE: Listed = [
  ["should", new RegExp(String.raw`${FELT}\b(?:you|we)\s+(?:really\s+|probably\s+)?(?:should|shouldn['’]t|ought\s+(?:not\s+)?to)\b`, "i")],
  ["must", new RegExp(String.raw`${FELT}\byou\s+(?:really\s+)?(?:must|mustn['’]t|had\s+better|['’]d\s+better|would\s+do\s+well\s+to|would\s+be\s+wise\s+to)\b`, "i")],
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
  "yes", "sure",
]);

/** Openers a command may sit behind: "So take it slowly", "For now, wait". */
const LEAD = /^(?:(?:so|then|just|now|instead|rather|simply|first|for\s+now|this\s+time|meanwhile)\b[,]?\s+)+/i;

function commandAt(clause: string): string | null {
  const text = clause.replace(/^[“"‘'(\[]+/, "").replace(LEAD, "");
  const [first = "", second = ""] = text.split(/\s+/).map((w) => w.replace(/[^\p{L}'’-]/gu, "").toLowerCase());
  if (first === "never") return COMMANDS.has(second) ? `never ${second}` : null;
  if (first === "do" && second === "not") return "do not";
  if (!COMMANDS.has(first)) return null;
  if (ALWAYS_COMMANDS.has(first)) return first;
  if (first in ONLY_WITH) return second === ONLY_WITH[first] ? first : null;
  if (!second) return first;
  return AFTER_COMMAND.has(second) ? first : null;
}

/**
 * chk-46 (annex row 46): telling the reader to do or not do something (R-5.2
 * as amended, ADR-206): an obligation or advice anywhere, or a sentence, or
 * the clause after ", so" or a colon, that opens on a command. A question is
 * never one. "A good time to look again" is how astrology reads a time, the
 * house voice of the page's own sample lines, and passes.
 */
export function adviceChecks(text: string, where: string): Check[] {
  const hits = new Set<string>();
  for (const sentence of sentencesOf(text)) {
    if (/\?["”’')\]]*$/.test(sentence)) continue;
    for (const [label, pattern] of ADVICE) if (pattern.test(sentence)) hits.add(label);
    const clauses = [sentence, ...sentence.split(/,\s+so\s+|:\s+/i).slice(1)];
    for (const clause of clauses) {
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

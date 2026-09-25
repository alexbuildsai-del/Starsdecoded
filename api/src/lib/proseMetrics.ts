/**
 * Prose measures for the lab's prose study: numbers about how a text reads,
 * never the text. Pure, so the study can run in a public workflow log and a
 * test can pin every figure.
 */

export interface ProseMetrics {
  words: number;
  sentences: number;
  wordsPerSentenceMean: number;
  wordsPerSentenceP90: number;
  longestSentence: number;
  /** Share of words with three or more syllables, 0 to 1. */
  longWordShare: number;
  /** Letters and digits per word. */
  avgWordLength: number;
  fleschReadingEase: number;
  /** Share of sentences that address the reader as you or your, 0 to 1. */
  secondPersonSentenceShare: number;
  emDashes: number;
  semicolons: number;
  paragraphs: number;
}

export const METRIC_KEYS = [
  "words", "sentences", "wordsPerSentenceMean", "wordsPerSentenceP90", "longestSentence", "longWordShare",
  "avgWordLength", "fleschReadingEase", "secondPersonSentenceShare", "emDashes", "semicolons", "paragraphs",
] as const satisfies ReadonlyArray<keyof ProseMetrics>;

/** Keys that hold no reader-facing prose: the claims with their evidence, identifiers, and the foundation's copied enums. */
const NOT_PROSE = new Set(["claims", "evidence", "id", "ids", "kind", "sect", "sectLight"]);
/** Headings: a two-to-five-word title read as a sentence would drag every sentence measure down. */
const HEADINGS = new Set(["title", "label"]);

/**
 * A stored section as one text, each prose leaf its own paragraph. Sections
 * are objects (a raw string is a parse fallback), and every variant of a card
 * shares its section's schema, so the same leaves are measured on each side.
 */
export function proseText(value: unknown): string {
  const leaves: string[] = [];
  const walk = (v: unknown): void => {
    if (typeof v === "string") { if (v.trim()) leaves.push(v.trim()); return; }
    if (Array.isArray(v)) { v.forEach(walk); return; }
    if (v && typeof v === "object") {
      for (const [k, x] of Object.entries(v as Record<string, unknown>)) if (!NOT_PROSE.has(k) && !HEADINGS.has(k)) walk(x);
    }
  };
  walk(value);
  return leaves.join("\n\n");
}

/** A full stop after these is not a sentence end. */
const ABBREVIATIONS = new Set(["e.g", "i.e", "etc", "vs", "mr", "mrs", "ms", "dr", "st", "cf", "approx"]);

function splitSentences(paragraph: string): string[] {
  const out: string[] = [];
  let start = 0;
  // A terminator, any closing quotes or brackets, then whitespace: "3.5" and "e.g.," never match the whitespace.
  const re = /[.?!]+["'”’)\]]*(?=\s)/g;
  for (let m = re.exec(paragraph); m; m = re.exec(paragraph)) {
    if (m[0].startsWith(".") && m[0].length === 1) {
      const before = /([\p{L}.]+)$/u.exec(paragraph.slice(start, m.index))?.[1]?.toLowerCase() ?? "";
      if (ABBREVIATIONS.has(before)) continue;
    }
    const end = m.index + m[0].length;
    out.push(paragraph.slice(start, end));
    start = end;
  }
  out.push(paragraph.slice(start));
  return out.map((s) => s.trim()).filter((s) => wordsOf(s).length > 0);
}

function wordsOf(s: string): string[] {
  // A stop with no space after it joins: "3.5" and "e.g" are one word each.
  return s.match(/[\p{L}\p{N}]+(?:['’.-][\p{L}\p{N}]+)*/gu) ?? [];
}

/** The common vowel-group heuristic: good to a syllable on ordinary English, which is all a comparison needs. */
export function syllables(word: string): number {
  const parts = word.toLowerCase().split("-").filter(Boolean);
  if (parts.length > 1) return parts.reduce((n, p) => n + syllables(p), 0);
  let w = word.toLowerCase().replace(/['’]/g, "").replace(/[^a-z]/g, "");
  if (!w) return 1;
  if (w.length <= 3) return 1;
  w = w.replace(/(?:[^laeiouy]es|[^laeiouy]ed|[^laeiouy]e)$/, (m) => m.charAt(0)).replace(/^y/, "");
  return Math.max(1, (w.match(/[aeiouy]{1,2}/g) ?? []).length);
}

const SECOND_PERSON = /\byou(?:r|rs|rself|rselves)?\b/i;

export function measureProse(text: string): ProseMetrics {
  const paragraphs = text.split(/\n\s*\n/).map((p) => p.trim()).filter((p) => wordsOf(p).length > 0);
  const sentences = paragraphs.flatMap(splitSentences);
  const lengths = sentences.map((s) => wordsOf(s).length);
  const allWords = sentences.flatMap(wordsOf);
  const words = allWords.length;
  const syl = allWords.map(syllables);
  const totalSyl = syl.reduce((a, b) => a + b, 0);
  const n = sentences.length;
  const sorted = [...lengths].sort((a, b) => a - b);
  const wps = n ? words / n : 0;
  return {
    words,
    sentences: n,
    wordsPerSentenceMean: wps,
    // Nearest rank, so the figure is always a sentence that exists.
    wordsPerSentenceP90: n ? sorted[Math.ceil(0.9 * n) - 1] : 0,
    longestSentence: n ? sorted[n - 1] : 0,
    longWordShare: words ? syl.filter((s) => s >= 3).length / words : 0,
    avgWordLength: words ? allWords.reduce((a, w) => a + w.replace(/['’.-]/g, "").length, 0) / words : 0,
    fleschReadingEase: words ? 206.835 - 1.015 * wps - 84.6 * (totalSyl / words) : 0,
    secondPersonSentenceShare: n ? sentences.filter((s) => SECOND_PERSON.test(s)).length / n : 0,
    emDashes: (text.match(/—/g) ?? []).length,
    semicolons: (text.match(/;/g) ?? []).length,
    paragraphs: paragraphs.length,
  };
}

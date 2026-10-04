/**
 * The Timeline prompt family (ADR-210): one reading per event per person,
 * written when first opened or when the event enters the six-month view, then
 * kept. Its rows sit beside the natal and pair families' in the admin and the
 * lab, and a version bump clears its own overrides.
 */
import type { PromptDefault } from "../../lib/promptDefaults.js";
import { READING_INSTRUCTIONS, READING_KEY, TIMELINE_SYSTEM } from "./reading.js";

export {
  BODY_WORDS, EXCERPTS_MAX, EXCERPT_WORDS, LINE_WORDS, READING_INSTRUCTIONS, READING_KEY, READING_MAX_TOKENS, READING_SELF_CHECK,
  ReadingSchema, TIMELINE_SYSTEM, TIMELINE_WRITER, eventFacts, isCycle, readingPrompt,
  type EventFacts, type Excerpt, type ReadingEvent, type ReadingInput, type ReadingOutput,
} from "./reading.js";
export { TIMELINE_DOCTRINE, TIME_RULE } from "./doctrine.js";
export {
  BODY_BUFFER, LINE_BUFFER, adviceChecks, blockingChecks, checkReading, dateChecks, lengthChecks, predictionChecks, type AllowedFacts,
} from "./checks.js";

/** Bump when the family's prompt, schema or checks change shape. t1: the first readings (R16-21). */
export const TIMELINE_PROMPT_VERSION = "t1";

/** The family's default rows, as `PROMPT_DEFAULTS` holds every family's: the system is the cached prefix, the user row the instructions. */
export const TIMELINE_PROMPTS: PromptDefault[] = [
  {
    key: `${READING_KEY}:system`,
    category: "timeline",
    subcategory: "reading",
    label: "Timeline — Reading (system)",
    systemPrompt: TIMELINE_SYSTEM,
    userPrompt: null,
  },
  {
    key: `${READING_KEY}:user`,
    category: "timeline",
    subcategory: "reading",
    label: "Timeline — Reading (instructions)",
    systemPrompt: null,
    userPrompt: READING_INSTRUCTIONS,
  },
];

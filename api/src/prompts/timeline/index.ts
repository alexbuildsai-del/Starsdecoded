/**
 * The Timeline prompt family (ADR-210): one reading per event per person,
 * written when first opened or when the event enters the six-month view, then
 * kept. Its rows sit beside the natal and pair families' in the admin and the
 * lab, and a version bump clears its own overrides.
 */
import type { PromptDefault } from "../../lib/promptDefaults.js";
import { READING_INSTRUCTIONS, READING_KEY, TIMELINE_SYSTEM } from "./reading.js";

export {
  BODY_WORDS, EXCERPTS_MAX, EXCERPT_WORDS, LINE_WORDS, PAST_BODY_WORDS, READING_INSTRUCTIONS, READING_KEY, READING_MAX_TOKENS,
  READING_SELF_CHECK, ReadingSchema, TIMELINE_SYSTEM, TIMELINE_WRITER, eventFacts, isCycle, readingPrompt,
  type EventFacts, type Excerpt, type ReadingEvent, type ReadingInput, type ReadingOutput,
} from "./reading.js";
export { BACKWARDS_PASS_BODIES, CHILD_UNDER, TIMELINE_DOCTRINE, TIME_RULE } from "./doctrine.js";
export {
  BODY_BUFFER, LINE_BUFFER, PAST_BODY_BUFFER, adviceChecks, blockingChecks, checkReading, dateChecks, lengthChecks, predictionChecks,
  type AllowedFacts,
} from "./checks.js";

/**
 * Bump when the family's prompt, schema or checks change shape: every kept reading is written again once, at its
 * reader's next open, its text shown meanwhile (reading 11). t1: the first readings (R16-21). t2: the houses a planet
 * moves through, its passes and backwards stretch, each stretch with its year, possibilities ending on a good time
 * to, Light and Heavy, past cycles short, a child's houses and the nodes reversed (R19-16).
 */
export const TIMELINE_PROMPT_VERSION = "t2";

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

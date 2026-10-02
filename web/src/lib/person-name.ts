/**
 * The one rule for a typed name (ADR-202): the same pattern string as the three name fields in `openapi.yaml`, whose test
 * reads the contract so the two cannot drift. A stored name that breaks it still shows; it cannot be typed again.
 */
export const PERSON_NAME_PATTERN = "^[\\p{L}\\p{M} '’.·-]{1,60}$";

const PERSON_NAME = new RegExp(PERSON_NAME_PATTERN, "u");

export function isPersonName(value: string): boolean {
  return PERSON_NAME.test(value);
}

/** Said under a name field once the name breaks the rule, before anything is sent. */
export const NAME_RULE_LINE = "Use letters, spaces, apostrophes, hyphens and dots, up to 60 characters.";

/** The rule's line for a name the reader has typed, or null while it is empty or fine; an empty name has its own prompt. */
export function nameRuleLine(value: string): string | null {
  const name = value.trim();
  return name && !isPersonName(name) ? NAME_RULE_LINE : null;
}

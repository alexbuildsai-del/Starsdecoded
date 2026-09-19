import { ALL_SECTIONS, SHARED_SYSTEM } from "../prompts/index.js";
import { PAIR_ALL_SECTIONS, PAIR_SYSTEM } from "../prompts/pair/index.js";

export interface PromptDefault {
  key: string;
  category: string;
  subcategory: string;
  label: string;
  systemPrompt: string | null;
  userPrompt: string | null;
}

/**
 * Natal entries derive from the section registry so the prompt text has one
 * source of truth. The system row is the shared, cache-friendly system prompt;
 * the user row is the section's editable instructions. The output contract
 * (JSON schema) is not stored here and cannot be overridden: it is applied by
 * code from the section's zod schema.
 */
const NATAL_DEFAULTS: PromptDefault[] = ALL_SECTIONS.flatMap((s) => {
  const id = s.key.split(":")[1];
  return [
    {
      key: `${s.key}:system`,
      category: "natal",
      subcategory: id,
      label: `Natal V3 — ${s.adminLabel} (system)`,
      systemPrompt: SHARED_SYSTEM,
      userPrompt: null,
    },
    {
      key: `${s.key}:user`,
      category: "natal",
      subcategory: id,
      label: `Natal V3 — ${s.adminLabel} (instructions)`,
      systemPrompt: null,
      userPrompt: s.instructions,
    },
  ];
});

/**
 * The compatibility report's entries derive from the pair registry the same
 * way (ADR-39). The lens is not a key: it reaches the model through the
 * brief, so one override serves all three lenses.
 */
const PAIR_DEFAULTS: PromptDefault[] = PAIR_ALL_SECTIONS.flatMap((s) => {
  const id = s.key.split(":")[1];
  return [
    {
      key: `${s.key}:system`,
      category: "pair",
      subcategory: id,
      label: `Compatibility — ${s.adminLabel} (system)`,
      systemPrompt: PAIR_SYSTEM,
      userPrompt: null,
    },
    {
      key: `${s.key}:user`,
      category: "pair",
      subcategory: id,
      label: `Compatibility — ${s.adminLabel} (instructions)`,
      systemPrompt: null,
      userPrompt: s.instructions,
    },
  ];
});

export const PROMPT_DEFAULTS: PromptDefault[] = [...NATAL_DEFAULTS, ...PAIR_DEFAULTS];

export const PROMPT_DEFAULTS_BY_KEY = new Map(PROMPT_DEFAULTS.map((p) => [p.key, p]));

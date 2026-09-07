import { ALL_SECTIONS, SHARED_SYSTEM } from "../prompts/index.js";

export interface PromptDefault {
  key: string;
  category: string;
  subcategory: string;
  label: string;
  systemPrompt: string | null;
  userPrompt: string | null;
}

const SYNASTRY_SYSTEM = `You are an expert psychological astrologer specializing in relationship dynamics. Your prose is:
- Precise, analytical, and psychologically grounded
- Free of mystical claims or deterministic predictions
- Written for two thoughtful adults exploring their relationship
- Focused on relational patterns, behavioral signatures, and growth opportunities
You write in second person plural ("you both", "between you"). You do not name planets, signs, houses, or aspects in the body of the prose — you describe the underlying relational reality.`;

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

export const PROMPT_DEFAULTS: PromptDefault[] = [
  ...NATAL_DEFAULTS,

  // --- Synastry sections (shared default for all relationship types) ---
  {
    key: "synastry:romantic:overview:system",
    category: "synastry",
    subcategory: "romantic",
    label: "Synastry — Overview (system)",
    systemPrompt: SYNASTRY_SYSTEM,
    userPrompt: null,
  },
  {
    key: "synastry:romantic:overview:user",
    category: "synastry",
    subcategory: "romantic",
    label: "Synastry — Overview (user)",
    systemPrompt: null,
    userPrompt: `Write a 2-3 paragraph OVERVIEW of the relational dynamic between {nameA} and {nameB}, synthesizing across the supplied cross-aspect meanings. Identify the dominant chord between them — the texture of the connection, where it thrives, and where it strains. Do not enumerate aspects; describe the relational reality.

{summary}

Cross-aspect meanings:
{aspectContext}

Return as plain text.`,
  },
  {
    key: "synastry:romantic:emotional:system",
    category: "synastry",
    subcategory: "romantic",
    label: "Synastry — Emotional Attunement (system)",
    systemPrompt: SYNASTRY_SYSTEM,
    userPrompt: null,
  },
  {
    key: "synastry:romantic:emotional:user",
    category: "synastry",
    subcategory: "romantic",
    label: "Synastry — Emotional Attunement (user)",
    systemPrompt: null,
    userPrompt: `Write 2 paragraphs about the EMOTIONAL ATTUNEMENT between {nameA} and {nameB} — how they meet each other's emotional needs, their bonding rhythm, and where emotional misattunement tends to occur. Synthesize across the supplied meanings.

{summary}

Emotional cross-aspects:
{emotionalContext}

Return as plain text.`,
  },
  {
    key: "synastry:romantic:communication:system",
    category: "synastry",
    subcategory: "romantic",
    label: "Synastry — Communication (system)",
    systemPrompt: SYNASTRY_SYSTEM,
    userPrompt: null,
  },
  {
    key: "synastry:romantic:communication:user",
    category: "synastry",
    subcategory: "romantic",
    label: "Synastry — Communication (user)",
    systemPrompt: null,
    userPrompt: `Write 2 paragraphs about the COMMUNICATION style between {nameA} and {nameB} — how they exchange ideas, listen, and the recognizable patterns when they're aligned vs. when they talk past each other. Synthesize across the supplied meanings.

{summary}

Communication cross-aspects:
{commContext}

Return as plain text.`,
  },
  {
    key: "synastry:romantic:physical:system",
    category: "synastry",
    subcategory: "romantic",
    label: "Synastry — Physical Chemistry (system)",
    systemPrompt: SYNASTRY_SYSTEM,
    userPrompt: null,
  },
  {
    key: "synastry:romantic:physical:user",
    category: "synastry",
    subcategory: "romantic",
    label: "Synastry — Physical Chemistry (user)",
    systemPrompt: null,
    userPrompt: `Write 2 paragraphs about the PHYSICAL & EROTIC chemistry between {nameA} and {nameB} — the magnetism between them, their pacing, and where attraction can shade into friction. Synthesize across the supplied meanings.

{summary}

Physical cross-aspects:
{physContext}

Return as plain text.`,
  },
  {
    key: "synastry:romantic:conflict:system",
    category: "synastry",
    subcategory: "romantic",
    label: "Synastry — Conflict Patterns (system)",
    systemPrompt: SYNASTRY_SYSTEM,
    userPrompt: null,
  },
  {
    key: "synastry:romantic:conflict:user",
    category: "synastry",
    subcategory: "romantic",
    label: "Synastry — Conflict Patterns (user)",
    systemPrompt: null,
    userPrompt: `Write 2 paragraphs about CONFLICT PATTERNS between {nameA} and {nameB} — the recognizable shape disputes take, the recurring trigger points, and what each tends to do under stress in the relationship. Synthesize across the supplied tense contacts.

{summary}

Tense cross-aspects:
{tensionContext}

Return as plain text.`,
  },
  {
    key: "synastry:romantic:growth:system",
    category: "synastry",
    subcategory: "romantic",
    label: "Synastry — Growth Arc (system)",
    systemPrompt: SYNASTRY_SYSTEM,
    userPrompt: null,
  },
  {
    key: "synastry:romantic:growth:user",
    category: "synastry",
    subcategory: "romantic",
    label: "Synastry — Growth Arc (user)",
    systemPrompt: null,
    userPrompt: `Write 2 paragraphs about the GROWTH ARC of the relationship between {nameA} and {nameB} — what this bond is asking each person to evolve toward, the developmental edge it offers them as a pair, and how they might consciously work with it.

{summary}

Growth-related cross-aspects:
{growthContext}

Return as plain text.`,
  },

  // --- Synastry: sibling (same defaults as romantic, different key) ---
  {
    key: "synastry:sibling:overview:system",
    category: "synastry",
    subcategory: "sibling",
    label: "Synastry (Sibling) — Overview (system)",
    systemPrompt: SYNASTRY_SYSTEM,
    userPrompt: null,
  },
  {
    key: "synastry:sibling:overview:user",
    category: "synastry",
    subcategory: "sibling",
    label: "Synastry (Sibling) — Overview (user)",
    systemPrompt: null,
    userPrompt: `Write a 2-3 paragraph OVERVIEW of the relational dynamic between {nameA} and {nameB}, synthesizing across the supplied cross-aspect meanings. Identify the dominant chord between them — the texture of the connection, where it thrives, and where it strains. Do not enumerate aspects; describe the relational reality.

{summary}

Cross-aspect meanings:
{aspectContext}

Return as plain text.`,
  },
  {
    key: "synastry:sibling:emotional:system",
    category: "synastry",
    subcategory: "sibling",
    label: "Synastry (Sibling) — Emotional Attunement (system)",
    systemPrompt: SYNASTRY_SYSTEM,
    userPrompt: null,
  },
  {
    key: "synastry:sibling:emotional:user",
    category: "synastry",
    subcategory: "sibling",
    label: "Synastry (Sibling) — Emotional Attunement (user)",
    systemPrompt: null,
    userPrompt: `Write 2 paragraphs about the EMOTIONAL ATTUNEMENT between {nameA} and {nameB} — how they meet each other's emotional needs, their bonding rhythm, and where emotional misattunement tends to occur. Synthesize across the supplied meanings.

{summary}

Emotional cross-aspects:
{emotionalContext}

Return as plain text.`,
  },
  {
    key: "synastry:sibling:communication:system",
    category: "synastry",
    subcategory: "sibling",
    label: "Synastry (Sibling) — Communication (system)",
    systemPrompt: SYNASTRY_SYSTEM,
    userPrompt: null,
  },
  {
    key: "synastry:sibling:communication:user",
    category: "synastry",
    subcategory: "sibling",
    label: "Synastry (Sibling) — Communication (user)",
    systemPrompt: null,
    userPrompt: `Write 2 paragraphs about the COMMUNICATION style between {nameA} and {nameB} — how they exchange ideas, listen, and the recognizable patterns when they're aligned vs. when they talk past each other. Synthesize across the supplied meanings.

{summary}

Communication cross-aspects:
{commContext}

Return as plain text.`,
  },
  {
    key: "synastry:sibling:physical:system",
    category: "synastry",
    subcategory: "sibling",
    label: "Synastry (Sibling) — Physical Chemistry (system)",
    systemPrompt: SYNASTRY_SYSTEM,
    userPrompt: null,
  },
  {
    key: "synastry:sibling:physical:user",
    category: "synastry",
    subcategory: "sibling",
    label: "Synastry (Sibling) — Physical Chemistry (user)",
    systemPrompt: null,
    userPrompt: `Write 2 paragraphs about the PHYSICAL & EROTIC chemistry between {nameA} and {nameB} — the magnetism between them, their pacing, and where attraction can shade into friction. Synthesize across the supplied meanings.

{summary}

Physical cross-aspects:
{physContext}

Return as plain text.`,
  },
  {
    key: "synastry:sibling:conflict:system",
    category: "synastry",
    subcategory: "sibling",
    label: "Synastry (Sibling) — Conflict Patterns (system)",
    systemPrompt: SYNASTRY_SYSTEM,
    userPrompt: null,
  },
  {
    key: "synastry:sibling:conflict:user",
    category: "synastry",
    subcategory: "sibling",
    label: "Synastry (Sibling) — Conflict Patterns (user)",
    systemPrompt: null,
    userPrompt: `Write 2 paragraphs about CONFLICT PATTERNS between {nameA} and {nameB} — the recognizable shape disputes take, the recurring trigger points, and what each tends to do under stress in the relationship. Synthesize across the supplied tense contacts.

{summary}

Tense cross-aspects:
{tensionContext}

Return as plain text.`,
  },
  {
    key: "synastry:sibling:growth:system",
    category: "synastry",
    subcategory: "sibling",
    label: "Synastry (Sibling) — Growth Arc (system)",
    systemPrompt: SYNASTRY_SYSTEM,
    userPrompt: null,
  },
  {
    key: "synastry:sibling:growth:user",
    category: "synastry",
    subcategory: "sibling",
    label: "Synastry (Sibling) — Growth Arc (user)",
    systemPrompt: null,
    userPrompt: `Write 2 paragraphs about the GROWTH ARC of the relationship between {nameA} and {nameB} — what this bond is asking each person to evolve toward, the developmental edge it offers them as a pair, and how they might consciously work with it.

{summary}

Growth-related cross-aspects:
{growthContext}

Return as plain text.`,
  },

  // --- Synastry: parent_child ---
  {
    key: "synastry:parent_child:overview:system",
    category: "synastry",
    subcategory: "parent_child",
    label: "Synastry (Parent/Child) — Overview (system)",
    systemPrompt: SYNASTRY_SYSTEM,
    userPrompt: null,
  },
  {
    key: "synastry:parent_child:overview:user",
    category: "synastry",
    subcategory: "parent_child",
    label: "Synastry (Parent/Child) — Overview (user)",
    systemPrompt: null,
    userPrompt: `Write a 2-3 paragraph OVERVIEW of the relational dynamic between {nameA} and {nameB}, synthesizing across the supplied cross-aspect meanings. Identify the dominant chord between them — the texture of the connection, where it thrives, and where it strains. Do not enumerate aspects; describe the relational reality.

{summary}

Cross-aspect meanings:
{aspectContext}

Return as plain text.`,
  },
  {
    key: "synastry:parent_child:emotional:system",
    category: "synastry",
    subcategory: "parent_child",
    label: "Synastry (Parent/Child) — Emotional Attunement (system)",
    systemPrompt: SYNASTRY_SYSTEM,
    userPrompt: null,
  },
  {
    key: "synastry:parent_child:emotional:user",
    category: "synastry",
    subcategory: "parent_child",
    label: "Synastry (Parent/Child) — Emotional Attunement (user)",
    systemPrompt: null,
    userPrompt: `Write 2 paragraphs about the EMOTIONAL ATTUNEMENT between {nameA} and {nameB} — how they meet each other's emotional needs, their bonding rhythm, and where emotional misattunement tends to occur. Synthesize across the supplied meanings.

{summary}

Emotional cross-aspects:
{emotionalContext}

Return as plain text.`,
  },
  {
    key: "synastry:parent_child:communication:system",
    category: "synastry",
    subcategory: "parent_child",
    label: "Synastry (Parent/Child) — Communication (system)",
    systemPrompt: SYNASTRY_SYSTEM,
    userPrompt: null,
  },
  {
    key: "synastry:parent_child:communication:user",
    category: "synastry",
    subcategory: "parent_child",
    label: "Synastry (Parent/Child) — Communication (user)",
    systemPrompt: null,
    userPrompt: `Write 2 paragraphs about the COMMUNICATION style between {nameA} and {nameB} — how they exchange ideas, listen, and the recognizable patterns when they're aligned vs. when they talk past each other. Synthesize across the supplied meanings.

{summary}

Communication cross-aspects:
{commContext}

Return as plain text.`,
  },
  {
    key: "synastry:parent_child:physical:system",
    category: "synastry",
    subcategory: "parent_child",
    label: "Synastry (Parent/Child) — Physical Chemistry (system)",
    systemPrompt: SYNASTRY_SYSTEM,
    userPrompt: null,
  },
  {
    key: "synastry:parent_child:physical:user",
    category: "synastry",
    subcategory: "parent_child",
    label: "Synastry (Parent/Child) — Physical Chemistry (user)",
    systemPrompt: null,
    userPrompt: `Write 2 paragraphs about the PHYSICAL & EROTIC chemistry between {nameA} and {nameB} — the magnetism between them, their pacing, and where attraction can shade into friction. Synthesize across the supplied meanings.

{summary}

Physical cross-aspects:
{physContext}

Return as plain text.`,
  },
  {
    key: "synastry:parent_child:conflict:system",
    category: "synastry",
    subcategory: "parent_child",
    label: "Synastry (Parent/Child) — Conflict Patterns (system)",
    systemPrompt: SYNASTRY_SYSTEM,
    userPrompt: null,
  },
  {
    key: "synastry:parent_child:conflict:user",
    category: "synastry",
    subcategory: "parent_child",
    label: "Synastry (Parent/Child) — Conflict Patterns (user)",
    systemPrompt: null,
    userPrompt: `Write 2 paragraphs about CONFLICT PATTERNS between {nameA} and {nameB} — the recognizable shape disputes take, the recurring trigger points, and what each tends to do under stress in the relationship. Synthesize across the supplied tense contacts.

{summary}

Tense cross-aspects:
{tensionContext}

Return as plain text.`,
  },
  {
    key: "synastry:parent_child:growth:system",
    category: "synastry",
    subcategory: "parent_child",
    label: "Synastry (Parent/Child) — Growth Arc (system)",
    systemPrompt: SYNASTRY_SYSTEM,
    userPrompt: null,
  },
  {
    key: "synastry:parent_child:growth:user",
    category: "synastry",
    subcategory: "parent_child",
    label: "Synastry (Parent/Child) — Growth Arc (user)",
    systemPrompt: null,
    userPrompt: `Write 2 paragraphs about the GROWTH ARC of the relationship between {nameA} and {nameB} — what this bond is asking each person to evolve toward, the developmental edge it offers them as a pair, and how they might consciously work with it.

{summary}

Growth-related cross-aspects:
{growthContext}

Return as plain text.`,
  },

  // --- Synastry: custom ---
  {
    key: "synastry:custom:overview:system",
    category: "synastry",
    subcategory: "custom",
    label: "Synastry (Custom) — Overview (system)",
    systemPrompt: SYNASTRY_SYSTEM,
    userPrompt: null,
  },
  {
    key: "synastry:custom:overview:user",
    category: "synastry",
    subcategory: "custom",
    label: "Synastry (Custom) — Overview (user)",
    systemPrompt: null,
    userPrompt: `Write a 2-3 paragraph OVERVIEW of the relational dynamic between {nameA} and {nameB}, synthesizing across the supplied cross-aspect meanings. Identify the dominant chord between them — the texture of the connection, where it thrives, and where it strains. Do not enumerate aspects; describe the relational reality.

{summary}

Cross-aspect meanings:
{aspectContext}

Return as plain text.`,
  },
  {
    key: "synastry:custom:emotional:system",
    category: "synastry",
    subcategory: "custom",
    label: "Synastry (Custom) — Emotional Attunement (system)",
    systemPrompt: SYNASTRY_SYSTEM,
    userPrompt: null,
  },
  {
    key: "synastry:custom:emotional:user",
    category: "synastry",
    subcategory: "custom",
    label: "Synastry (Custom) — Emotional Attunement (user)",
    systemPrompt: null,
    userPrompt: `Write 2 paragraphs about the EMOTIONAL ATTUNEMENT between {nameA} and {nameB} — how they meet each other's emotional needs, their bonding rhythm, and where emotional misattunement tends to occur. Synthesize across the supplied meanings.

{summary}

Emotional cross-aspects:
{emotionalContext}

Return as plain text.`,
  },
  {
    key: "synastry:custom:communication:system",
    category: "synastry",
    subcategory: "custom",
    label: "Synastry (Custom) — Communication (system)",
    systemPrompt: SYNASTRY_SYSTEM,
    userPrompt: null,
  },
  {
    key: "synastry:custom:communication:user",
    category: "synastry",
    subcategory: "custom",
    label: "Synastry (Custom) — Communication (user)",
    systemPrompt: null,
    userPrompt: `Write 2 paragraphs about the COMMUNICATION style between {nameA} and {nameB} — how they exchange ideas, listen, and the recognizable patterns when they're aligned vs. when they talk past each other. Synthesize across the supplied meanings.

{summary}

Communication cross-aspects:
{commContext}

Return as plain text.`,
  },
  {
    key: "synastry:custom:physical:system",
    category: "synastry",
    subcategory: "custom",
    label: "Synastry (Custom) — Physical Chemistry (system)",
    systemPrompt: SYNASTRY_SYSTEM,
    userPrompt: null,
  },
  {
    key: "synastry:custom:physical:user",
    category: "synastry",
    subcategory: "custom",
    label: "Synastry (Custom) — Physical Chemistry (user)",
    systemPrompt: null,
    userPrompt: `Write 2 paragraphs about the PHYSICAL & EROTIC chemistry between {nameA} and {nameB} — the magnetism between them, their pacing, and where attraction can shade into friction. Synthesize across the supplied meanings.

{summary}

Physical cross-aspects:
{physContext}

Return as plain text.`,
  },
  {
    key: "synastry:custom:conflict:system",
    category: "synastry",
    subcategory: "custom",
    label: "Synastry (Custom) — Conflict Patterns (system)",
    systemPrompt: SYNASTRY_SYSTEM,
    userPrompt: null,
  },
  {
    key: "synastry:custom:conflict:user",
    category: "synastry",
    subcategory: "custom",
    label: "Synastry (Custom) — Conflict Patterns (user)",
    systemPrompt: null,
    userPrompt: `Write 2 paragraphs about CONFLICT PATTERNS between {nameA} and {nameB} — the recognizable shape disputes take, the recurring trigger points, and what each tends to do under stress in the relationship. Synthesize across the supplied tense contacts.

{summary}

Tense cross-aspects:
{tensionContext}

Return as plain text.`,
  },
  {
    key: "synastry:custom:growth:system",
    category: "synastry",
    subcategory: "custom",
    label: "Synastry (Custom) — Growth Arc (system)",
    systemPrompt: SYNASTRY_SYSTEM,
    userPrompt: null,
  },
  {
    key: "synastry:custom:growth:user",
    category: "synastry",
    subcategory: "custom",
    label: "Synastry (Custom) — Growth Arc (user)",
    systemPrompt: null,
    userPrompt: `Write 2 paragraphs about the GROWTH ARC of the relationship between {nameA} and {nameB} — what this bond is asking each person to evolve toward, the developmental edge it offers them as a pair, and how they might consciously work with it.

{summary}

Growth-related cross-aspects:
{growthContext}

Return as plain text.`,
  },

];

export const PROMPT_DEFAULTS_BY_KEY = new Map(PROMPT_DEFAULTS.map((p) => [p.key, p]));

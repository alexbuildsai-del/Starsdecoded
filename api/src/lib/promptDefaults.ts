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

const MEANING_LIBRARY_SYSTEM = `You are an expert psychological astrologer. Your interpretations are:
- Precise, analytical, and psychologically grounded
- Free of mystical claims or deterministic predictions
- Written in clear, thoughtful prose for an educated adult
- Focused on behavioral patterns, psychological tendencies, and self-understanding
You write in second person. You do not mention the names of planets, signs, houses, or aspects in the body of the prose — you describe the psychological reality they represent.`;

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

  // --- Meaning Library atomic prompts ---
  {
    key: "meaning_library:system",
    category: "meaning_library",
    subcategory: "shared",
    label: "Meaning Library — Shared System Prompt",
    systemPrompt: MEANING_LIBRARY_SYSTEM,
    userPrompt: null,
  },
  {
    key: "meaning_library:planet_sign:user",
    category: "meaning_library",
    subcategory: "planet_sign",
    label: "Meaning Library — Planet × Sign (user template)",
    systemPrompt: null,
    userPrompt: `Describe the psychology of {planet} in {sign} as a generic interpretation (not for a specific person).

Write a SINGLE short paragraph (3-5 sentences) in second person, focused on:
- How this placement colors the psychological function the planet represents
- The characteristic temperament, motivation, and behavioral signature
- A concrete example of how it shows up in everyday life
Do not mention "{planet}" or "{sign}" by name in the prose — describe the underlying psychological reality.

Respond as JSON: {"summary": "..."}`,
  },
  {
    key: "meaning_library:planet_house:user",
    category: "meaning_library",
    subcategory: "planet_house",
    label: "Meaning Library — Planet × House (user template)",
    systemPrompt: null,
    userPrompt: `Describe the psychology of {planet} in House {house} as a generic interpretation (not for a specific person).

Write a SINGLE short paragraph (3-5 sentences) in second person, focused on:
- The life-area this house governs and how the planet's drive is expressed there
- Where the person's energy, attention, or growth tends to concentrate
- A concrete behavioral example of how this placement shows up
Do not mention "{planet}" or "House {house}" by name in the prose — describe the underlying psychological reality.

Respond as JSON: {"summary": "..."}`,
  },
  {
    key: "meaning_library:aspect:user",
    category: "meaning_library",
    subcategory: "aspect",
    label: "Meaning Library — Aspect (user template)",
    systemPrompt: null,
    userPrompt: `Describe the psychology of the {planet1} {type} {planet2} aspect as a generic interpretation (not for a specific person).

Write 2-3 sentences each, in second person, for these facets:
- dynamic: The relational dynamic between the two psychological functions — how they interact (flowing, frictional, oppositional, fused, etc.) and the overall texture of that interaction.
- tension: The core inner tension or unresolved push-pull this configuration creates — the central inner conflict it describes.
- behavior: How this aspect tends to show up behaviorally — a single combined paragraph covering in-flow, under-stress, and in-conflict modes (kept for backward compatibility).
- growth: The growth arc encoded in this configuration — where this dynamic asks the person to evolve over time.
- inFlow: How this configuration shows up at its best — when the person is regulated, resourced, and the two functions are cooperating well.
- underStress: How this configuration shows up under load — when the person is depleted, anxious, or stretched thin.
- inConflict: How this configuration shows up in interpersonal conflict or when challenged — the recognizable behavioral pattern others would notice.

Do not name the planets, the aspect type, or any astrological terms in the prose — describe the underlying psychological reality.

Respond as JSON: {"dynamic": "...", "tension": "...", "behavior": "...", "growth": "...", "inFlow": "...", "underStress": "...", "inConflict": "..."}`,
  },
  {
    key: "meaning_library:ascendant_sign:user",
    category: "meaning_library",
    subcategory: "ascendant_sign",
    label: "Meaning Library — Ascendant Sign (user template)",
    systemPrompt: null,
    userPrompt: `Describe the psychology of an Ascendant (rising sign) in {sign} as a generic interpretation (not for a specific person).

Write a SINGLE paragraph (4-5 sentences) in second person, focused on:
- The outward manner, body language, pacing, and tone this presentation tends to carry
- The instinctive way of meeting and arriving in new situations — how you cross the threshold
- The first impression this lens creates and the lens others see you through before they meet the inner self
- A concrete example of how this shows up in everyday life (e.g. how you walk into a room, the kind of small talk you reach for, how strangers commonly describe you on first meeting)
- At its best how it lands; at its less-resourced edge how it can be misread
Match the depth, specificity, and behavioural texture of a strong planet-in-sign interpretation. Avoid bland trait lists.

Do not mention "{sign}" or "Ascendant" or "rising" by name in the prose — describe the underlying psychological reality.

Respond as JSON: {"summary": "..."}`,
  },
  {
    key: "meaning_library:midheaven_sign:user",
    category: "meaning_library",
    subcategory: "midheaven_sign",
    label: "Meaning Library — Midheaven Sign (user template)",
    systemPrompt: null,
    userPrompt: `Describe the psychology of a Midheaven (MC) in {sign} as a generic interpretation (not for a specific person).

Write a SINGLE paragraph (4-5 sentences) in second person, focused on:
- The public-facing direction, vocational orientation, and the highest expression of one's path
- The kinds of roles, environments, and contributions where this orientation tends to find traction
- How you want your work and contribution to be recognised — and the texture of authority you naturally carry
- A concrete example of how this shows up in working life (e.g. the kind of project you gravitate toward, how colleagues describe what you're known for, the title or contribution that feels right when it lands)
- The flavour of legacy and reputation this placement points toward at its best, and where ambition can overreach when under pressure
Match the depth, specificity, and behavioural texture of a strong planet-in-sign interpretation. Avoid generic career-list language.

Do not mention "{sign}" or "Midheaven" or "MC" by name in the prose — describe the underlying psychological reality.

Respond as JSON: {"summary": "..."}`,
  },
  {
    key: "meaning_library:synastry_aspect:user",
    category: "meaning_library",
    subcategory: "synastry_aspect",
    label: "Meaning Library — Synastry Aspect (user template)",
    systemPrompt: null,
    userPrompt: `Describe the psychology of a {planet1} {type} {planet2} CROSS-ASPECT in synastry — i.e. one person's {planet1} forming a {type} to another person's {planet2} (the inter-chart contact, NOT a within-chart aspect).

Write 2-3 sentences each, in second person plural ("you both" / "between you"), for these facets:
- dynamic: The relational dynamic this contact creates between the two people — the texture of the connection it generates and what it tends to magnetize between them.
- inFlow: How this contact lands when both people are well-resourced, regulated, and on the same page — what it gives the relationship at its best.
- underStress: How this contact distorts when either person is depleted, anxious, or stretched thin — the recognizable strain it puts on the bond.
- growth: The growth arc this contact offers — what it asks the relationship to evolve toward over time.

Do not name the planets, the aspect type, or any astrological terms in the prose — describe the underlying relational reality directly.

Respond as JSON: {"dynamic": "...", "inFlow": "...", "underStress": "...", "growth": "..."}`,
  },
];

export const PROMPT_DEFAULTS_BY_KEY = new Map(PROMPT_DEFAULTS.map((p) => [p.key, p]));

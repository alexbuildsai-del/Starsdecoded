export interface PromptDefault {
  key: string;
  category: string;
  subcategory: string;
  label: string;
  systemPrompt: string | null;
  userPrompt: string | null;
}

const NATAL_V2_SYSTEM = `You are the voice of a perceptive human psychological astrologer writing a premium natal-chart report.

Your job is to translate the supplied chart data and canonical meaning-library material into specific, useful self-understanding. Treat astrology as a symbolic language for describing patterns, not as proof of fate, personality certainty, past lives, or future events.

Voice and style:
- Sound observant, warm, direct, and intelligent. Write to one person using "you".
- Lead with the sharpest insight. Do not warm up with generic astrology language or restate the assignment.
- Make abstract ideas tangible with recognizable behavior, choices, conversations, work situations, or private moments.
- Vary sentence length and paragraph rhythm. Keep the prose easy to scan without making it choppy.
- Prefer plain, exact verbs over inflated psychological language.
- Use the supplied canonical meanings as evidence, then synthesize across them. Do not invent or contradict a placement meaning.
- Keep the interpretation nuanced: name both the resourced expression and the pattern that appears under pressure.
- Do not use em dashes as clause connectors, canned transitions, "it's worth noting", "at the end of the day", "navigating", "not just X but Y", or generic three-part adjective stacks.
- Do not mention being an AI, a model, a prompt, a word count, or these instructions.
- Do not use mystical certainty, deterministic predictions, karmic claims, or generic trait lists.

Return only the requested JSON object. Do not wrap it in markdown fences or add commentary outside the JSON.`;

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

export const PROMPT_DEFAULTS: PromptDefault[] = [
  // --- Natal sections ---
  // Session 1 V2 redesigned report. Foundation is an internal handoff; the
  // remaining seven sections are reader-facing and intentionally sum to the
  // report's 2,200–2,800 word target.
  {
    key: "natal:foundation:system",
    category: "natal",
    subcategory: "foundation",
    label: "Natal V2 — Foundation (system)",
    systemPrompt: NATAL_V2_SYSTEM,
    userPrompt: null,
  },
  {
    key: "natal:foundation:user",
    category: "natal",
    subcategory: "foundation",
    label: "Natal V2 — Foundation (user)",
    systemPrompt: null,
    userPrompt: `Build the internal foundation for {name}'s redesigned natal report. This is an editorial analysis handoff, not reader-facing prose. Use the chart data and canonical library meanings to identify the few patterns that should organize the entire report.

Chart data:
{chartSummary}

Canonical meaning context:
{foundationContext}

Return exactly this JSON shape:
{
  "chartThesis": "<2-3 sentences stating the central psychological story of this chart>",
  "dominantPattern": "<2-3 sentences describing the strongest repeated pattern and how it operates>",
  "centralTension": "<2-3 sentences naming the most important push-pull, including what each side protects>",
  "supportingEvidence": [
    {"placement": "<placement or aspect>", "observation": "<specific evidence>", "implication": "<what it means psychologically>"},
    {"placement": "<placement or aspect>", "observation": "<specific evidence>", "implication": "<what it means psychologically>"},
    {"placement": "<placement or aspect>", "observation": "<specific evidence>", "implication": "<what it means psychologically>"}
  ],
  "sectionGuidance": {
    "overview": "<the one insight the overview must establish>",
    "triad": "<the one interaction the triad must make clear>",
    "career": "<the work or calling pattern to develop>",
    "relationships": "<the intimacy pattern to develop>",
    "superpowers": "<the capability and cost to surface>",
    "discoveries": "<the most revealing paradox to explore>",
    "focus": "<the highest-leverage practical focus>"
  }
}

Keep this analysis evidence-based and specific. Do not produce generic personality labels, predictions, or advice.`,
  },
  {
    key: "natal:overview:system",
    category: "natal",
    subcategory: "overview",
    label: "Natal V2 — Chart Overview (system)",
    systemPrompt: NATAL_V2_SYSTEM,
    userPrompt: null,
  },
  {
    key: "natal:overview:user",
    category: "natal",
    subcategory: "overview",
    label: "Natal V2 — Chart Overview (user)",
    systemPrompt: null,
    userPrompt: `Write the Chart Overview for {name}'s natal report. This is the first reader-facing interpretation, so establish the chart's central pattern quickly and make the reader feel accurately seen. Synthesize across the supplied foundation rather than listing placements.

Chart data:
{chartSummary}

Internal foundation:
{foundation}

Canonical meaning context:
{overviewContext}

Write 300-375 words total and return exactly this JSON shape:
{
  "opening": "<2-3 sentences with the clearest, most specific description of this chart>",
  "chartSignature": "<one paragraph explaining the dominant pattern and how it appears in everyday life>",
  "dominantThemes": [
    {"label": "<2-4 word label>", "description": "<2-3 sentences grounded in the supplied meanings>"},
    {"label": "<2-4 word label>", "description": "<2-3 sentences grounded in the supplied meanings>"},
    {"label": "<2-4 word label>", "description": "<2-3 sentences grounded in the supplied meanings>"}
  ],
  "integration": "<2-3 sentences showing how the themes belong to one coherent psychological picture>"
}

Do not enumerate planets or signs mechanically. Do not make the overview sound like a horoscope or a list of traits.`,
  },
  {
    key: "natal:triad:system",
    category: "natal",
    subcategory: "triad",
    label: "Natal V2 — Core Triad (system)",
    systemPrompt: NATAL_V2_SYSTEM,
    userPrompt: null,
  },
  {
    key: "natal:triad:user",
    category: "natal",
    subcategory: "triad",
    label: "Natal V2 — Core Triad (user)",
    systemPrompt: null,
    userPrompt: `Write the Core Triad section for {name}'s natal report. Show how the inner identity, emotional life, and outward manner cooperate or pull against one another. Do not write three isolated mini-definitions.

Chart data:
{chartSummary}

Internal foundation:
{foundation}

Sun, Moon, and Ascendant meanings:
{triadContext}

Write 300-375 words total and return exactly this JSON shape:
{
  "identity": "<2-3 sentences on the self-expression and purpose the person is building>",
  "emotionalLife": "<2-3 sentences on emotional needs, regulation, and what creates security>",
  "outwardManner": "<2-3 sentences on how the person arrives, is initially read, and meets new situations>",
  "synthesis": "<3-4 sentences showing the lived interaction between the three, including one recognizable everyday example>"
}

Use second person. Lead each field with its most useful insight. Keep the distinction between private experience and public presentation clear.`,
  },
  {
    key: "natal:superpowers:system",
    category: "natal",
    subcategory: "superpowers",
    label: "Natal V2 — Superpowers, Chronic Patterns & Growing Edges (system)",
    systemPrompt: NATAL_V2_SYSTEM,
    userPrompt: null,
  },
  {
    key: "natal:superpowers:user",
    category: "natal",
    subcategory: "superpowers",
    label: "Natal V2 — Superpowers, Chronic Patterns & Growing Edges (user)",
    systemPrompt: null,
    userPrompt: `Write the Superpowers, Chronic Patterns & Growing Edges section for {name}'s natal report. The goal is useful self-recognition, not praise or diagnosis. Show how a real strength can become a recurring problem when overused, then name the practice that restores choice.

Chart data:
{chartSummary}

Internal foundation:
{foundation}

Strength, shadow, and aspect context:
{superpowersContext}

Write 400-500 words total and return exactly this JSON shape:
{
  "opening": "<2-3 sentences explaining the central capability-cost pattern>",
  "superpowers": [
    {"title": "<2-4 word title>", "description": "<2-3 sentences with a concrete example>"},
    {"title": "<2-4 word title>", "description": "<2-3 sentences with a concrete example>"},
    {"title": "<2-4 word title>", "description": "<2-3 sentences with a concrete example>"}
  ],
  "chronicPatterns": [
    {"title": "<2-4 word title>", "description": "<2-3 sentences naming the repeating pattern without diagnosing>"},
    {"title": "<2-4 word title>", "description": "<2-3 sentences naming the repeating pattern without diagnosing>"},
    {"title": "<2-4 word title>", "description": "<2-3 sentences naming the repeating pattern without diagnosing>"}
  ],
  "growingEdges": [
    {"title": "<2-4 word title>", "description": "<2-3 sentences describing a practice that develops flexibility>"},
    {"title": "<2-4 word title>", "description": "<2-3 sentences describing a practice that develops flexibility>"},
    {"title": "<2-4 word title>", "description": "<2-3 sentences describing a practice that develops flexibility>"}
  ],
  "synthesis": "<3-4 sentences showing how capability, chronic pattern, and growth edge form one developmental arc>"
}

Do not use labels such as gifted, broken, toxic, narcissistic, or destined. Keep every item specific to the supplied chart.`,
  },
  {
    key: "natal:discoveries:system",
    category: "natal",
    subcategory: "discoveries",
    label: "Natal V2 — Key Paradoxes (system)",
    systemPrompt: NATAL_V2_SYSTEM,
    userPrompt: null,
  },
  {
    key: "natal:discoveries:user",
    category: "natal",
    subcategory: "discoveries",
    label: "Natal V2 — Key Paradoxes (user)",
    systemPrompt: null,
    userPrompt: `Write the Key Paradoxes section for {name}'s natal report. Surface the tensions that make this chart distinctive: two needs that coexist, a quality that changes under pressure, or a strength that contains its own cost. A paradox is not a contradiction to solve; it is a pattern to understand and work with.

Chart data:
{chartSummary}

Internal foundation:
{foundation}

Aspect and placement context:
{discoveriesContext}

Write 300-375 words total and return exactly this JSON shape:
{
  "opening": "<2-3 sentences introducing the most revealing paradox in plain language>",
  "paradoxes": [
    {
      "title": "<2-5 word title>",
      "tension": "<one sentence naming the two truths that coexist>",
      "livedExpression": "<2-3 sentences showing how it appears in real life>",
      "integration": "<one sentence describing a more flexible way to hold it>"
    },
    {
      "title": "<2-5 word title>",
      "tension": "<one sentence naming the two truths that coexist>",
      "livedExpression": "<2-3 sentences showing how it appears in real life>",
      "integration": "<one sentence describing a more flexible way to hold it>"
    },
    {
      "title": "<2-5 word title>",
      "tension": "<one sentence naming the two truths that coexist>",
      "livedExpression": "<2-3 sentences showing how it appears in real life>",
      "integration": "<one sentence describing a more flexible way to hold it>"
    }
  ],
  "synthesis": "<2-3 sentences explaining what these paradoxes reveal about the chart as a whole>"
}

Avoid clever-sounding opposites that are not grounded in the supplied evidence. Do not repeat the same insight from the Overview or Triad.`,
  },
  {
    key: "natal:focus:system",
    category: "natal",
    subcategory: "focus",
    label: "Natal V2 — What to Focus On (system)",
    systemPrompt: NATAL_V2_SYSTEM,
    userPrompt: null,
  },
  {
    key: "natal:focus:user",
    category: "natal",
    subcategory: "focus",
    label: "Natal V2 — What to Focus On (user)",
    systemPrompt: null,
    userPrompt: `Write the What to Focus On closing section for {name}'s natal report. Turn the report's strongest insights into a small number of practical priorities. This is not a prediction and not a self-improvement checklist. It should leave the reader with clearer choices for the next chapter of their life.

Chart data:
{chartSummary}

Internal foundation:
{foundation}

Whole-report context:
{focusContext}

Write 300-375 words total and return exactly this JSON shape:
{
  "opening": "<2-3 sentences stating the highest-leverage shift this chart is asking the person to practice>",
  "priorities": [
    {
      "title": "<2-4 word title>",
      "whyItMatters": "<2 sentences linking this priority to the chart>",
      "practice": "<one concrete behavior or question to try>"
    },
    {
      "title": "<2-4 word title>",
      "whyItMatters": "<2 sentences linking this priority to the chart>",
      "practice": "<one concrete behavior or question to try>"
    },
    {
      "title": "<2-4 word title>",
      "whyItMatters": "<2 sentences linking this priority to the chart>",
      "practice": "<one concrete behavior or question to try>"
    }
  ],
  "closing": "<2-3 sentences that feel personal, grounded, and forward-looking without predicting what will happen>"
}

Priorities must be actionable but not prescriptive. Avoid generic advice such as 'believe in yourself', 'set boundaries', or 'stay positive' unless you make it specific to this chart.`,
  },
  {
    key: "natal:relationships:system",
    category: "natal",
    subcategory: "relationships",
    label: "Natal V2 — Relationships & Intimacy (system)",
    systemPrompt: NATAL_V2_SYSTEM,
    userPrompt: null,
  },
  {
    key: "natal:relationships:user",
    category: "natal",
    subcategory: "relationships",
    label: "Natal V2 — Relationships & Intimacy (user)",
    systemPrompt: null,
    userPrompt: `Write the Relationships & Intimacy section for {name}'s natal report. Describe how this person bonds, chooses closeness, expresses desire, handles dependence, and responds when intimacy feels uncertain. Be compassionate without excusing harmful patterns.

Chart data:
{chartSummary}

Internal foundation:
{foundation}

Relationship meaning context:
{relationshipsContext}

Write 300-375 words total and return exactly this JSON shape:
{
  "opening": "<2-3 sentences naming the central intimacy pattern plainly>",
  "cards": [
    {
      "title": "<2-4 word title>",
      "icon": "<single relevant symbol>",
      "bullets": ["<one specific sentence>", "<one specific sentence>", "<one specific sentence>"]
    },
    {
      "title": "<2-4 word title>",
      "icon": "<single relevant symbol>",
      "bullets": ["<one specific sentence>", "<one specific sentence>", "<one specific sentence>"]
    },
    {
      "title": "<2-4 word title>",
      "icon": "<single relevant symbol>",
      "bullets": ["<one specific sentence>", "<one specific sentence>", "<one specific sentence>"]
    }
  ],
  "synthesis": "<3-4 sentences connecting bonding style, attraction, conflict, and the practice that supports deeper intimacy>"
}

Each bullet must describe something a person could recognize in an actual relationship. Avoid soulmate language, predictions, and universal claims about compatibility.`,
  },
  {
    key: "natal:career:system",
    category: "natal",
    subcategory: "career",
    label: "Natal V2 — Career & Calling (system)",
    systemPrompt: NATAL_V2_SYSTEM,
    userPrompt: null,
  },
  {
    key: "natal:career:user",
    category: "natal",
    subcategory: "career",
    label: "Natal V2 — Career & Calling (user)",
    systemPrompt: null,
    userPrompt: `Write the Career & Calling section for {name}'s natal report. Translate the chart's vocational pattern into the kinds of problems, responsibilities, environments, and contributions where this person can do meaningful work. Do not reduce it to a list of job titles.

Chart data:
{chartSummary}

Internal foundation:
{foundation}

Career meaning context:
{careerContext}

Write 300-375 words total and return exactly this JSON shape:
{
  "opening": "<2-3 sentences naming the strongest vocational through-line>",
  "cards": [
    {
      "title": "<2-4 word title>",
      "icon": "<single relevant symbol>",
      "bullets": ["<one specific sentence>", "<one specific sentence>", "<one specific sentence>"]
    },
    {
      "title": "<2-4 word title>",
      "icon": "<single relevant symbol>",
      "bullets": ["<one specific sentence>", "<one specific sentence>", "<one specific sentence>"]
    },
    {
      "title": "<2-4 word title>",
      "icon": "<single relevant symbol>",
      "bullets": ["<one specific sentence>", "<one specific sentence>", "<one specific sentence>"]
    }
  ],
  "synthesis": "<3-4 sentences connecting calling, working style, authority, and the growth edge that makes success sustainable>"
}

Each bullet must be concrete and useful, not a generic strength. Name both the environment where this pattern thrives and the way it can become overextended under pressure.`,
  },

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

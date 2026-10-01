import { openai } from "@workspace/integrations-openai-ai-server";
import { MODELS } from "./models.js";
import { resolveSection } from "./promptLoader.js";
import type { NatalChartData } from "./chartCalculation.js";
import { DATA_RULE, dataBlock } from "../prompts/data.js";
import { ASPECT, BODY, BODY_LABELS, type AspectName, type Body } from "../prompts/vocabulary.js";
import {
  computeSynastry,
  type CrossAspect,
  type SynastryComputeResult,
} from "./synastryCompute.js";

/** Per-contact meaning composed from the vocabulary: the aspect type's facets, framed by the two bodies. */
export interface SynastryAspectPayload {
  dynamic: string;
  inFlow: string;
  underStress: string;
  growth: string;
}

/** Canonical key for a cross-aspect regardless of which chart owns which side. */
export function synastryAspectKey(planet1: string, type: string, planet2: string): string {
  const [a, b] = [planet1.toLowerCase(), planet2.toLowerCase()].sort();
  return `${a}_${type.toLowerCase()}_${b}`;
}

/**
 * Compose a cross-aspect meaning with no lookup. The generic dynamic of e.g.
 * Venus square Mars is the same whichever chart owns which side; the section
 * prompts add the per-direction colour.
 */
export function composeSynastryAspect(planetA: string, type: string, planetB: string): SynastryAspectPayload | null {
  const e = ASPECT[type.toLowerCase() as AspectName];
  const a = planetA.toLowerCase() as Body, b = planetB.toLowerCase() as Body;
  if (!e || !BODY[a] || !BODY[b]) return null;
  return {
    dynamic: `${BODY_LABELS[a]} and ${BODY_LABELS[b]} across two charts. ${BODY[a].short} ${BODY[b].short} ${e.dynamic}`,
    inFlow: e.inFlow,
    underStress: e.underStress,
    growth: e.growth,
  };
}

export interface SynastryInterpretation {
  overview: string;
  emotional: string;
  communication: string;
  physical: string;
  conflict: string;
  growth: string;
  topAspectMeanings: Record<
    string,
    SynastryAspectPayload & { planetA: string; planetB: string; type: string; orb: number }
  >;
}

export interface SynastryReportData {
  compute: SynastryComputeResult;
  interpretation: SynastryInterpretation;
}

const DEFAULT_SYNASTRY_SYSTEM = `You are an expert psychological astrologer specializing in relationship dynamics. Your prose is:
- Precise, analytical, and psychologically grounded
- Free of mystical claims or deterministic predictions
- Written for two thoughtful adults exploring their relationship
- Focused on relational patterns, behavioral signatures, and growth opportunities
You write in second person plural ("you both", "between you"). You do not name planets, signs, houses, or aspects in the body of the prose — you describe the underlying relational reality.`;

/** The rule rides on every system prompt, a stored override included (ADR-202). */
export function synastrySystem(system: string): string {
  return `${system || DEFAULT_SYNASTRY_SYSTEM}\n\n${DATA_RULE}`;
}

function fillTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) =>
    Object.prototype.hasOwnProperty.call(vars, k) ? vars[k] : `{${k}}`,
  );
}

async function callAI(systemPrompt: string, userPrompt: string, maxTokens = 600): Promise<string> {
  const response = await openai.chat.completions.create({
    model: MODELS.synastry,
    max_completion_tokens: maxTokens,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });
  return response.choices[0]?.message?.content?.trim() ?? "";
}

function aspectsContextBlock(
  cross: CrossAspect[],
  meanings: Map<string, SynastryAspectPayload>,
  limit = 12,
): string {
  const lines: string[] = [];
  for (const c of cross.slice(0, limit)) {
    const key = synastryAspectKey(c.planetA, c.type, c.planetB);
    const m = meanings.get(key);
    const header = `A's ${c.planetA} ${c.type} B's ${c.planetB} (orb ${c.orb}°)`;
    if (m) {
      lines.push(
        `- ${header}\n  dynamic: ${m.dynamic}\n  inFlow: ${m.inFlow}\n  underStress: ${m.underStress}\n  growth: ${m.growth}`,
      );
    } else {
      lines.push(`- ${header}`);
    }
  }
  return lines.join("\n\n");
}

// The typed names appear once, each in its block; every other line says A and B (ADR-202).
export function summaryBlock(
  compute: SynastryComputeResult,
  nameA: string,
  nameB: string,
): string {
  const cats = compute.categories
    .map((c) => `${c.category}: ${c.score} (${c.rating}, ${c.count} contacts)`)
    .join("\n  ");
  return [
    `Pair: A & B`,
    `A's name:`,
    dataBlock("name", nameA),
    `B's name:`,
    dataBlock("name", nameB),
    `Overall score: ${compute.overallScore} (${compute.overallRating})`,
    `Themes: ${compute.themes.join(", ") || "none"}`,
    `Category scores:\n  ${cats}`,
  ].join("\n");
}

export async function generateSynastryInterpretation(
  chartA: NatalChartData,
  chartB: NatalChartData,
  nameA: string,
  nameB: string,
  relationshipType = "romantic",
): Promise<SynastryReportData> {
  const compute = computeSynastry(chartA, chartB);

  // Compose meanings for the top ~14 cross-aspects from the vocabulary.
  const top = compute.crossAspects.slice(0, 14);
  const meanings = new Map<string, SynastryAspectPayload>();
  for (const c of top) {
    const m = composeSynastryAspect(c.planetA, c.type, c.planetB);
    if (m) meanings.set(synastryAspectKey(c.planetA, c.type, c.planetB), m);
  }

  const summary = summaryBlock(compute, nameA, nameB);
  const aspectContext = aspectsContextBlock(top, meanings);
  const emotionalContext = aspectsContextBlock(
    compute.crossAspects.filter((c) => c.categories.includes("emotional")),
    meanings,
    8,
  );
  const commContext = aspectsContextBlock(
    compute.crossAspects.filter((c) => c.categories.includes("communication")),
    meanings,
    8,
  );
  const physContext = aspectsContextBlock(
    compute.crossAspects.filter((c) => c.categories.includes("physical")),
    meanings,
    8,
  );
  const tensionContext = aspectsContextBlock(
    compute.tensions,
    meanings,
    8,
  );
  const growthContext = aspectsContextBlock(
    compute.crossAspects.filter((c) => c.categories.includes("growth")),
    meanings,
    8,
  );

  // Load all section prompts for the given relationship type in parallel.
  const rtKey = `synastry:${relationshipType}`;
  const [overviewP, emotionalP, communicationP, physicalP, conflictP, growthP] =
    await Promise.all([
      resolveSection(`${rtKey}:overview`),
      resolveSection(`${rtKey}:emotional`),
      resolveSection(`${rtKey}:communication`),
      resolveSection(`${rtKey}:physical`),
      resolveSection(`${rtKey}:conflict`),
      resolveSection(`${rtKey}:growth`),
    ]);

  const commonVars = { nameA: "A", nameB: "B", summary };

  const [overview, emotional, communication, physical, conflict, growth] =
    await Promise.all([
      callAI(
        synastrySystem(overviewP.system),
        fillTemplate(overviewP.user, { ...commonVars, aspectContext }),
        700,
      ),
      callAI(
        synastrySystem(emotionalP.system),
        fillTemplate(emotionalP.user, {
          ...commonVars,
          emotionalContext: emotionalContext || "(few direct emotional contacts — describe what this emptiness implies)",
        }),
        500,
      ),
      callAI(
        synastrySystem(communicationP.system),
        fillTemplate(communicationP.user, {
          ...commonVars,
          commContext: commContext || "(few direct mental contacts — describe how the broader chart implies their dialogue style)",
        }),
        500,
      ),
      callAI(
        synastrySystem(physicalP.system),
        fillTemplate(physicalP.user, {
          ...commonVars,
          physContext: physContext || "(few direct physical contacts — be honest about what that implies)",
        }),
        500,
      ),
      callAI(
        synastrySystem(conflictP.system),
        fillTemplate(conflictP.user, {
          ...commonVars,
          tensionContext: tensionContext || "(few hard contacts — describe what easy compatibility might quietly cost the relationship)",
        }),
        500,
      ),
      callAI(
        synastrySystem(growthP.system),
        fillTemplate(growthP.user, {
          ...commonVars,
          growthContext: growthContext || aspectContext,
        }),
        500,
      ),
    ]);

  // Embed the per-aspect meanings in the report so the UI can render
  // applied per-contact cards without any further library lookup.
  const topAspectMeanings: SynastryInterpretation["topAspectMeanings"] = {};
  for (const c of top) {
    const key = synastryAspectKey(c.planetA, c.type, c.planetB);
    const m = meanings.get(key);
    if (!m) continue;
    topAspectMeanings[`${c.planetA}_${c.type}_${c.planetB}`] = {
      ...m,
      planetA: c.planetA,
      planetB: c.planetB,
      type: c.type,
      orb: c.orb,
    };
  }

  return {
    compute,
    interpretation: {
      overview,
      emotional,
      communication,
      physical,
      conflict,
      growth,
      topAspectMeanings,
    },
  };
}


import { openai } from "@workspace/integrations-openai-ai-server";
import { resolveSection } from "./promptLoader.js";
import {
  getSynastryAspectMeaning,
  synastryAspectKey,
  type AspectType,
  type Planet,
} from "@workspace/meaning-library";
import type { SynastryAspectPayload } from "@workspace/db";
import type { NatalChartData } from "./chartCalculation.js";
import {
  computeSynastry,
  type CrossAspect,
  type SynastryComputeResult,
} from "./synastryCompute.js";

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

function fillTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) =>
    Object.prototype.hasOwnProperty.call(vars, k) ? vars[k] : `{${k}}`,
  );
}

async function callAI(systemPrompt: string, userPrompt: string, maxTokens = 600): Promise<string> {
  const response = await openai.chat.completions.create({
    model: "gpt-5.2",
    max_completion_tokens: maxTokens,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });
  return response.choices[0]?.message?.content?.trim() ?? "";
}

async function safeLookup<T>(work: Promise<T>): Promise<T | null> {
  try {
    return await work;
  } catch {
    return null;
  }
}

function aspectsContextBlock(
  cross: CrossAspect[],
  meanings: Map<string, SynastryAspectPayload>,
  nameA: string,
  nameB: string,
  limit = 12,
): string {
  const lines: string[] = [];
  for (const c of cross.slice(0, limit)) {
    const key = synastryAspectKey(c.planetA, c.type, c.planetB);
    const m = meanings.get(key);
    const header = `${nameA}'s ${c.planetA} ${c.type} ${nameB}'s ${c.planetB} (orb ${c.orb}°)`;
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

function summaryBlock(
  compute: SynastryComputeResult,
  nameA: string,
  nameB: string,
): string {
  const cats = compute.categories
    .map((c) => `${c.category}: ${c.score} (${c.rating}, ${c.count} contacts)`)
    .join("\n  ");
  return [
    `Pair: ${nameA} & ${nameB}`,
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

  // Pull meanings for the top ~14 cross-aspects.
  const top = compute.crossAspects.slice(0, 14);
  const meanings = new Map<string, SynastryAspectPayload>();
  await Promise.all(
    top.map((c) =>
      safeLookup(
        getSynastryAspectMeaning(
          c.planetA as Planet,
          c.type as AspectType,
          c.planetB as Planet,
        ),
      ).then((res) => {
        if (res) meanings.set(synastryAspectKey(c.planetA, c.type, c.planetB), res);
      }),
    ),
  );

  const summary = summaryBlock(compute, nameA, nameB);
  const aspectContext = aspectsContextBlock(top, meanings, nameA, nameB);
  const emotionalContext = aspectsContextBlock(
    compute.crossAspects.filter((c) => c.categories.includes("emotional")),
    meanings,
    nameA,
    nameB,
    8,
  );
  const commContext = aspectsContextBlock(
    compute.crossAspects.filter((c) => c.categories.includes("communication")),
    meanings,
    nameA,
    nameB,
    8,
  );
  const physContext = aspectsContextBlock(
    compute.crossAspects.filter((c) => c.categories.includes("physical")),
    meanings,
    nameA,
    nameB,
    8,
  );
  const tensionContext = aspectsContextBlock(
    compute.tensions,
    meanings,
    nameA,
    nameB,
    8,
  );
  const growthContext = aspectsContextBlock(
    compute.crossAspects.filter((c) => c.categories.includes("growth")),
    meanings,
    nameA,
    nameB,
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

  const commonVars = { nameA, nameB, summary };

  const [overview, emotional, communication, physical, conflict, growth] =
    await Promise.all([
      callAI(
        overviewP.system || DEFAULT_SYNASTRY_SYSTEM,
        fillTemplate(overviewP.user, { ...commonVars, aspectContext }),
        700,
      ),
      callAI(
        emotionalP.system || DEFAULT_SYNASTRY_SYSTEM,
        fillTemplate(emotionalP.user, {
          ...commonVars,
          emotionalContext: emotionalContext || "(few direct emotional contacts — describe what this emptiness implies)",
        }),
        500,
      ),
      callAI(
        communicationP.system || DEFAULT_SYNASTRY_SYSTEM,
        fillTemplate(communicationP.user, {
          ...commonVars,
          commContext: commContext || "(few direct mental contacts — describe how the broader chart implies their dialogue style)",
        }),
        500,
      ),
      callAI(
        physicalP.system || DEFAULT_SYNASTRY_SYSTEM,
        fillTemplate(physicalP.user, {
          ...commonVars,
          physContext: physContext || "(few direct physical contacts — be honest about what that implies)",
        }),
        500,
      ),
      callAI(
        conflictP.system || DEFAULT_SYNASTRY_SYSTEM,
        fillTemplate(conflictP.user, {
          ...commonVars,
          tensionContext: tensionContext || "(few hard contacts — describe what easy compatibility might quietly cost the relationship)",
        }),
        500,
      ),
      callAI(
        growthP.system || DEFAULT_SYNASTRY_SYSTEM,
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


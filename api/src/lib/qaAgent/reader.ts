/**
 * The QA agent's reading (ADR-86, MB-78): one natal and one pair report
 * from the release lab's runs, read against the style contract by the
 * catalogue's QA model, and the walk's screenshots read with each persona's
 * brief. Findings only; a sev-1 fails the release. The text of a report
 * never leaves the process except to the model that judges it.
 */
import { z } from "zod/v4";
import { openai } from "@workspace/integrations-openai-ai-server";
import { callStructured } from "../aiInterpretation.js";
import { STYLE_CONTRACT } from "../../prompts/system.js";
import { PAIR_DOCTRINE } from "../../prompts/pair/index.js";
import { proseText } from "../proseMetrics.js";
import { addAttempt, emptySection, type SectionUsage } from "../usage.js";
import type { ModelId } from "../models.js";
import type { PageVisit } from "./browser.js";

export const FindingSchema = z.object({
  sev: z.union([z.literal(1), z.literal(2), z.literal(3)]).describe("1 wrong or blocking, 2 degraded, 3 polish"),
  where: z.string().describe("the persona and page, or the report and chapter"),
  title: z.string().describe("one line"),
  detail: z.string().describe("expected against actual; for report content, the sentence at fault"),
});
export const FindingsSchema = z.object({ findings: z.array(FindingSchema).max(20) });
export type Finding = z.infer<typeof FindingSchema>;

export interface ReadResult {
  findings: Finding[];
  usage: SectionUsage[];
}

const READER_SYSTEM = `You are the QA reader for Stars Decoded, a natal and compatibility report product. You judge report text against the style contract below and return findings only: no praise, no summary. A finding is sev-1 when the text would be wrong or harmful for the reader (a false or invented fact, a score or rating of a pair, method talk that explains astrology, a planet, sign or house name in prose where the contract forbids it, a sentence that is not about the reader), sev-2 when the contract is broken in a way the reader would feel (sentences far over 25 words, em dashes, semicolons, abstract summary sentences, repeated images), sev-3 for polish. Quote the sentence at fault in detail. Return at most twenty findings.

${STYLE_CONTRACT}

${PAIR_DOCTRINE}`;

export interface ReaderEngine {
  read: (model: ModelId, label: string, text: string, signal?: AbortSignal) => Promise<{ findings: Finding[]; usage: SectionUsage }>;
  see: (model: ModelId, visits: PageVisit[], signal?: AbortSignal) => Promise<{ findings: Finding[]; usage: SectionUsage }>;
}

export const liveReader: ReaderEngine = {
  async read(model, label, text, signal) {
    const out = await callStructured<z.infer<typeof FindingsSchema>>({
      usageKey: `qa:${label}`,
      model,
      system: READER_SYSTEM,
      user: `REPORT: ${label}\n\n${text}`,
      schema: FindingsSchema,
      maxTokens: 4_000,
      signal,
    });
    return { findings: out.data.findings, usage: out.usage };
  },
  async see(model, visits, signal) {
    let usage = emptySection("qa:walk", model);
    const findings: Finding[] = [];
    const shots = visits.filter((v) => v.screenshot);
    if (!shots.length) return { findings, usage };
    const content: Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string; detail: "low" } }> = [
      { type: "text", text: "Each screenshot below is a page of the staging site as one persona sees it, anonymous. For each, say only what is wrong: a blank or broken page, an error shown to the visitor, a claim the product does not keep, text that names the old product name Astra, a missing method or legal statement the persona looks for. Return findings only, with the persona and the path in `where`." },
    ];
    for (const v of shots) {
      content.push({ type: "text", text: `${v.persona} at ${v.path} (HTTP ${v.status ?? "none"}). Looks for: ${v.step.expect.map((r) => r.source).join(", ")}.` });
      content.push({ type: "image_url", image_url: { url: `data:image/jpeg;base64,${v.screenshot}`, detail: "low" } });
    }
    const startedAt = Date.now();
    const response = await openai.chat.completions.create({
      model,
      max_completion_tokens: 3_000,
      messages: [{ role: "system", content: "You are the QA agent for Stars Decoded. Findings only, as JSON." }, { role: "user", content }],
      response_format: { type: "json_schema", json_schema: { name: "qa_walk", strict: true, schema: { type: "object", additionalProperties: false, required: ["findings"], properties: { findings: { type: "array", items: { type: "object", additionalProperties: false, required: ["sev", "where", "title", "detail"], properties: { sev: { type: "integer" }, where: { type: "string" }, title: { type: "string" }, detail: { type: "string" } } } } } } } },
    }, signal ? { signal } : {});
    usage = addAttempt(usage, response.usage, Date.now() - startedAt);
    const parsed = FindingsSchema.safeParse((() => { try { return JSON.parse(response.choices[0]?.message?.content ?? ""); } catch { return null; } })());
    if (parsed.success) findings.push(...parsed.data.findings);
    return { findings, usage };
  },
};

/** What the walk found on its own, before any model: pages that did not load, expectations missed, console errors. */
export function walkFindings(visits: PageVisit[]): Finding[] {
  const findings: Finding[] = [];
  for (const v of visits) {
    const where = `${v.persona} at ${v.path}`;
    if (v.error || v.status === null || v.status >= 500) { findings.push({ sev: v.step.sev, where, title: "the page did not load", detail: `expected a page; got ${v.error ?? `HTTP ${v.status}`}` }); continue; }
    if (v.status >= 400) findings.push({ sev: v.step.sev === 1 ? 1 : 2, where, title: `HTTP ${v.status}`, detail: `expected a page for the visitor; got HTTP ${v.status}` });
    const missed = v.step.expect.filter((re) => !re.test(v.text) && !re.test(v.title));
    if (missed.length) findings.push({ sev: v.step.sev, where, title: "the page misses what the persona looks for", detail: `expected ${missed.map((r) => r.source).join(", ")}; the page reads: ${v.text.slice(0, 160)}` });
    const shown = (v.step.never ?? []).filter((re) => re.test(v.text));
    if (shown.length) findings.push({ sev: 1, where, title: "the page shows what it never should", detail: `found ${shown.map((r) => r.source).join(", ")}` });
    if (v.consoleErrors.length) findings.push({ sev: 3, where, title: `${v.consoleErrors.length} console error(s)`, detail: v.consoleErrors.slice(0, 3).join(" | ") });
  }
  return findings;
}

/** A stored run's sections as one text for the reader, claims left out. */
export function reportText(sections: Array<{ section: string; output: unknown }>): string {
  return sections.filter((s) => s.section !== "foundation" && s.output).map((s) => `## ${s.section}\n\n${proseText(s.output)}`).join("\n\n");
}

/**
 * Turn a zod schema into the JSON Schema OpenAI's strict structured outputs
 * accept: every object closed, every property required, no unsupported
 * keywords. Strict mode guarantees the model's reply parses against the
 * schema, so the section schemas become the output contract and the old
 * hand-rolled parsers go away.
 */
import { z } from "zod/v4";

type JsonObject = Record<string, unknown>;

/** The array bounds as words, since the model only sees the description. */
export function itemsHint(min: unknown, max: unknown): string | undefined {
  if (typeof min === "number" && typeof max === "number") return min === max ? `Exactly ${min} items.` : `${min} to ${max} items.`;
  if (typeof min === "number") return `At least ${min} items.`;
  if (typeof max === "number") return `At most ${max} items.`;
  return undefined;
}

function tighten(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(tighten);
  if (!node || typeof node !== "object") return node;
  const src = node as JsonObject;
  const out: JsonObject = {};
  for (const [k, v] of Object.entries(src)) {
    // Strict mode rejects these; the zod schema still enforces them on parse.
    if (["minLength", "maxLength", "minItems", "maxItems", "pattern", "format", "default", "minimum", "maximum", "exclusiveMinimum", "exclusiveMaximum", "multipleOf"].includes(k)) continue;
    out[k] = tighten(v);
  }
  // Stripped bounds are invisible to the model, and an array one item too
  // long fails the whole section on parse, so the count goes into the text.
  const hint = itemsHint(src.minItems, src.maxItems);
  if (hint) out.description = typeof out.description === "string" && out.description ? `${out.description} ${hint}` : hint;
  if (out.type === "object" && out.properties && typeof out.properties === "object") {
    out.additionalProperties = false;
    out.required = Object.keys(out.properties as JsonObject);
  }
  return out;
}

export function toStrictJsonSchema(schema: z.ZodType): JsonObject {
  const raw = z.toJSONSchema(schema, { target: "draft-7", unrepresentable: "any" }) as JsonObject;
  delete raw.$schema;
  return tighten(raw) as JsonObject;
}

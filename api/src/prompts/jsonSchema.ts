/**
 * Turn a zod schema into the JSON Schema OpenAI's strict structured outputs
 * accept: every object closed, every property required, no unsupported
 * keywords. Strict mode guarantees the model's reply parses against the
 * schema, so the section schemas become the output contract and the old
 * hand-rolled parsers go away.
 */
import { z } from "zod/v4";

type JsonObject = Record<string, unknown>;

function tighten(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(tighten);
  if (!node || typeof node !== "object") return node;
  const out: JsonObject = {};
  for (const [k, v] of Object.entries(node as JsonObject)) {
    // Strict mode rejects these; the zod schema still enforces them on parse.
    if (["minLength", "maxLength", "minItems", "maxItems", "pattern", "format", "default"].includes(k)) continue;
    out[k] = tighten(v);
  }
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

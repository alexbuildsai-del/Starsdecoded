import OpenAI from "openai";

/**
 * One place that decides how this package talks to OpenAI.
 *
 * Prefer a plain OpenAI key against api.openai.com. The
 * AI_INTEGRATIONS_OPENAI_* pair is Replit's provisioned proxy and is still
 * honoured so an existing deployment keeps working; a base URL is otherwise
 * optional and only needed to route through a proxy or an OpenAI-compatible
 * gateway.
 *
 * Every client in this package goes through here. They each used to inline
 * the same two checks, which meant a fix applied to one left the others
 * throwing Replit's error at module load.
 */
export function createOpenAIClient(): OpenAI {
  const apiKey =
    process.env.OPENAI_API_KEY?.trim()
    || process.env.AI_INTEGRATIONS_OPENAI_API_KEY?.trim();

  const baseURL =
    process.env.OPENAI_BASE_URL?.trim()
    || process.env.AI_INTEGRATIONS_OPENAI_BASE_URL?.trim()
    || undefined;

  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY must be set (or AI_INTEGRATIONS_OPENAI_API_KEY when routing through a proxy).",
    );
  }

  return new OpenAI({
    apiKey,
    ...(baseURL ? { baseURL } : {}),
  });
}

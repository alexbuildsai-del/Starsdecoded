import OpenAI from "openai";

// Prefer a plain OpenAI key talking to api.openai.com. The
// AI_INTEGRATIONS_OPENAI_* pair is Replit's provisioned proxy and is still
// honoured so an existing deployment keeps working unchanged; setting a
// base URL is otherwise optional and only needed to route through a proxy
// or an OpenAI-compatible gateway.
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

export const openai = new OpenAI({
  apiKey,
  ...(baseURL ? { baseURL } : {}),
});

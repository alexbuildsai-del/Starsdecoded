/**
 * The override families a prompt version bump clears (R-7.3). An override
 * written against an earlier version targets a contract that no longer
 * exists. Each family's bump clears its own overrides: natal, pair, Timeline's
 * readings and Ask. Every `:system` row of the four embeds the style contract,
 * the readings' `timeline:` and Ask's `ask:` rows too, so the system family
 * follows the natal version and a natal bump clears every one of them, while a
 * pair, timeline or ask `:user` override survives it (ADR-104). The version
 * seen last lives in a `__` row per family. Takes the versions as arguments
 * and imports nothing, so a test reads it without a database.
 */
export interface PromptFamily {
  key: string;
  like: string;
  version: string;
  label: string;
}

export interface PromptVersions {
  natal: string;
  pair: string;
  timeline: string;
  ask: string;
}

export function promptFamilies({ natal, pair, timeline, ask }: PromptVersions): PromptFamily[] {
  return [
    { key: "__prompt_version", like: "natal:%", version: natal, label: "natal" },
    { key: "__pair_prompt_version", like: "pair:%", version: pair, label: "pair" },
    { key: "__timeline_prompt_version", like: "timeline:%", version: timeline, label: "timeline" },
    { key: "__ask_prompt_version", like: "ask:%", version: ask, label: "ask" },
    { key: "__system_prompt_version", like: "%:system", version: natal, label: "system" },
  ];
}

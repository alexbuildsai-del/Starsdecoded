/**
 * The override families a prompt version bump clears (R-7.3). An override
 * written against an earlier version targets a contract that no longer
 * exists. A natal bump clears the natal overrides and a pair bump the pair
 * ones; every `:system` row, natal and pair, embeds the style contract, so a
 * natal bump also clears them across both families while a pair `:user`
 * override survives (ADR-104). The version seen last lives in a `__` row per
 * family. Takes the versions as arguments and imports nothing, so a test
 * reads it without a database.
 */
export interface PromptFamily {
  key: string;
  like: string;
  version: string;
  label: string;
}

export function promptFamilies(natal: string, pair: string): PromptFamily[] {
  return [
    { key: "__prompt_version", like: "natal:%", version: natal, label: "natal" },
    { key: "__pair_prompt_version", like: "pair:%", version: pair, label: "pair" },
    { key: "__system_prompt_version", like: "%:system", version: natal, label: "system" },
  ];
}

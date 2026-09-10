export type AppEnv = "development" | "staging" | "production";

const APP_ENVS: readonly AppEnv[] = ["development", "staging", "production"];

function asAppEnv(value: string | undefined): AppEnv | null {
  return (APP_ENVS as readonly string[]).includes(value ?? "") ? (value as AppEnv) : null;
}

// APP_ENV is set explicitly on each Railway environment. Railway also names
// its environments, so a service that forgot the variable still reports the
// right thing as long as the environment is called staging or production.
export function readAppEnv(env: NodeJS.ProcessEnv = process.env): AppEnv {
  return asAppEnv(env.APP_ENV) ?? asAppEnv(env.RAILWAY_ENVIRONMENT_NAME) ?? "development";
}

// Railway injects the deployed commit; the smoke check compares it with the
// sha it just pushed so a green health check cannot come from the previous
// build still serving.
export function readCommitSha(env: NodeJS.ProcessEnv = process.env): string | null {
  return env.RAILWAY_GIT_COMMIT_SHA || null;
}

// Explicit rather than derived from APP_ENV: flipping one variable in the
// Railway dashboard re-enables editing on production during an incident
// without a code change.
export function readPromptsReadOnly(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.PROMPTS_READ_ONLY === "true";
}

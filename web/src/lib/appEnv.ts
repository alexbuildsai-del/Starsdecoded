export type AppEnv = "development" | "staging" | "production";

const raw = import.meta.env.VITE_APP_ENV;

// Inlined at build time by vite.config.ts from VERCEL_ENV, so a preview build
// can never claim to be production.
export const APP_ENV: AppEnv =
  raw === "staging" || raw === "production" ? raw : "development";

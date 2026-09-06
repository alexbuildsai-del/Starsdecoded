import { pgTable, text, timestamp, jsonb, uniqueIndex } from "drizzle-orm/pg-core";

export const meaningLibraryTable = pgTable(
  "meaning_library",
  {
    id: text("id").primaryKey(),
    kind: text("kind").notNull(),
    key: text("key").notNull(),
    payload: jsonb("payload").notNull(),
    promptVersion: text("prompt_version").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("meaning_library_kind_key_idx").on(t.kind, t.key)],
);

export type MeaningLibraryEntry = typeof meaningLibraryTable.$inferSelect;
export type InsertMeaningLibraryEntry = typeof meaningLibraryTable.$inferInsert;

export type MeaningKind =
  | "planet_sign"
  | "planet_house"
  | "aspect"
  | "ascendant_sign"
  | "midheaven_sign"
  | "synastry_aspect";

export interface SynastryAspectPayload {
  dynamic: string;
  inFlow: string;
  underStress: string;
  growth: string;
}

export interface PlanetSignPayload {
  summary: string;
}

export interface PlanetHousePayload {
  summary: string;
}

export interface AscendantSignPayload {
  summary: string;
}

export interface MidheavenSignPayload {
  summary: string;
}

export interface AspectPayload {
  dynamic: string;
  tension: string;
  behavior: string;
  growth: string;
  // Newer aspect entries split the behavioral facet into three explicit
  // fields. Older entries omit these — callers should fall back to `behavior`.
  inFlow?: string;
  underStress?: string;
  inConflict?: string;
}

export type MeaningPayload =
  | PlanetSignPayload
  | PlanetHousePayload
  | AspectPayload
  | AscendantSignPayload
  | MidheavenSignPayload
  | SynastryAspectPayload;

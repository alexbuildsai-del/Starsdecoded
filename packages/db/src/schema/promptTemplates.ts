import { pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const promptTemplatesTable = pgTable(
  "prompt_templates",
  {
    id: text("id").primaryKey(),
    category: text("category").notNull(),
    subcategory: text("subcategory").notNull(),
    promptKey: text("prompt_key").notNull(),
    systemPrompt: text("system_prompt"),
    userPrompt: text("user_prompt"),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("prompt_templates_key_idx").on(t.promptKey)],
);

export type PromptTemplate = typeof promptTemplatesTable.$inferSelect;
export type InsertPromptTemplate = typeof promptTemplatesTable.$inferInsert;

export type PromptCategory = "natal" | "synastry" | "meaning_library";

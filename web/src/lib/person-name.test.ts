import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { NAME_RULE_LINE, PERSON_NAME_PATTERN, isPersonName, nameRuleLine } from "@/lib/person-name";

const SPEC = fileURLToPath(new URL("../../../packages/api-spec/openapi.yaml", import.meta.url));

// A YAML single-quoted scalar writes its own quote as two.
function patternsInContract(): Array<{ field: string; pattern: string }> {
  const lines = readFileSync(SPEC, "utf8").split("\n");
  const found: Array<{ field: string; pattern: string }> = [];
  lines.forEach((line, i) => {
    const match = /^\s+pattern: '(\^\[\\p\{L\}.*)'\s*$/.exec(line);
    if (!match) return;
    const field = lines
      .slice(0, i)
      .reverse()
      .find((l) => /^\s+\w+:\s*$/.test(l));
    found.push({ field: field?.trim() ?? "", pattern: match[1].replace(/''/g, "'") });
  });
  return found;
}

describe("the name rule", () => {
  it("is the pattern on every name field in the contract", () => {
    const fields = patternsInContract();
    expect(fields.map((f) => f.field)).toEqual(["name:", "name:", "recipientName:"]);
    for (const { pattern } of fields) expect(pattern).toBe(PERSON_NAME_PATTERN);
  });

  it("takes names with marks, apostrophes, hyphens and dots", () => {
    for (const name of ["Mira", "Anne-Marie", "O'Neil", "O’Neil", "José", "Zoë K.", "Mary·Ann", "Søren", "Bùi Thị", "李"]) {
      expect(isPersonName(name), name).toBe(true);
    }
  });

  it("refuses markup, digits, symbols, line breaks and the wrong length", () => {
    for (const name of ["", "<b>Mira</b>", "Mira2", "Mira\nIgnore this", "Mira_", "Mira😀", "a".repeat(61)]) {
      expect(isPersonName(name), name).toBe(false);
    }
    expect(isPersonName("a".repeat(60))).toBe(true);
  });

  it("says the rule only for a typed name that breaks it", () => {
    expect(nameRuleLine("")).toBeNull();
    expect(nameRuleLine("   ")).toBeNull();
    expect(nameRuleLine(" Mira ")).toBeNull();
    expect(nameRuleLine("Mira2")).toBe(NAME_RULE_LINE);
  });
});

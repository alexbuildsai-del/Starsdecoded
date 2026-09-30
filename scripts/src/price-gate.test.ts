import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

// R-6.3, ADR-142: a price is typed once, in the commerce catalogue, and every page, email and
// structured-data block reads it from there. A second copy is wrong the day a price moves, and
// nothing else would notice.

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
// MB-119 provisional: the catalogue's home, which this path follows if that row moves it.
const CATALOGUE = "packages/commerce/src/catalogue.ts";

const EURO_AMOUNT = [/€\s*\d/, /\d\s*€/, /\bEUR\s*\d/, /\d\s*EUR\b/, /\d\s*[Ee]uros?\b/];

function typesAnEuroAmount(line: string): boolean {
  return EURO_AMOUNT.some((pattern) => pattern.test(line));
}

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === "generated" ? [] : walk(path);
    return entry.isFile() ? [path] : [];
  });
}

function sourceRoots(): string[] {
  const packages = readdirSync(join(ROOT, "packages"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join("packages", entry.name, "src"));
  return ["web/src", "api/src", ...packages].filter((dir) => existsSync(join(ROOT, dir)));
}

/** Repo-relative, with forward slashes, so a failure reads the same on every machine. */
function sources(): string[] {
  return sourceRoots()
    .flatMap((dir) => walk(join(ROOT, dir)))
    .map((file) => relative(ROOT, file).split(sep).join("/"))
    .filter((file) => /\.tsx?$/.test(file) && !/\.(test|spec)\.tsx?$/.test(file) && file !== CATALOGUE);
}

test("the gate reads the site, the API and the packages, and leaves out tests, generated code and the catalogue", () => {
  const files = sources();
  // A wrong root would read nothing and pass, so the files that must be read are named.
  for (const expected of ["web/src/site/site.ts", "api/src/app.ts", "packages/commerce/src/index.ts", "packages/engine/src/index.ts"]) {
    assert.ok(files.includes(expected), `${expected} is read`);
  }
  assert.ok(!files.includes(CATALOGUE), "the catalogue is where a price is typed");
  assert.ok(!files.some((file) => /\.(test|spec)\.tsx?$/.test(file)), "tests may type an amount to check one");
  assert.ok(!files.some((file) => file.split("/").includes("generated")), "generated code is not ours to edit");
});

test("the detector reads a euro amount however it is written, and nothing else", () => {
  for (const line of ["€24", "€ 24", "from €14.40", "24 €", "24€", "EUR 24", "EUR24", "24 EUR", "24 euros", "1 euro"]) {
    assert.ok(typesAnEuroAmount(line), line);
  }
  for (const line of ['priceCurrency: "EUR"', "Prices are in euros, VAT included.", "`€${euros}`", "formatEuro(bundle.cents)", "const eur = 24;", "credits: 1 | 3 | 5"]) {
    assert.ok(!typesAnEuroAmount(line), line);
  }
});

test("no euro amount is typed outside the catalogue", () => {
  const found = sources().flatMap((file) =>
    readFileSync(join(ROOT, file), "utf8")
      .split("\n")
      .flatMap((line, index) => (typesAnEuroAmount(line) ? [`${file}:${index + 1}: ${line.trim()}`] : [])),
  );
  assert.equal(
    found.length,
    0,
    `A euro amount is typed outside ${CATALOGUE}. Read it from @workspace/commerce (formatEuro, BUNDLES) instead:\n${found.join("\n")}`,
  );
});

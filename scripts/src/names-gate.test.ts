import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

// ADR-170, 181, 182 (review-01-10, scope 1): the product is named once, in web/src/lib/product.ts, and a
// name the Owner retired does not come back in a string a reader sees. Like the price gate this reads the
// source, so a name that returns fails here before a page shows it. Public pages still say "natal chart",
// the words people search with, so that is not a retired name.

const ROOT = fileURLToPath(new URL("../../", import.meta.url));

interface Retired {
  name: string;
  /** Whitespace is `\s+`, so a name broken across two lines of JSX text still reads as one. */
  pattern: RegExp;
  use: string;
}

const RETIRED: readonly Retired[] = [
  { name: "Personal natal report", pattern: /personal\s+natal\s+reports?/i, use: "Personal report (PERSONAL_REPORT)" },
  { name: "One report", pattern: /\bone\s+report\b/i, use: "the credit line (CREDIT_LINE), or name the report" },
  { name: "Someone and the two of you", pattern: /someone\s+and\s+the\s+two\s+of\s+you/i, use: "Compatibility report" },
  // Also catches "Your people and how you fit" and "Your people, then how you fit".
  { name: "Your People", pattern: /\byour\s+people\b/i, use: "Your circle" },
  // A hyphen or a slash beside it, or a dot and an extension after it, makes it a class, a data attribute or a file name.
  { name: "orbit", pattern: /(?<![\w/.-])orbit\w*(?![\w-]|\.\w)/i, use: "circle" },
  // Capitalised, as the control was: "Data we send to a company" is a sentence, not the label.
  { name: "Send to", pattern: /\bSend\s+to\b/, use: "Share with {name}" },
  { name: "Sent · waiting", pattern: /\bsent\s+·\s+waiting\b/i, use: "Shared · waiting for {name} (sharedWaiting)" },
];

function retiredIn(text: string): Retired[] {
  return RETIRED.filter(({ pattern }) => pattern.test(text));
}

/** What an element is called or styled by, so what it holds is a hook and not words. */
const HOOK_ATTRIBUTE = /^(className|class|id|key|ref|htmlFor)$|^data-/;

interface Text {
  /** Offset of the first character in the file, so a hit names its own line. */
  at: number;
  /** As written in the source, quotes and all. */
  text: string;
}

function isCode(node: ts.StringLiteral): boolean {
  const { parent } = node;
  return (
    ts.isImportDeclaration(parent) ||
    ts.isExportDeclaration(parent) ||
    ts.isExternalModuleReference(parent) ||
    ts.isLiteralTypeNode(parent) ||
    (ts.isCallExpression(parent) &&
      (parent.expression.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(parent.expression) && parent.expression.text === "require"))) ||
    (ts.isElementAccessExpression(parent) && parent.argumentExpression === node) ||
    (parent as { name?: ts.Node }).name === node
  );
}

/** Every string literal, template piece and run of JSX text in a file. Comments are not nodes, so none is read. */
function readable(file: string, source: string): Text[] {
  const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const found: Text[] = [];
  const add = (from: number, to: number) => found.push({ at: from, text: source.slice(from, to) });
  const visit = (node: ts.Node): void => {
    if (ts.isJsxAttribute(node) && HOOK_ATTRIBUTE.test(node.name.getText(sourceFile))) return;
    if (ts.isStringLiteral(node)) {
      if (!isCode(node)) add(node.getStart(sourceFile), node.end);
    } else if (ts.isNoSubstitutionTemplateLiteral(node) || ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node)) {
      add(node.getStart(sourceFile), node.end);
    } else if (ts.isJsxText(node)) {
      if (!node.containsOnlyTriviaWhiteSpaces) add(node.pos, node.end);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return found;
}

interface Hit {
  file: string;
  line: number;
  retired: Retired;
  shown: string;
}

function hitsIn(file: string, source: string): Hit[] {
  const lines = source.split("\n");
  return readable(file, source).flatMap(({ at, text }) =>
    RETIRED.flatMap((retired) =>
      // Every occurrence, so a second one in the same paragraph does not wait for the first to be fixed.
      [...text.matchAll(new RegExp(retired.pattern.source, `${retired.pattern.flags}g`))].map((match) => {
        const line = source.slice(0, at + match.index).split("\n").length;
        return { file, line, retired, shown: lines[line - 1].trim() };
      }),
    ),
  );
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
    .filter((file) => /\.tsx?$/.test(file) && !/\.(test|spec)\.tsx?$/.test(file));
}

test("the gate reads the site, the API and the packages, and leaves out tests and generated code", () => {
  const files = sources();
  // A wrong root would read nothing and pass, so the files that must be read are named.
  for (const expected of [
    "web/src/site/site.ts",
    "web/src/pages/legal/TermsPage.tsx",
    "api/src/app.ts",
    "packages/commerce/src/catalogue.ts",
    "packages/engine/src/index.ts",
  ]) {
    assert.ok(files.includes(expected), `${expected} is read`);
  }
  assert.ok(!files.some((file) => /\.(test|spec)\.tsx?$/.test(file)), "a test may name a retired name to check it is gone");
  assert.ok(!files.some((file) => file.split("/").includes("generated")), "generated code is not ours to edit");
});

test("the detector names each retired name however it is cased or broken across lines, and nothing else", () => {
  const names = (text: string) => retiredIn(text).map((retired) => retired.name);
  assert.deepEqual(names("Your Personal natal report, for Sam"), ["Personal natal report"]);
  assert.deepEqual(names("both their personal natal reports"), ["Personal natal report"]);
  assert.deepEqual(names("When you send someone their Personal\n          natal report"), ["Personal natal report"]);
  assert.deepEqual(names("1 credit · one report"), ["One report"]);
  assert.deepEqual(names("One report"), ["One report"]);
  assert.deepEqual(names("Someone and the two of you"), ["Someone and the two of you"]);
  for (const line of ["Your People", "Your people", "Your people and how you fit", "Your people, then how you fit"]) {
    assert.deepEqual(names(line), ["Your People"], line);
  }
  for (const line of ["Open the gift on your orbit", "Orbit", "an orbit.", "the sample orbits", "(orbit)"]) {
    assert.deepEqual(names(line), ["orbit"], line);
  }
  assert.deepEqual(names("Send to Beatrice"), ["Send to"]);
  assert.deepEqual(names("Sent · waiting for Mamca"), ["Sent · waiting"]);

  for (const line of [
    "Personal report",
    "A Personal report and a Compatibility report",
    "1 credit = 1 report of either kind.",
    "a Personal report or a Compatibility report",
    "Add someone to your circle",
    "Add the people you care about",
    "the people in your circle",
    "Your natal chart, computed",
    "[data-orbit-id=",
    "orbit-pop",
    "orbit.css",
    "@/lib/orbit",
    "components/dashboard/Orbit",
    "Share with Beatrice",
    "Shared · waiting for Mamca",
    "We'll send you a link to confirm your email.",
    "Data we send to a company in the United States",
    "Gift sent to Sam",
  ]) {
    assert.deepEqual(names(line), [], line);
  }
});

test("the reader's text is every string, template piece and run of JSX text, and not an import, a type, a key, a class, an id or a comment", () => {
  const source = [
    'import { Orbit } from "@/components/dashboard/Orbit";',
    'import("./orbit");',
    "// the orbit draws its points",
    "/* Your People */",
    'type Kind = "orbit" | "gift";',
    'const props = { "orbit": 1, title: "Your circle" };',
    'const found = [].find((p) => p["orbit"]);',
    "const label = `Open the ${what} on your orbit`;",
    "export const A = () => (",
    '  <p className="orbit" id="orbit" data-orbit-id="x" title="Add someone">',
    "    Open your orbit",
    '    <b className={cn("orbit-hit")}>Send to Sam</b>',
    "  </p>",
    ");",
  ].join("\n");
  const seen = readable("sample.tsx", source).map(({ text }) => text.trim());
  assert.deepEqual(seen, ['"Your circle"', "`Open the ${", "} on your orbit`", '"Add someone"', "Open your orbit", "Send to Sam"]);
});

test("a hit names its file and the line the name is on, in text that runs over several lines", () => {
  const source = ["export const A = () => (", "  <p>", "    Add the people you care about.", "    Your", "    People are here.", "  </p>", ");"].join("\n");
  const [hit, ...rest] = hitsIn("sample.tsx", source);
  assert.equal(rest.length, 0);
  assert.equal(hit.retired.name, "Your People");
  assert.equal(hit.line, 4);
  assert.equal(hit.shown, "Your");
});

test("no retired name is in a string a reader sees", () => {
  const found = sources().flatMap((file) =>
    hitsIn(file, readFileSync(join(ROOT, file), "utf8")).map(
      ({ line, retired, shown }) => `${file}:${line}: "${retired.name}" (say ${retired.use}) in: ${shown}`,
    ),
  );
  assert.equal(
    found.length,
    0,
    `A name the Owner retired is in a string a reader sees. Use the current name; a comment, a class or an identifier may keep it:\n${found.join("\n")}`,
  );
});

// MB-119 provisional: the catalogue's home, which this path follows if that row moves it.
test("the catalogue, which cannot import web/, spells the two reports as product.ts does", () => {
  const product = readFileSync(join(ROOT, "web/src/lib/product.ts"), "utf8");
  const personal = /PERSONAL_REPORT = "([^"]+)"/.exec(product)?.[1];
  const compatibility = /COMPATIBILITY_REPORT = "([^"]+)"/.exec(product)?.[1];
  assert.ok(personal && compatibility, "product.ts's two names were read");
  const catalogue = readFileSync(join(ROOT, "packages/commerce/src/catalogue.ts"), "utf8");
  const mixes = [...catalogue.matchAll(/^\s*mixes: \[(.*)\],$/gm)].flatMap((row) => [...row[1].matchAll(/"([^"]+)"/g)].map((mix) => mix[1]));
  assert.equal(mixes.length, 6, "the three bundles' six example mixes were read");
  for (const mix of mixes) assert.match(mix, new RegExp(`^\\d+ (${personal}|${compatibility})s?$`), `${mix} uses product.ts's names`);
});

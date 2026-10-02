import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

// ADR-192, R-0.4, R-13.1 (agent-roster scope 8): what should never ship fails CI with file and line. Shipped
// code is api/src, web/src and packages/*/src, less tests, the test*.ts helpers, api/src/walk/, fixtures and
// generated files; tooling (scripts/, web/scripts/) prints by design. console.log and localhost are read in
// code, not comments, so a doc example or a note that names them passes; TODO and "Astra" are read anywhere,
// because a comment is where they hide.

export type Rule = "console-log" | "localhost" | "todo" | "astra" | "web-imports-api";

export interface Finding {
  file: string;
  line: number;
  rule: Rule;
  message: string;
}

interface Exception {
  file: string;
  rule: Rule;
  /** Lines the file may carry before the rule fires; a count keeps a second one from hiding behind the first. */
  lines: number;
  reason: string;
}

// The one table of exceptions; the sentinel reads it, so a new row needs a reason a reader can judge.
export const EXCEPTIONS: readonly Exception[] = [
  { file: "api/src/lib/waitlist.ts", rule: "localhost", lines: 1, reason: "Dev fallback to the local web origin when no public URL is set." },
  { file: "api/src/routes/invites.ts", rule: "localhost", lines: 1, reason: "Dev fallback to the local web origin when no public URL is set." },
  { file: "api/src/routes/gifts.ts", rule: "localhost", lines: 1, reason: "Dev fallback to the local web origin when no public URL is set." },
  { file: "api/src/lib/qaAgent/personas.ts", rule: "astra", lines: 1, reason: "The QA agent looks for the retired name on staging pages." },
  { file: "api/src/lib/qaAgent/reader.ts", rule: "astra", lines: 1, reason: "The QA agent's prompt names the retired name it looks for." },
];

const CODE = /\.(?:[cm]?[jt]sx?)$/;
const SKIPPED_DIRS = new Set(["node_modules", "dist", "dist-ssr", "build", ".git", "generated", "fixtures", "__fixtures__", "walk"]);

const isTest = (name: string): boolean => /\.(?:test|spec)\.[cm]?[jt]sx?$/.test(name) || /^test(?:[A-Z._-]|$)/.test(name) || name.endsWith(".d.ts");

function* walk(dir: string, skipDirs: ReadonlySet<string>): Generator<string> {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!skipDirs.has(entry.name)) yield* walk(full, skipDirs);
    } else if (CODE.test(entry.name) && !isTest(entry.name)) {
      yield full;
    }
  }
}

function shippedFiles(root: string): string[] {
  const roots = [join(root, "api", "src"), join(root, "web", "src")];
  const packages = join(root, "packages");
  if (existsSync(packages)) {
    for (const p of readdirSync(packages)) roots.push(join(packages, p, "src"));
  }
  return roots.flatMap((r) => [...walk(r, SKIPPED_DIRS)]);
}

/** The text with every comment blanked to spaces, so lines and columns stay where they were. */
export function withoutComments(text: string, fileName: string): string {
  const kind = /\.[cm]?[jt]sx$/.test(fileName) ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const source = ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, false, kind);
  const chars = text.split("");
  const blank = (pos: number, end: number): void => {
    for (let i = pos; i < end; i++) if (chars[i] !== "\n" && chars[i] !== "\r") chars[i] = " ";
  };
  const seen = new Set<number>();
  const visit = (node: ts.Node): void => {
    if (node.getChildCount(source) === 0) {
      // Comments are the trivia before a token; TypeScript calls the ones on the previous token's line trailing
      // and the rest leading, and the end-of-file token carries the last ones.
      if (!seen.has(node.pos)) {
        seen.add(node.pos);
        for (const r of ts.getTrailingCommentRanges(text, node.pos) ?? []) blank(r.pos, r.end);
        for (const r of ts.getLeadingCommentRanges(text, node.pos) ?? []) blank(r.pos, r.end);
      }
      return;
    }
    for (const child of node.getChildren(source)) visit(child);
  };
  visit(source);
  return chars.join("");
}

const lineOf = (text: string, index: number): number => {
  let line = 1;
  for (let i = 0; i < index; i++) if (text.charCodeAt(i) === 10) line++;
  return line;
};

function scanLines(text: string, pattern: RegExp, hit: (line: number, text: string) => boolean = () => true): number[] {
  const lines: number[] = [];
  text.split("\n").forEach((l, i) => {
    if (pattern.test(l) && hit(i + 1, l)) lines.push(i + 1);
  });
  return lines;
}

const API_PACKAGE = "@workspace/api-server";

function webImportsOfApi(file: string, root: string, code: string): number[] {
  const hits: number[] = [];
  const re = /(?:\bfrom|\bimport|\brequire)\s*\(?\s*["']([^"']+)["']/g;
  const apiDir = join(root, "api") + sep;
  for (let m = re.exec(code); m; m = re.exec(code)) {
    const spec = m[1];
    const into = spec.startsWith(".") ? resolve(dirname(file), spec) + sep : "";
    if (spec === API_PACKAGE || spec.startsWith(`${API_PACKAGE}/`) || /^api\//.test(spec) || (into && into.startsWith(apiDir))) {
      hits.push(lineOf(code, m.index + m[0].indexOf(spec)));
    }
  }
  return hits;
}

export function checkShipped(root: string): { findings: Finding[]; unused: Exception[] } {
  const raw: Finding[] = [];
  const add = (file: string, lines: number[], rule: Rule, message: string): void => {
    for (const line of lines) raw.push({ file, line, rule, message });
  };

  for (const abs of shippedFiles(root)) {
    const file = relative(root, abs).split(sep).join("/");
    const text = readFileSync(abs, "utf8");
    const code = withoutComments(text, abs);
    add(file, scanLines(code, /\bconsole\s*\.\s*log\s*\(/), "console-log", "console.log call; use the logger");
    add(file, scanLines(code, /\blocalhost\b|127\.0\.0\.1/), "localhost", "localhost or 127.0.0.1 in shipped code");
    add(file, scanLines(text, /\bTODO\b/, (_n, l) => !/\bMB-\d+/.test(l)), "todo", "TODO without an MB-NN ref");
    add(file, scanLines(text, /\bAstra\b/), "astra", 'the retired name "Astra"');
    if (file.startsWith("web/")) add(file, webImportsOfApi(abs, root, code), "web-imports-api", "web/ imports from api/");
  }

  // The web cannot import api/, tests and tooling included, so this rule also reads web/ outside src.
  const webOnly = join(root, "web");
  for (const abs of walk(webOnly, new Set([...SKIPPED_DIRS, "src"]))) {
    const file = relative(root, abs).split(sep).join("/");
    add(file, webImportsOfApi(abs, root, withoutComments(readFileSync(abs, "utf8"), abs)), "web-imports-api", "web/ imports from api/");
  }

  const spent = new Map<string, number>();
  const used = new Set<Exception>();
  const findings = raw.filter((f) => {
    const ex = EXCEPTIONS.find((e) => e.file === f.file && e.rule === f.rule);
    if (!ex) return true;
    const key = `${ex.file}:${ex.rule}`;
    const n = spent.get(key) ?? 0;
    if (n >= ex.lines) return true;
    spent.set(key, n + 1);
    used.add(ex);
    return false;
  });
  findings.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);
  return { findings, unused: EXCEPTIONS.filter((e) => !used.has(e) && existsSync(join(root, e.file))) };
}

function main(): void {
  const root = process.argv[2] ? resolve(process.argv[2]) : resolve(dirname(fileURLToPath(import.meta.url)), "..");
  if (!statSync(root).isDirectory()) throw new Error(`${root} is not a directory`);
  const { findings, unused } = checkShipped(root);
  for (const e of unused) console.warn(`note: exception for ${e.file} (${e.rule}) no longer fires; remove it from EXCEPTIONS`);
  if (findings.length === 0) {
    console.info("check-shipped: clean");
    return;
  }
  for (const f of findings) console.error(`${f.file}:${f.line}: ${f.rule}: ${f.message}`);
  console.error(`check-shipped: ${findings.length} finding${findings.length === 1 ? "" : "s"}`);
  process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main();

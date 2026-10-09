import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, posix, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

// The caller rule as a check (lessons R14 to R19): a builder changes a shared export, a pinned value or a function's
// arguments or return shape, and a caller outside the card's files stays on the old shape. This lists, for every export
// whose declaration the diff touches (or removes), the files outside the diff that import it, so the builder or the
// orchestrator reads each one. A review list, not a judge: it exits 0 unless --strict. Parse only, no program, no network.

const SCOPE = ["api/", "web/", "packages/", "scripts/", "e2e/"];
const CHANGED_EXT = /\.(?:tsx?|mts|mjs)$/;
const CODE_EXT = /\.(?:[cm]?[jt]sx?)$/;
const RESOLVE_EXT = [".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs"];
const SHOWN = 5;

interface ExportedSymbol {
  name: string;
  start: number;
  end: number;
}
interface ImportBinding {
  imported: string;
  local: string;
  spec: string;
  line: number;
  kind: "named" | "default" | "namespace";
}
interface ReExport {
  spec: string;
  /** null for `export *`. */
  imported: string | null;
  exported: string | null;
}
interface FileInfo {
  exports: ExportedSymbol[];
  imports: ImportBinding[];
  reExports: ReExport[];
}
interface Hunk {
  start: number;
  count: number;
}
interface Change {
  file: string;
  /** Null when the whole file is new or removed. */
  hunks: Hunk[];
  added: boolean;
  deleted: boolean;
}

export interface Caller {
  file: string;
  line: number;
  /** "import" is a real importer; "mention" only names the symbol (a source-reading test, a string pin). */
  how: "import" | "mention";
}
export interface SymbolReport {
  name: string;
  file: string;
  removed: boolean;
  callers: Caller[];
}
export interface Report {
  base: string;
  changedFiles: string[];
  symbols: SymbolReport[];
}

const git = (root: string, args: string[], tolerate = false): string => {
  try {
    return execFileSync("git", args, { cwd: root, encoding: "utf8", maxBuffer: 512 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"] });
  } catch (error) {
    if (tolerate) return "";
    throw error;
  }
};

function parseDiff(text: string): Change[] {
  const changes: Change[] = [];
  let current: Change | null = null;
  let inHunk = false;
  for (const line of text.split("\n")) {
    if (line.startsWith("diff --git ")) {
      const match = /^diff --git a\/(.+) b\/(.+)$/.exec(line);
      current = match ? { file: match[2]!, hunks: [], added: false, deleted: false } : null;
      if (current) changes.push(current);
      inHunk = false;
    } else if (!current) {
      continue;
    } else if (line.startsWith("@@")) {
      inHunk = true;
      const match = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/.exec(line);
      if (match) current.hunks.push({ start: Number(match[1]), count: match[2] === undefined ? 1 : Number(match[2]) });
    } else if (!inHunk) {
      if (line.startsWith("new file mode")) current.added = true;
      else if (line.startsWith("deleted file mode")) current.deleted = true;
    }
  }
  return changes;
}

function parseFile(file: string, text: string): FileInfo {
  const kind = /\.[jt]sx$/.test(file) ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, false, kind);
  const lineOf = (pos: number): number => sf.getLineAndCharacterOfPosition(pos).line + 1;
  const info: FileInfo = { exports: [], imports: [], reExports: [] };
  const mods = (node: ts.Node): readonly ts.ModifierLike[] => (ts.canHaveModifiers(node) ? (ts.getModifiers(node) ?? []) : []);
  const has = (node: ts.Node, kind: ts.SyntaxKind): boolean => mods(node).some((m) => m.kind === kind);
  const addExport = (name: string, node: ts.Node): void =>
    void info.exports.push({ name, start: lineOf(node.getStart(sf)), end: lineOf(node.getEnd()) });
  const bindingNames = (name: ts.BindingName, out: string[]): void => {
    if (ts.isIdentifier(name)) out.push(name.text);
    else for (const el of name.elements) if (!ts.isOmittedExpression(el)) bindingNames(el.name, out);
  };

  for (const stmt of sf.statements) {
    if (ts.isImportDeclaration(stmt) && ts.isStringLiteral(stmt.moduleSpecifier)) {
      const spec = stmt.moduleSpecifier.text;
      const clause = stmt.importClause;
      if (!clause) continue;
      if (clause.name) info.imports.push({ imported: "default", local: clause.name.text, spec, line: lineOf(clause.name.getStart(sf)), kind: "default" });
      const bindings = clause.namedBindings;
      if (bindings && ts.isNamespaceImport(bindings)) {
        info.imports.push({ imported: "*", local: bindings.name.text, spec, line: lineOf(bindings.getStart(sf)), kind: "namespace" });
      } else if (bindings) {
        for (const el of bindings.elements) {
          info.imports.push({ imported: (el.propertyName ?? el.name).text, local: el.name.text, spec, line: lineOf(el.getStart(sf)), kind: "named" });
        }
      }
    } else if (ts.isExportDeclaration(stmt)) {
      const spec = stmt.moduleSpecifier && ts.isStringLiteral(stmt.moduleSpecifier) ? stmt.moduleSpecifier.text : null;
      if (!stmt.exportClause) {
        if (spec) info.reExports.push({ spec, imported: null, exported: null });
      } else if (ts.isNamedExports(stmt.exportClause)) {
        for (const el of stmt.exportClause.elements) {
          const imported = (el.propertyName ?? el.name).text;
          const exported = el.name.text;
          addExport(exported, el);
          if (spec) info.reExports.push({ spec, imported, exported });
          else {
            // `import { a } from "x"; export { a }` is a re-export in disguise; resolved below against the file's imports.
            const local = info.imports.find((i) => i.local === imported && i.kind !== "namespace");
            if (local) info.reExports.push({ spec: local.spec, imported: local.imported, exported });
          }
        }
      } else if (ts.isNamespaceExport(stmt.exportClause)) {
        addExport(stmt.exportClause.name.text, stmt);
      }
    } else if (ts.isExportAssignment(stmt)) {
      if (!stmt.isExportEquals) addExport("default", stmt);
    } else if (has(stmt, ts.SyntaxKind.ExportKeyword)) {
      const isDefault = has(stmt, ts.SyntaxKind.DefaultKeyword);
      if (ts.isVariableStatement(stmt)) {
        const names: string[] = [];
        for (const d of stmt.declarationList.declarations) bindingNames(d.name, names);
        for (const n of names) addExport(n, stmt);
      } else if (
        ts.isFunctionDeclaration(stmt) || ts.isClassDeclaration(stmt) || ts.isInterfaceDeclaration(stmt) ||
        ts.isTypeAliasDeclaration(stmt) || ts.isEnumDeclaration(stmt) || ts.isModuleDeclaration(stmt)
      ) {
        if (isDefault) addExport("default", stmt);
        else if (stmt.name) addExport(stmt.name.text, stmt);
      }
    }
  }
  return info;
}

interface Pkg {
  dir: string;
  exports: unknown;
  main?: string;
}

class Resolver {
  private readonly known: Set<string>;
  private readonly pkgs = new Map<string, Pkg>();
  private readonly tsconfigs = new Map<string, { base: string; paths: Record<string, string[]> } | null>();

  constructor(private readonly root: string, files: string[]) {
    this.known = new Set(files);
    for (const file of files) {
      if (!file.endsWith("package.json") && file !== "package.json") continue;
      try {
        const json = JSON.parse(readFileSync(join(root, file), "utf8")) as { name?: string; exports?: unknown; main?: string };
        if (json.name) this.pkgs.set(json.name, { dir: posix.dirname(file) === "." ? "" : posix.dirname(file), exports: json.exports, main: json.main });
      } catch {
        // A package.json that does not parse is not a workspace package this check can follow.
      }
    }
  }

  private file(candidate: string): string | null {
    const c = posix.normalize(candidate);
    if (this.known.has(c) && CODE_EXT.test(c)) return c;
    // TypeScript sources import siblings by their emitted extension.
    const stems = [c, c.replace(/\.(?:[cm]?js|jsx)$/, "")];
    for (const stem of stems) for (const ext of RESOLVE_EXT) if (this.known.has(stem + ext)) return stem + ext;
    for (const ext of RESOLVE_EXT) if (this.known.has(`${c}/index${ext}`)) return `${c}/index${ext}`;
    return null;
  }

  private tsconfigFor(from: string): { base: string; paths: Record<string, string[]> } | null {
    let dir = posix.dirname(from);
    for (;;) {
      const cfg = dir === "." ? "tsconfig.json" : `${dir}/tsconfig.json`;
      if (this.known.has(cfg) || existsSync(join(this.root, cfg))) {
        if (!this.tsconfigs.has(cfg)) {
          const read = ts.readConfigFile(join(this.root, cfg), ts.sys.readFile);
          const options = (read.config?.compilerOptions ?? {}) as { paths?: Record<string, string[]>; baseUrl?: string };
          const base = options.baseUrl ? posix.join(dir === "." ? "" : dir, options.baseUrl) : dir === "." ? "" : dir;
          this.tsconfigs.set(cfg, options.paths ? { base, paths: options.paths } : null);
        }
        const found = this.tsconfigs.get(cfg);
        if (found) return found;
      }
      if (dir === "." || dir === "") return null;
      dir = posix.dirname(dir);
    }
  }

  private target(value: unknown): string | null {
    if (typeof value === "string") return value;
    if (value && typeof value === "object") {
      for (const key of ["workspace", "import", "default", "types", "require"]) {
        const found = this.target((value as Record<string, unknown>)[key]);
        if (found) return found;
      }
    }
    return null;
  }

  private pkg(spec: string): string | null {
    const parts = spec.split("/");
    const name = spec.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0]!;
    const pkg = this.pkgs.get(name);
    if (!pkg) return null;
    const sub = "." + spec.slice(name.length);
    const join2 = (p: string): string => (pkg.dir ? `${pkg.dir}/${p}` : p);
    const exportsField = pkg.exports;
    if (exportsField !== undefined && exportsField !== null) {
      const isMap = typeof exportsField === "object" && Object.keys(exportsField).some((k) => k.startsWith("."));
      const map: Record<string, unknown> = isMap ? (exportsField as Record<string, unknown>) : { ".": exportsField };
      let value = map[sub];
      if (value === undefined) {
        for (const [key, v] of Object.entries(map)) {
          const star = key.indexOf("*");
          if (star < 0 || !sub.startsWith(key.slice(0, star)) || !sub.endsWith(key.slice(star + 1))) continue;
          const filled = sub.slice(star, sub.length - (key.length - star - 1));
          const t = this.target(v);
          if (t) value = t.replace("*", filled);
        }
      }
      const t = this.target(value);
      return t ? this.file(join2(t.replace(/^\.\//, ""))) : null;
    }
    if (sub === "." && pkg.main) return this.file(join2(pkg.main.replace(/^\.\//, "")));
    return this.file(join2(sub === "." ? "index" : sub.slice(2)));
  }

  resolve(from: string, spec: string): string | null {
    if (spec.startsWith(".")) return this.file(posix.join(posix.dirname(from), spec));
    const cfg = this.tsconfigFor(from);
    if (cfg) {
      for (const [pattern, targets] of Object.entries(cfg.paths)) {
        const star = pattern.indexOf("*");
        const hit = star < 0 ? pattern === spec : spec.startsWith(pattern.slice(0, star)) && spec.endsWith(pattern.slice(star + 1));
        if (!hit) continue;
        const filled = star < 0 ? "" : spec.slice(star, spec.length - (pattern.length - star - 1));
        for (const t of targets) {
          const found = this.file(posix.join(cfg.base, t.replace("*", filled)));
          if (found) return found;
        }
      }
    }
    return spec.startsWith("@workspace/") || this.pkgs.has(spec.split("/")[0]!) ? this.pkg(spec) : null;
  }
}

export function analyze(root: string, baseRef: string, mentions = false): Report {
  const refOk = (ref: string): boolean => git(root, ["rev-parse", "--verify", "--quiet", `${ref}^{commit}`], true).trim() !== "";
  const base = [baseRef, "main", "HEAD"].find(refOk) ?? "HEAD";
  const mergeBase = git(root, ["merge-base", base, "HEAD"], true).trim() || base;

  const inScope = (f: string): boolean => SCOPE.some((s) => f.startsWith(s)) && CHANGED_EXT.test(f);
  const changes = parseDiff(git(root, ["diff", "--no-renames", "-U0", "--no-color", mergeBase, "--"])).filter((c) => inScope(c.file));
  const tracked = new Set(git(root, ["ls-files"]).split("\n").filter(Boolean));
  const untracked = git(root, ["ls-files", "-o", "--exclude-standard"]).split("\n").filter(Boolean);
  for (const file of untracked) if (inScope(file) && !changes.some((c) => c.file === file)) changes.push({ file, hunks: [], added: true, deleted: false });

  const allFiles = [...new Set([...tracked, ...untracked])].filter((f) => existsSync(join(root, f)));
  // Tooling under .claude/ and docs/ is not the product; mobile/ and the root middleware.ts are, and they import too.
  const codeFiles = allFiles.filter((f) => CODE_EXT.test(f) && !f.startsWith(".claude/") && !f.startsWith("docs/"));
  const changedSet = new Set(changes.map((c) => c.file));
  const resolver = new Resolver(root, allFiles);

  const texts = new Map<string, string>();
  const infos = new Map<string, FileInfo>();
  for (const file of codeFiles) {
    const text = readFileSync(join(root, file), "utf8");
    texts.set(file, text);
    infos.set(file, parseFile(file, text));
  }

  // What the diff changed: exports whose lines a hunk touches, plus exports the old version had and the new one lacks.
  const changed: { file: string; name: string; removed: boolean }[] = [];
  for (const change of changes) {
    const current = infos.get(change.file);
    const names = new Set(current?.exports.map((e) => e.name));
    if (current && !change.deleted) {
      for (const sym of current.exports) {
        const touched =
          change.added ||
          change.hunks.some((h) => (h.count === 0 ? sym.start <= h.start && sym.end >= h.start + 1 : h.start <= sym.end && h.start + h.count - 1 >= sym.start));
        if (touched) changed.push({ file: change.file, name: sym.name, removed: false });
      }
    }
    if (!change.added) {
      const oldText = git(root, ["show", `${mergeBase}:${change.file}`], true);
      if (oldText) {
        for (const old of parseFile(change.file, oldText).exports) if (!names.has(old.name)) changed.push({ file: change.file, name: old.name, removed: true });
      }
    }
  }
  const seen = new Set<string>();
  const unique = changed.filter((c) => !seen.has(`${c.file}\0${c.name}`) && seen.add(`${c.file}\0${c.name}`));

  // Re-exports resolved once: a hook defined in generated/api.ts is imported from the package barrel.
  const reExports: { from: string; target: string; imported: string | null; exported: string | null }[] = [];
  const importsByTarget = new Map<string, { file: string; binding: ImportBinding }[]>();
  for (const [file, info] of infos) {
    for (const r of info.reExports) {
      const target = resolver.resolve(file, r.spec);
      if (target) reExports.push({ from: file, target, imported: r.imported, exported: r.exported });
    }
    for (const binding of info.imports) {
      const target = resolver.resolve(file, binding.spec);
      if (!target) continue;
      const list = importsByTarget.get(target) ?? [];
      list.push({ file, binding });
      importsByTarget.set(target, list);
    }
  }

  const words = new Map<string, Set<string>>();
  const wordsOf = (file: string): Set<string> => {
    let set = words.get(file);
    if (!set) words.set(file, (set = new Set(texts.get(file)?.match(/[A-Za-z_$][\w$]*/g) ?? [])));
    return set;
  };

  const symbols: SymbolReport[] = unique.map(({ file, name, removed }) => {
    const exposed = new Map<string, Set<string>>([[file, new Set([name])]]);
    const expose = (f: string, n: string): boolean => {
      const set = exposed.get(f) ?? new Set<string>();
      exposed.set(f, set);
      if (set.has(n)) return false;
      set.add(n);
      return true;
    };
    for (let grew = true; grew; ) {
      grew = false;
      for (const r of reExports) {
        const there = exposed.get(r.target);
        if (!there) continue;
        if (r.imported === null) {
          for (const n of [...there]) if (n !== "default" && expose(r.from, n)) grew = true;
        } else if (there.has(r.imported) && r.exported && expose(r.from, r.exported)) grew = true;
      }
    }

    const callers = new Map<string, Caller>();
    for (const [target, names] of exposed) {
      for (const { file: importer, binding } of importsByTarget.get(target) ?? []) {
        if (importer === file || changedSet.has(importer) || callers.has(importer)) continue;
        if (binding.kind === "namespace") {
          const used = [...names].find((n) => new RegExp(`\\b${binding.local}\\s*\\.\\s*${n.replace(/\$/g, "\\$")}\\b`).test(texts.get(importer) ?? ""));
          if (used) callers.set(importer, { file: importer, line: binding.line, how: "import" });
        } else if (names.has(binding.imported)) {
          callers.set(importer, { file: importer, line: binding.line, how: "import" });
        }
      }
    }
    if (mentions && name !== "default" && name.length >= 5) {
      const pattern = new RegExp(`\\b${name.replace(/\$/g, "\\$")}\\b`);
      for (const other of codeFiles) {
        if (other === file || changedSet.has(other) || callers.has(other) || !wordsOf(other).has(name)) continue;
        const lines = (texts.get(other) ?? "").split("\n");
        const at = lines.findIndex((l) => pattern.test(l));
        callers.set(other, { file: other, line: at + 1, how: "mention" });
      }
    }
    return { name, file, removed, callers: [...callers.values()].sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line) };
  });

  return { base: `${base} (${mergeBase.slice(0, 7)})`, changedFiles: [...changedSet].sort(), symbols };
}

export function format(report: Report, all: boolean): string {
  const out: string[] = [];
  const withCallers = report.symbols.filter((s) => s.callers.length > 0);
  out.push(`check-callers: base ${report.base}, ${report.changedFiles.length} changed file(s), ${report.symbols.length} changed export(s)`);
  if (report.symbols.length === 0) {
    out.push("no shared exports changed");
    return out.join("\n");
  }
  if (withCallers.length === 0) {
    out.push("no file outside this diff imports or names a changed export");
    return out.join("\n");
  }
  const rows = withCallers.map((s) => [s.removed ? `${s.name} (removed)` : s.name, s.file]);
  const w0 = Math.max(6, ...rows.map((r) => r[0]!.length));
  const w1 = Math.max(10, ...rows.map((r) => r[1]!.length));
  out.push(`${"symbol".padEnd(w0)}  ${"defined in".padEnd(w1)}  callers outside this diff (~ = names it without importing it)`);
  withCallers.forEach((s, i) => {
    const shown = all ? s.callers : s.callers.slice(0, SHOWN);
    const label = (c: Caller): string => `${c.how === "mention" ? "~" : ""}${c.file}:${c.line}`;
    out.push(`${rows[i]![0]!.padEnd(w0)}  ${rows[i]![1]!.padEnd(w1)}  ${shown.map(label).join(", ")}${shown.length < s.callers.length ? `, +${s.callers.length - shown.length} more` : ""}`);
  });
  const quiet = report.symbols.length - withCallers.length;
  if (quiet > 0) out.push(`${quiet} other changed export(s) have no caller outside this diff`);
  return out.join("\n");
}

function main(): void {
  const args = process.argv.slice(2);
  const at = args.indexOf("--base");
  const base = at >= 0 && args[at + 1] ? args[at + 1]! : "origin/main";
  const root = git(process.cwd(), ["rev-parse", "--show-toplevel"]).trim() || resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const report = analyze(root, base, args.includes("--mentions"));
  console.log(format(report, args.includes("--all")));
  if (args.includes("--strict") && report.symbols.some((s) => s.callers.some((c) => c.how === "import"))) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main();

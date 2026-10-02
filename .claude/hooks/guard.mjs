import { execFileSync } from "node:child_process";
import { realpathSync } from "node:fs";
import { homedir } from "node:os";
import { basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// ADR-191 (agent-roster scope 7): Claude Code runs this before each guarded tool call. Exit 2 refuses the call and hands
// Claude the one line written to stderr, so each refusal says what to do instead. It catches a session's slip, not an
// attacker: a command the shell only assembles at run time is out of its sight.

const PROTECTED = ["main", "production"];
const GENERATED = /(?:^|\/)packages\/(?:api-client-react|api-zod)\/src\/generated(?:\/|$)/i;
const EDITORS = new Set(["Edit", "Write", "MultiEdit", "NotebookEdit"]);
// The GitHub connector commits to a branch without git, so its writes meet the same branch rule as a push.
const GITHUB_WRITES = /^mcp__github__(?:push_files|create_or_update_file|delete_file)$/;
const SHELLS = new Set(["sh", "bash", "zsh", "dash", "ksh", "mksh", "ash", "fish", "csh", "tcsh", "pwsh"]);
const DOWNLOADERS = new Set(["curl", "wget"]);
const BRANCH_RULE = "main changes only through a merged pull request (gh pr merge), production only through a Release (ADR-191)";
const DOWNLOAD_REASON =
  "Blocked: a curl or wget download piped into a shell runs code nobody has read; save it with curl -o, read it, then run it (ADR-191).";

export function verdict(input) {
  const tool = typeof input?.tool_name === "string" ? input.tool_name : "";
  const args = input?.tool_input ?? {};
  const cwd = typeof input?.cwd === "string" && input.cwd ? input.cwd : process.cwd();
  const reason = reasonFor(tool, args, cwd);
  return reason ? { block: true, reason: reason.replace(/\s+/g, " ") } : { block: false };
}

function reasonFor(tool, args, cwd) {
  if (EDITORS.has(tool)) return editReason(args.file_path ?? args.notebook_path, cwd);
  if (tool === "Read") return readReason(args.file_path);
  if (tool === "Grep") return readReason(args.path);
  if (tool === "Bash") return typeof args.command === "string" ? inspect(parse(args.command), { dir: cwd, depth: 0 }) : null;
  if (GITHUB_WRITES.test(tool)) return githubReason(tool, args.branch);
  return null;
}

// R-7.4 and reading 1: every `.env*` may hold a secret except `.env.example`, the committed list of names with no values.
function envFile(path) {
  const name = basename(path.replace(/\\/g, "/"));
  const lower = name.toLowerCase();
  return lower.startsWith(".env") && lower !== ".env.example" ? name : null;
}

function editReason(path, cwd) {
  if (typeof path !== "string" || !path) return null;
  const env = envFile(path);
  if (env) {
    return (
      `Blocked: ${env} is an env file; secrets live only in the Railway, Vercel and Supabase dashboards, ` +
      "and .env.example, the names with no values, is the one env file to edit (R-7.4, ADR-191)."
    );
  }
  const generated = GENERATED.exec(resolve(cwd, path.replace(/\\/g, "/")));
  if (!generated) return null;
  return (
    `Blocked: ${generated[0].replace(/^\//, "")} is written by codegen; change packages/api-spec/openapi.yaml, ` +
    "then run pnpm --filter @workspace/api-spec run codegen (R-7.2, ADR-191)."
  );
}

function readReason(path) {
  const env = typeof path === "string" ? envFile(path) : null;
  if (!env) return null;
  return `Blocked: ${env} may hold secrets and is never read in a session; .env.example lists every variable (R-7.4, ADR-191).`;
}

function githubReason(tool, branch) {
  const name = typeof branch === "string" ? branch.replace(/^refs\/heads\//, "") : "";
  return PROTECTED.includes(name.toLowerCase()) ? `Blocked: ${tool} would write to ${name} on GitHub; ${BRANCH_RULE}.` : null;
}

// Commands are split as the shell splits them, so a commit message or a here-document that mentions `git push` stays text,
// while `cd repo && git push`, `bash -c '…'` and `$(…)` are each read as the commands they run.

// Longest first, so `&&` is never read as two `&`, nor `<<<` as a here-document.
const OPERATORS = [
  "&>>", "<<<", "<<-", ";;&", "&&", "||", ";;", ";&", "|&", "&>", "<<", ">>", "<>", ">|", "<&", ">&",
  ";", "&", "|", "(", ")", "<", ">",
];
const REDIRECTS = new Set(["&>>", "<<<", "<<-", "&>", "<<", ">>", "<>", ">|", "<&", ">&", "<", ">"]);

function parse(src) {
  return parseList({ src, pos: 0 }, null);
}

function parseList(p, closer) {
  const list = [];
  const heredocs = [];
  let pipeline = [];
  let command = newCommand();
  const endCommand = () => {
    pipeline.push(command);
    command = newCommand();
  };
  for (let token = lex(p); token; token = lex(p)) {
    if (token.op === ")") {
      if (closer === ")") break;
    } else if (token.op === "(") {
      const group = parseList(p, ")");
      if (isBlank(command)) Object.assign(command, { group, subshell: true });
      else command.subs.push({ list: group });
      command.header ||= command.words.length === 1;
    } else if (token.op === "|" || token.op === "|&") {
      endCommand();
    } else if (token.op) {
      endCommand();
      list.push(pipeline);
      pipeline = [];
      if (token.op === "\n") readHeredocs(p, heredocs);
    } else if (token.redirect) {
      skipBlanks(p);
      const target = readWord(p);
      if (token.redirect === "<<" || token.redirect === "<<-") {
        heredocs.push({ delimiter: target.text, strip: token.redirect === "<<-", literal: target.quoted, owner: command });
      } else {
        command.subs.push(...target.subs);
        if (token.redirect === "<" || token.redirect === "<<<") command.stdin = target;
      }
    } else if (closer === "}" && isBlank(command) && isBare(token.word, "}")) {
      break;
    } else if ((isBlank(command) || command.header) && isBare(token.word, "{")) {
      // A function's body is read where it is defined, since a call later in the line runs it.
      Object.assign(command, { group: parseList(p, "}"), words: [], header: false });
    } else {
      command.header ||= command.words.length === 1 && isBare(command.words[0], "function");
      command.words.push(token.word);
      command.subs.push(...token.word.subs);
    }
  }
  endCommand();
  list.push(pipeline);
  return list;
}

function newCommand() {
  return { words: [], subs: [], group: null, subshell: false, stdin: null, header: false };
}

function isBlank(command) {
  return command.words.length === 0 && !command.group;
}

function isBare(word, text) {
  return Boolean(word) && !word.quoted && !word.dynamic && word.text === text;
}

function lex(p) {
  skipBlanks(p);
  const { src } = p;
  if (p.pos >= src.length) return null;
  if (src[p.pos] === "\n") {
    p.pos++;
    return { op: "\n" };
  }
  if (/^[<>]\(/.test(src.slice(p.pos, p.pos + 2))) return { word: readWord(p) };
  const fd = /^(?:\d+|\{\w+\})(?=[<>])/.exec(src.slice(p.pos, p.pos + 64));
  const at = p.pos + (fd ? fd[0].length : 0);
  const op = OPERATORS.find((candidate) => src.startsWith(candidate, at));
  if (!op) return { word: readWord(p) };
  p.pos = at + op.length;
  return REDIRECTS.has(op) ? { redirect: op } : { op };
}

function skipBlanks(p) {
  const { src } = p;
  while (p.pos < src.length) {
    const c = src[p.pos];
    if (c === " " || c === "\t" || c === "\r") p.pos++;
    else if (c === "\\" && src[p.pos + 1] === "\n") p.pos += 2;
    else if (c === "#") while (p.pos < src.length && src[p.pos] !== "\n") p.pos++;
    else break;
  }
}

function readWord(p) {
  const { src } = p;
  const word = { text: "", quoted: false, dynamic: false, subs: [] };
  if (/^[<>]\(/.test(src.slice(p.pos, p.pos + 2))) {
    const start = p.pos;
    p.pos += 2;
    word.subs.push({ list: parseList(p, ")") });
    return Object.assign(word, { text: src.slice(start, p.pos), dynamic: true });
  }
  while (p.pos < src.length) {
    const c = src[p.pos];
    if (" \t\r\n;&|()<>".includes(c)) break;
    if (c === "\\") {
      if (src[p.pos + 1] !== "\n") word.text += src[p.pos + 1] ?? "";
      word.quoted = true;
      p.pos += 2;
    } else if (c === "'") {
      const end = src.indexOf("'", p.pos + 1);
      const stop = end < 0 ? src.length : end;
      word.text += src.slice(p.pos + 1, stop);
      word.quoted = true;
      p.pos = stop + 1;
    } else if (c === '"') {
      p.pos++;
      readQuoted(p, word, '"');
      word.quoted = true;
    } else if (c === "$" && src[p.pos + 1] === "'") {
      p.pos += 2;
      while (p.pos < src.length && src[p.pos] !== "'") {
        word.text += src[p.pos] === "\\" ? (src[++p.pos] ?? "") : src[p.pos];
        p.pos++;
      }
      p.pos++;
      word.quoted = true;
    } else if (c === "$" || c === "`") {
      readExpansion(p, word);
    } else {
      word.text += c;
      p.pos++;
    }
  }
  return word;
}

// The inside of double quotes, or of a here-document whose delimiter is unquoted (terminator null): text in which only
// `$` and backticks still expand.
function readQuoted(p, word, terminator) {
  const { src } = p;
  while (p.pos < src.length) {
    const c = src[p.pos];
    if (c === terminator) {
      p.pos++;
      return;
    }
    const next = src[p.pos + 1];
    if (c === "\\" && next !== undefined && "$`\"\\\n".includes(next)) {
      if (next !== "\n") word.text += next;
      p.pos += 2;
    } else if (c === "$" || c === "`") {
      readExpansion(p, word);
    } else {
      word.text += c;
      p.pos++;
    }
  }
}

function readExpansion(p, word) {
  const { src } = p;
  const start = p.pos;
  if (src[p.pos] === "`") {
    let inner = "";
    p.pos++;
    while (p.pos < src.length && src[p.pos] !== "`") {
      if (src[p.pos] === "\\" && "$`\\".includes(src[p.pos + 1] ?? "x")) p.pos++;
      inner += src[p.pos++];
    }
    p.pos++;
    word.subs.push({ list: parse(inner) });
  } else if (src.startsWith("$((", p.pos)) {
    skipBalanced(p, "(", ")");
  } else if (src.startsWith("$(", p.pos)) {
    p.pos += 2;
    word.subs.push({ list: parseList(p, ")") });
  } else if (src.startsWith("${", p.pos)) {
    skipBalanced(p, "{", "}");
  } else if (/[A-Za-z_]/.test(src[p.pos + 1] ?? "")) {
    p.pos++;
    while (/\w/.test(src[p.pos] ?? "")) p.pos++;
  } else if (/[0-9@*#?$!-]/.test(src[p.pos + 1] ?? "")) {
    p.pos += 2;
  } else {
    p.pos++;
    if (src[p.pos] !== '"') word.text += "$";
    return;
  }
  word.dynamic = true;
  word.text += src.slice(start, p.pos);
}

function skipBalanced(p, open, close) {
  let depth = 0;
  for (p.pos++; p.pos < p.src.length; ) {
    const c = p.src[p.pos++];
    if (c === open) depth++;
    else if (c === close && --depth === 0) return;
  }
}

// A here-document's body is data, which is why a commit message written through one may say anything; only an unquoted
// delimiter lets `$(…)` in the body run, and those substitutions are read.
function readHeredocs(p, heredocs) {
  const { src } = p;
  for (const doc of heredocs.splice(0)) {
    let body = "";
    while (p.pos < src.length) {
      const end = src.indexOf("\n", p.pos);
      const stop = end < 0 ? src.length : end;
      const line = src.slice(p.pos, stop);
      p.pos = stop + 1;
      if ((doc.strip ? line.replace(/^\t+/, "") : line) === doc.delimiter) break;
      body += `${line}\n`;
    }
    if (!doc.literal) {
      const word = { text: "", quoted: false, dynamic: false, subs: [] };
      readQuoted({ src: body, pos: 0 }, word, null);
      doc.owner.subs.push(...word.subs);
    }
  }
}

function inspect(list, context) {
  for (const pipeline of list) {
    for (let index = 0; index < pipeline.length; index++) {
      const reason = inspectCommand(pipeline, index, context);
      if (reason) return reason;
    }
    if (pipeline.length === 1) follow(pipeline[0], context);
  }
  return null;
}

function inspectCommand(pipeline, index, context) {
  const command = pipeline[index];
  if (command.group) {
    const reason = inspect(command.group, command.subshell ? { ...context } : context);
    if (reason) return reason;
  }
  for (const sub of command.subs) {
    const reason = inspect(sub.list, { ...context });
    if (reason) return reason;
  }
  const argv = commandLine(command.words);
  const name = programName(argv[0]);
  if (name === "git") {
    const git = gitCommand(argv, context.dir);
    const reason = git.subcommand === "push" ? pushReason(git.args, git.dir, context) : null;
    if (reason) return reason;
  }
  if (runsDownload(pipeline, index, argv, name)) return DOWNLOAD_REASON;
  const script = inlineScript(argv, name);
  if (script === null || context.depth >= 8) return null;
  return inspect(parse(script), { ...context, depth: context.depth + 1 });
}

// A command later in the same line runs after an earlier `cd` or checkout, so those move the repository and the branch
// it acts on before git itself has.
function follow(command, context) {
  const argv = commandLine(command.words);
  const name = programName(argv[0]);
  if (name === "cd" || name === "pushd") {
    const target = argv.slice(1).find((word) => !word.text.startsWith("-") || word.text === "-");
    context.dir = target ? resolveDir(context.dir, target) : homedir();
  } else if (name === "git") {
    const git = gitCommand(argv, context.dir);
    const branch = git.subcommand === "checkout" || git.subcommand === "switch" ? checkedOut(git.args) : undefined;
    if (branch !== undefined) context.checkout = { dir: git.dir, branch };
  }
}

// undefined when the checkout only restores files; "" when the branch it leaves cannot be told from the words.
function checkedOut(args) {
  const operands = [];
  let track = false;
  for (let i = 0; i < args.length; i++) {
    const text = args[i].text;
    if (text === "--") return undefined;
    if (["-b", "-B", "-c", "-C", "--orphan"].includes(text)) return args[i + 1]?.text ?? "";
    if (text === "-d" || text === "--detach") return "";
    track ||= text === "-t" || text.startsWith("--track");
    if (!text.startsWith("-") || text === "-") operands.push(args[i]);
  }
  if (operands.length !== 1) return undefined;
  const [target] = operands;
  if (target.dynamic || target.text === "-") return "";
  return track ? target.text.replace(/^[^/]+\//, "") : target.text;
}

function resolveDir(base, word) {
  const home = /^(?:~|\$HOME|\$\{HOME\})(?=\/|$)/.exec(word.text);
  if (home) return resolve(homedir(), `.${word.text.slice(home[0].length)}`);
  return word.dynamic || word.text === "-" ? base : resolve(base, word.text);
}

const KEYWORDS = new Set(["if", "then", "elif", "else", "fi", "do", "done", "while", "until", "!", "esac", "{", "}"]);
const HEADERS = new Set(["for", "select", "case", "function"]);
// Each wrapper runs the command after its options; the letters are its short options that take a value.
const WRAPPERS = new Map([
  ["sudo", "ugpCDhrtTUR"], ["doas", "uC"], ["env", "uCS"], ["command", ""], ["builtin", ""], ["exec", "a"], ["nohup", ""],
  ["time", ""], ["nice", "n"], ["ionice", "cnp"], ["timeout", "sk"], ["stdbuf", "ioe"], ["setsid", ""], ["busybox", ""],
]);

function commandLine(words) {
  let i = 0;
  for (;;) {
    while (i < words.length && (/^[A-Za-z_]\w*\+?=/.test(words[i].text) || (!words[i].quoted && KEYWORDS.has(words[i].text)))) i++;
    const name = programName(words[i]);
    if (HEADERS.has(name) && !words[i].quoted) return [];
    if (!WRAPPERS.has(name)) return words.slice(i);
    if (name === "command" && /^-[A-Za-z]*[vV]/.test(words[i + 1]?.text ?? "")) return [];
    const values = WRAPPERS.get(name);
    for (i++; i < words.length && /^-./.test(words[i].text); ) {
      const option = words[i++].text;
      if (option === "--") break;
      if (option.length === 2 && values.includes(option[1])) i++;
    }
    if (name === "timeout") i++;
  }
}

function programName(word) {
  return word && !word.dynamic ? basename(word.text) : "";
}

function runsDownload(pipeline, index, argv, name) {
  if (fetches(argv[0])) return true;
  if (name === "eval") return argv.slice(1).some(fetches);
  const piped = () => pipeline.slice(0, index).some(downloads) || fetches(pipeline[index].stdin);
  if (name === "source" || name === ".") return fetches(argv[1]) || (isStdin(argv[1]) && piped());
  if (!SHELLS.has(name)) return false;
  const shell = shellOperands(argv.slice(1));
  if (shell.inline) return fetches(shell.script);
  if (shell.file && !isStdin(shell.file) && !shell.stdin) return fetches(shell.file);
  return piped();
}

function downloads(command) {
  if (command.group && command.group.some((pipeline) => pipeline.some(downloads))) return true;
  if (command.subs.some((sub) => sub.list.some((pipeline) => pipeline.some(downloads)))) return true;
  return DOWNLOADERS.has(programName(commandLine(command.words)[0]));
}

function fetches(word) {
  return Boolean(word?.subs.some((sub) => sub.list.some((pipeline) => pipeline.some(downloads))));
}

function isStdin(word) {
  return word?.text === "-" || word?.text === "/dev/stdin";
}

function shellOperands(words) {
  const shell = { inline: false, stdin: false, script: null, file: null };
  for (let i = 0; i < words.length; i++) {
    const text = words[i].text;
    if (/^[-+][A-Za-z]+$/.test(text)) {
      shell.inline ||= text[0] === "-" && text.includes("c");
      shell.stdin ||= text[0] === "-" && text.includes("s");
      if (/[oO]$/.test(text)) i++;
      continue;
    }
    if (text.startsWith("--") && text !== "--") continue;
    const operand = (text === "--" ? words[i + 1] : words[i]) ?? null;
    if (shell.inline) shell.script = operand;
    else shell.file = operand;
    break;
  }
  return shell;
}

function inlineScript(argv, name) {
  if (name === "eval") return argv.slice(1).map((word) => word.text).join(" ");
  if (!SHELLS.has(name)) return null;
  const { inline, script } = shellOperands(argv.slice(1));
  return inline && script ? script.text : null;
}

const GIT_VALUE_OPTIONS = new Set(["-C", "-c", "--git-dir", "--work-tree", "--namespace", "--config-env", "--super-prefix"]);
const PUSH_VALUE_OPTIONS = new Set(["--repo", "--receive-pack", "--exec", "--push-option"]);
// What `git push origin HEAD` and its spelled-out forms update: the branch checked out.
const CURRENT_BRANCH =
  /^(?:HEAD|@|\$\(\s*git\s+(?:branch\s+--show-current|rev-parse\s+--abbrev-ref\s+HEAD|symbolic-ref\s+--short\s+HEAD)\s*\))$/;

function gitCommand(argv, dir) {
  let i = 1;
  while (i < argv.length && argv[i].text.startsWith("-")) {
    if (argv[i].text === "-C" && argv[i + 1]) dir = resolveDir(dir, argv[i + 1]);
    i += GIT_VALUE_OPTIONS.has(argv[i].text) ? 2 : 1;
  }
  return { dir, subcommand: argv[i]?.text, args: argv.slice(i + 1) };
}

function pushReason(args, dir, context) {
  let deleting = false;
  let tagsOnly = false;
  const operands = [];
  for (let i = 0; i < args.length; i++) {
    const text = args[i].text;
    if (text === "--") {
      operands.push(...args.slice(i + 1));
      break;
    }
    if (text.startsWith("--")) {
      const name = text.split("=", 1)[0];
      if (name === "--all" || name === "--branches" || name === "--mirror") {
        return `Blocked: git push ${name} sends every branch, main and production with them; push the branch by name (ADR-191).`;
      }
      deleting ||= name === "--delete";
      tagsOnly ||= name === "--tags";
      if (PUSH_VALUE_OPTIONS.has(name) && !text.includes("=")) i++;
    } else if (/^-./.test(text)) {
      const cluster = text.slice(1);
      const value = cluster.indexOf("o");
      deleting ||= (value < 0 ? cluster : cluster.slice(0, value)).includes("d");
      if (value === cluster.length - 1) i++;
    } else {
      operands.push(args[i]);
    }
  }
  const refspecs = operands.slice(1);
  if (refspecs.length === 0) return tagsOnly || deleting ? null : implicitPushReason(dir, context);
  for (let k = 0; k < refspecs.length; k++) {
    if (isBare(refspecs[k], "tag")) {
      k++;
      continue;
    }
    const reason = refspecReason(refspecs[k].text, deleting, dir, context);
    if (reason) return reason;
  }
  return null;
}

function refspecReason(text, deleting, dir, context) {
  const spec = text.replace(/^\+/, "");
  if (spec.startsWith("^")) return null;
  const colon = spec.indexOf(":");
  if (deleting || colon === 0) return protectedReason(colon < 0 ? spec : spec.slice(colon + 1), true);
  if (colon > 0) return protectedReason(spec.slice(colon + 1), false);
  return protectedReason(CURRENT_BRANCH.test(spec) ? currentBranch(dir, context) : spec, false);
}

// With no refspec, git pushes the branch checked out, to its push target when one is configured.
function implicitPushReason(dir, context) {
  const reason = protectedReason(currentBranch(dir, context), false);
  if (reason || context.checkout?.dir === dir) return reason;
  const target = /^refs\/remotes\/[^/]+\/(.+)$/.exec(git(dir, ["rev-parse", "--symbolic-full-name", "@{push}"]) ?? "");
  return target ? protectedReason(target[1], false) : null;
}

function currentBranch(dir, context) {
  return context.checkout?.dir === dir ? context.checkout.branch : git(dir, ["symbolic-ref", "--short", "-q", "HEAD"]);
}

// A ref the shell fills in at run time cannot be read here, so it passes. `heads/main` reaches main as git expands it.
function protectedReason(ref, deleting) {
  if (!ref || /[$`]/.test(ref)) return null;
  const name = ref.toLowerCase();
  const pattern = name.includes("*") ? new RegExp(`^${name.split("*").map(escapeRegExp).join(".*")}$`) : null;
  const branch = PROTECTED.find((candidate) =>
    [candidate, `heads/${candidate}`, `refs/heads/${candidate}`].some((form) => (pattern ? pattern.test(form) : form === name)),
  );
  return branch ? `Blocked: this push would ${deleting ? "delete" : "update"} ${branch}; ${BRANCH_RULE}.` : null;
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function git(dir, args) {
  try {
    const out = execFileSync("git", ["-C", dir, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], timeout: 3000 });
    return out.trim() || null;
  } catch {
    return null;
  }
}

async function main() {
  process.stdin.setEncoding("utf8");
  let raw = "";
  for await (const chunk of process.stdin) raw += chunk;
  const result = verdict(JSON.parse(raw));
  if (result.block) {
    process.stderr.write(`${result.reason}\n`);
    process.exitCode = 2;
  }
}

function runAsHook() {
  try {
    return realpathSync(process.argv[1] ?? "") === fileURLToPath(import.meta.url);
  } catch {
    return false;
  }
}

if (runAsHook()) {
  main().catch((error) => {
    // Any exit but 2 lets the call through with this line shown: a fault in the guard must not stall every tool call.
    process.stderr.write(`guard.mjs could not check this call: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}

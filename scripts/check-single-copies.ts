import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// Review 02/10: a dependency bump left the API client on React 19.2.8 while web moved to 19.3.0, so pnpm installed two
// peer variants of @tanstack/react-query and the dashboard's generated hooks found no QueryClient. Libraries that hold
// React context must resolve to one copy; a second variant in the lockfile fails CI before it reaches staging.

export const SINGLE: readonly string[] = ["react", "react-dom", "@tanstack/react-query"];

/** Every resolved variant of each package in the lockfile's snapshots, keyed by package name. */
export function variants(lock: string, names: readonly string[] = SINGLE): Map<string, string[]> {
  const at = lock.indexOf("\nsnapshots:\n");
  const body = at < 0 ? lock : lock.slice(at);
  const found = new Map<string, string[]>(names.map((n) => [n, []]));
  for (const line of body.split("\n")) {
    const m = /^  '?((?:@[^/@\s]+\/)?[^@\s']+)@([^:\s']+(?:\([^:]*\))*)'?:/.exec(line);
    if (!m) continue;
    const list = found.get(m[1]);
    if (list) list.push(m[2]);
  }
  return found;
}

export function duplicates(lock: string, names: readonly string[] = SINGLE): string[] {
  return [...variants(lock, names)].filter(([, v]) => v.length > 1).map(([name, v]) => `${name}: ${v.join(", ")}`);
}

function main(): void {
  const root = process.argv[2] ? resolve(process.argv[2]) : resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const found = duplicates(readFileSync(resolve(root, "pnpm-lock.yaml"), "utf8"));
  if (found.length === 0) {
    console.log(`One copy each: ${SINGLE.join(", ")}.`);
    return;
  }
  for (const line of found) console.error(`pnpm-lock.yaml resolves more than one copy of ${line}`);
  console.error("Give every workspace package the same version from the catalogue, then run pnpm install.");
  process.exit(1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main();

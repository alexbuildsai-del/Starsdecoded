import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

// The critical tier runs only the files a package lists in test.critical (docs/annex/test-archive.md). A missing or
// empty list, or a listed file that is gone, stops the run: node --test given no file runs every test, which would
// hide the split instead of failing loudly.
const LIST = "test.critical";

const fail = (message) => {
  console.error(`test-critical: ${message} (in ${process.cwd()})`);
  process.exit(1);
};

if (!existsSync(LIST)) fail(`${LIST} is missing`);
const files = readFileSync(LIST, "utf8")
  .split("\n")
  .map((line) => line.trim())
  .filter(Boolean);
if (files.length === 0) fail(`${LIST} lists no file`);
const missing = files.filter((file) => !existsSync(file));
if (missing.length > 0) fail(`${LIST} lists files that do not exist: ${missing.join(", ")}`);

const run = spawnSync(process.execPath, ["--import", "tsx", "--test", ...files], { stdio: "inherit" });
process.exit(run.status ?? 1);

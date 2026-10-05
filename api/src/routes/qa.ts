/**
 * The staging walk after each deploy, and its public verdict (ADR-279, 315). Once the web serves this commit, the QA
 * pair is made ready, reset and walked in `deploy` mode, which copies the seed in and writes nothing (readings 11, 17):
 * one walk a commit. GET /api/qa/latest answers the newest verdict with nothing private in it, for the round's skills
 * to read (B-31). Staging only: anywhere else nothing walks and the route answers 404. No route starts a walk (ADR-315).
 */
import { Router, type IRouter } from "express";
import type { QaWalkRow, QaWalkStatus } from "@workspace/db";
import { readAppEnv, readCommitSha } from "../lib/appEnv.js";
import { GIVE_UP_MS, untilWebServes } from "../lib/indexNow.js";
import { dbQaWalkRecord, liveWalkDeps, walkOnce, type WalkDeps } from "../lib/release.js";
import { logger } from "../lib/logger.js";
import { publicWebBase } from "../lib/waitlist.js";

/** A walk still running from before this process started was cut off by the restart that started this one. */
const BOOTED_AT = new Date();

export interface QaDeployDeps {
  env: NodeJS.ProcessEnv;
  walk: WalkDeps;
  webServes: (origin: string, commit: string) => Promise<{ live: boolean; seen: string | null }>;
  bootedAt: Date;
  log: (level: "info" | "warn", line: string) => void;
}

export type QaDeployOutcome =
  | { kind: "skipped"; reason: string }
  | { kind: "gave_up"; commit: string; seen: string | null }
  | { kind: "walked"; commit: string; status: QaWalkStatus }
  | { kind: "failed"; reason: string };

function liveDeps(): QaDeployDeps {
  return {
    env: process.env,
    walk: liveWalkDeps(),
    webServes: (origin, commit) => untilWebServes(origin, commit),
    bootedAt: BOOTED_AT,
    log: (level, line) => logger[level](line),
  };
}

const short = (sha: string) => sha.slice(0, 7);

async function afterDeploy(deps: QaDeployDeps): Promise<QaDeployOutcome> {
  const { record, now } = deps.walk;
  const settled = await record.settle(deps.bootedAt, now());
  if (settled) deps.log("warn", `QA walk: ${settled} walk(s) a restart cut off now read failed`);
  const commit = readCommitSha(deps.env);
  if (!commit) return { kind: "skipped", reason: "this process does not know its commit (RAILWAY_GIT_COMMIT_SHA)" };
  // One walk a commit: a restart walks nothing again, so a process that keeps crashing can't walk over and over.
  if (await record.walked(commit)) return { kind: "skipped", reason: `${short(commit)} has its walk already` };
  const waitedFrom = now();
  // The host the walk itself opens, so the commit it waits for is the one it walks.
  const { live, seen } = await deps.webServes(publicWebBase(deps.env), commit);
  if (!live) {
    const id = await record.begin({ sha: commit, mode: "deploy", startedAt: waitedFrom }, true);
    if (id) {
      const detail = `After ${GIVE_UP_MS / 60_000} minutes the site still showed ${seen ? short(seen) : "no commit"}.`;
      await record.finish(id, { status: "fail", steps: [], findings: [{ step: null, title: "The site never showed this commit", detail }] }, now());
    }
    return { kind: "gave_up", commit, seen };
  }
  const run = await walkOnce("deploy", commit, deps.walk, { oncePerCommit: true });
  return run ? { kind: "walked", commit, status: run.verdict.status } : { kind: "skipped", reason: `${short(commit)} has its walk already` };
}

function describe(outcome: QaDeployOutcome): ["info" | "warn", string] {
  switch (outcome.kind) {
    case "walked":
      return [outcome.status === "pass" || outcome.status === "unseeded" ? "info" : "warn", `QA walk: ${outcome.status} for ${short(outcome.commit)}`];
    case "gave_up":
      return ["warn", `QA walk: gave up after ${GIVE_UP_MS / 60_000} minutes, the site shows ${outcome.seen ? short(outcome.seen) : "no commit"} and this API is ${short(outcome.commit)}`];
    case "skipped":
      return ["info", `QA walk: skipped, ${outcome.reason}`];
    case "failed":
      return ["warn", `QA walk: not walked, ${outcome.reason}`];
  }
}

/**
 * Called after the listen and never awaited (index.ts): it waits up to twenty minutes for the web and walks for some
 * more, so it never holds the start, and nothing in it rejects. Off staging it does nothing and says nothing.
 */
export async function qaAfterDeploy(over: Partial<QaDeployDeps> = {}): Promise<QaDeployOutcome | null> {
  const deps: QaDeployDeps = { ...liveDeps(), ...over };
  if (readAppEnv(deps.env) !== "staging") return null;
  let outcome: QaDeployOutcome;
  try {
    outcome = await afterDeploy(deps);
  } catch (err) {
    outcome = { kind: "failed", reason: err instanceof Error ? err.message : String(err) };
  }
  deps.log(...describe(outcome));
  return outcome;
}

// The walk keeps addresses, links, tokens and account ids out of what it records; whatever slips past is masked at this
// one public door, in every string the answer holds, whichever field it sits in (R14-14's lesson).
const PRIVATE: ReadonlyArray<[RegExp, string]> = [
  [/\bhttps?:\/\/\S+/gi, "[link]"],
  [/[\w.%+-]+@[\w-]+(?:\.[\w-]+)+/g, "[email]"],
  [/[\w-]{16,}\.[\w-]{16,}(?:\.[\w-]+)?/g, "[token]"],
  [/\b(?:user|sess|sia|sin|client|org|cus|sub|pi|pm|seti|cs|ch|re|in|evt|clock|sk|rk|pk|whsec)_\w{10,}/g, "[id]"],
  [/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, "[id]"],
  [/[\w-]{32,}/g, "[token]"],
];

const masked = (text: string): string => PRIVATE.reduce((out, [pattern, mark]) => out.replace(pattern, mark), text);
const text = (value: unknown): string | null => (typeof value === "string" ? masked(value) : null);
const entries = (value: unknown): Record<string, unknown>[] =>
  Array.isArray(value) ? value.filter((v): v is Record<string, unknown> => Boolean(v) && typeof v === "object") : [];

/** The verdict's own fields and no others, so a field the walk adds later is never public before someone chooses it. */
function publicVerdict(row: QaWalkRow) {
  return {
    sha: row.sha,
    mode: row.mode,
    status: row.status,
    startedAt: row.startedAt.toISOString(),
    finishedAt: row.finishedAt?.toISOString() ?? null,
    steps: entries(row.steps).map((s) => ({
      id: text(s.id),
      label: text(s.label),
      status: text(s.status),
      ...(typeof s.reason === "string" ? { reason: masked(s.reason) } : {}),
      ms: typeof s.ms === "number" && Number.isFinite(s.ms) ? s.ms : null,
    })),
    findings: entries(row.findings).map((f) => ({ step: text(f.step), title: text(f.title), detail: text(f.detail) })),
  };
}

// Mounted in app.ts ahead of the session: the skills read it with no account, and it reads one row and writes none.
const router: IRouter = Router();

router.get("/qa/latest", async (req, res) => {
  res.set("Cache-Control", "no-store");
  if (readAppEnv() !== "staging") return res.status(404).json({ error: "not_found" });
  try {
    const row = await dbQaWalkRecord.latest();
    if (!row) return res.status(404).json({ error: "not_found" });
    return res.json(publicVerdict(row));
  } catch (err) {
    req.log.error({ err }, "qa walk verdict failed");
    return res.status(500).json({ error: "internal_error" });
  }
});

export default router;

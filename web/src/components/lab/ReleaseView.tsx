import { useEffect, useRef, useState } from "react";
import { Card } from "@/ds/molecules/Card";
import { Loader2 } from "lucide-react";
import { Button } from "@/ds/atoms/Button";
import { cents, labApi, type Preflight, type ReleaseDetail, type ReleaseSummary } from "@/lib/labApi";

const short = (sha: string | null) => (sha ? sha.slice(0, 7) : "none");

// The server's walk row says pass or fail; the preflight may spell it either way.
function walkLine(walk: Preflight["qaWalk"]): string {
  if (!walk) return "QA walk has not run yet.";
  const when = walk.at.slice(0, 16).replace("T", " ");
  switch (walk.status) {
    case "pass":
    case "passed":
      return `QA walk passed, ${when}`;
    case "fail":
    case "failed":
      return `QA walk failed at ${walk.step ?? "the start"}, ${when}`;
    case "unseeded":
      return "QA walk is waiting for the first Release to write its reports.";
    case "unconfigured":
      return `QA walk did not run, ${when}. This host has no browser.`;
    default:
      return "QA walk is running.";
  }
}

/**
 * Release (ADR-86): preflight first, the two heads, the brain diff, the
 * estimate and which keys are present (never a value); then one button;
 * then each step's state, the QA findings by severity, and the
 * fast-forward. A stop names its reason: a fault, a sev-1, or MB-75.
 */
export function ReleaseView({ readOnly }: { readOnly: boolean }) {
  const [pre, setPre] = useState<Preflight | null>(null);
  const [releases, setReleases] = useState<ReleaseSummary[]>([]);
  const [current, setCurrent] = useState<ReleaseDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const timer = useRef<number | null>(null);

  const load = async () => {
    const [p, r] = await Promise.all([labApi.preflight(), labApi.releases()]);
    setPre(p);
    setReleases(r.releases);
    return r.releases;
  };

  const follow = (id: string) => {
    if (timer.current) window.clearInterval(timer.current);
    const tick = async () => {
      const d = await labApi.release(id);
      setCurrent(d);
      if (d.status !== "running" && timer.current) { window.clearInterval(timer.current); timer.current = null; await load().catch(() => undefined); }
    };
    void tick();
    timer.current = window.setInterval(() => { void tick().catch((e: Error) => setError(e.message)); }, 4000);
  };

  useEffect(() => {
    load().then((r) => { const running = r.find((x) => x.status === "running") ?? r[0]; if (running) follow(running.id); }).catch((e: Error) => setError(e.message));
    return () => { if (timer.current) window.clearInterval(timer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const start = async () => {
    setStarting(true);
    setError(null);
    try {
      const out = await labApi.startRelease();
      follow(out.id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setStarting(false);
    }
  };

  const key = (on: boolean) => (on ? <span className="text-indigo-lt">present</span> : <span className="text-error">absent</span>);
  const stepClass = (s: string) => (s === "passed" ? "text-indigo-lt" : s === "failed" ? "text-error" : s === "stopped" ? "text-brass" : "text-paper-dim");

  return (
    <div className="flex flex-col gap-4 text-sm">
      {!pre && !error && <Loader2 className="h-5 w-5 animate-spin text-muted" />}
      {pre && (
        <Card as="div" className="p-3">
          <p className="font-label text-xs tracking-wide text-indigo-lt">Preflight</p>
          <p className={`text-xs ${pre.qaWalk && /^fail/.test(pre.qaWalk.status) ? "text-error" : "text-paper-dim"}`}>{walkLine(pre.qaWalk)}</p>
          {pre.stripeSync && <p className="text-xs text-error">Stripe sync: {pre.stripeSync}</p>}
          <p className="font-numeric text-xs">staging <span className="text-paper">{short(pre.sha)}</span> · main <span className="text-paper">{short(pre.mainHead)}</span> · production <span className="text-paper">{short(pre.productionSha)}</span> · {pre.env}</p>
          <p className="text-xs text-paper-dim">brain {pre.brainChanged ? <span className="text-paper">changed</span> : "unchanged"}{pre.pairChanged ? ", the pair brain too" : ""}{pre.files.length ? `: ${pre.files.join(", ")}` : ""}</p>
          <p className="text-xs font-numeric">estimate about {cents(pre.estimateUsd)} · spent {cents(pre.spentUsd)} of {cents(pre.budgetUsd)}{pre.overBudget ? <span className="text-error"> · over budget</span> : ""}</p>
          <p className="text-xs">keys: OpenAI {key(pre.keys.openai)} · GITHUB_RELEASE_TOKEN {key(pre.keys.githubReleaseToken)}{pre.keys.githubReleaseToken ? "" : " (MB-75: the release stops at passed and Promote takes the id)"} · Chromium {key(pre.keys.browser)}{pre.keys.browser ? "" : " (MB-77: the QA agent reports unconfigured)"}</p>
          {pre.problems.length > 0 && <ul className="text-xs text-error list-disc pl-4">{pre.problems.map((p) => <li key={p}>{p}</li>)}</ul>}
          <div>
            <Button size="compact" disabled={starting || readOnly || pre.problems.length > 0 || current?.status === "running"} onClick={start}>
              {starting ? "Starting" : "Release"}
            </Button>
          </div>
        </Card>
      )}

      {current && (
        <Card as="div" className="p-3">
          <p className="font-label text-xs tracking-wide text-indigo-lt">Release {short(current.sha)} · <span className={stepClass(current.status === "forwarded" ? "passed" : current.status)}>{current.status}</span>{current.status === "running" && <Loader2 className="inline h-3 w-3 animate-spin ml-1" />}</p>
          <ol className="text-xs flex flex-col gap-1">
            {current.steps.map((s) => (
              <li key={s.name} className="flex gap-2"><span className="w-16 font-label">{s.name}</span><span className={`w-16 ${stepClass(s.status)}`}>{s.status}</span><span className="text-paper-dim">{s.detail ?? ""}</span></li>
            ))}
          </ol>
          {current.error && <p className="text-xs text-error">{current.error}</p>}
          {current.qa && (
            <div className="text-xs">
              <p className="font-label text-paper-dim">QA agent · {current.qa.status} · {cents(current.qa.costUsd)}{current.qa.reason ? ` · ${current.qa.reason}` : ""}</p>
              {[1, 2, 3].map((sev) => {
                const list = current.qa!.findings.filter((f) => f.sev === sev);
                return list.length ? (
                  <div key={sev} className="mt-1">
                    <p className={sev === 1 ? "text-error" : "text-paper-dim"}>sev-{sev} · {list.length}</p>
                    <ul className="list-disc pl-4">{list.map((f, i) => <li key={i}><span className="text-paper">{f.where}</span>: {f.title}. <span className="text-paper-dim">{f.detail}</span></li>)}</ul>
                  </div>
                ) : null;
              })}
            </div>
          )}
        </Card>
      )}

      {releases.length > 0 && (
        <table className="text-xs font-numeric w-full">
          <thead className="text-paper-dim"><tr><th className="text-left">release</th><th className="text-left">sha</th><th>brain</th><th>status</th><th className="text-left">when</th></tr></thead>
          <tbody>
            {releases.map((r) => (
              <tr key={r.id} className="border-t border-line cursor-pointer" onClick={() => follow(r.id)}>
                <td className="text-left">{r.id.slice(0, 8)}</td><td>{short(r.sha)}</td><td className="text-center">{r.brainChanged ? "changed" : "same"}</td><td className={`text-center ${stepClass(r.status === "forwarded" ? "passed" : r.status)}`}>{r.status}</td><td>{r.createdAt.slice(0, 16).replace("T", " ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {error && <p className="text-error">{error}</p>}
    </div>
  );
}

import { useCallback, useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useUser } from "@clerk/react";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BASE_URL } from "@/lib/api";
import { Wordmark } from "@/components/Wordmark";
import { usePageTitle } from "@/lib/page-title";
import { cents, labApi, type SpendResponse } from "@/lib/labApi";
import { RunsView } from "@/components/lab/RunsView";
import { SpawnView } from "@/components/lab/SpawnView";
import { ReadingRoom } from "@/components/lab/ReadingRoom";
import { RevealView } from "@/components/lab/RevealView";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

type Tab = "runs" | "spawn" | "room" | "reveal";
const TABS: Array<[Tab, string]> = [["runs", "Runs"], ["spawn", "Spawn a session"], ["room", "Reading room"], ["reveal", "Reveal"]];

/**
 * The Lab beside Prompts (annex scope 5), gated like it by ADMIN_USER_ID.
 * Runs and Spawn make no model call and load no report text; the header
 * shows the month's lab spend against LAB_BUDGET_USD (ADR-77).
 */
export default function AdminLabPage() {
  usePageTitle("Report lab");
  const [, navigate] = useLocation();
  const { user, isLoaded } = useUser();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [readOnly, setReadOnly] = useState(false);
  const [spend, setSpend] = useState<SpendResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("runs");
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded) return;
    if (!user) { navigate(`${basePath}/sign-in?return_to=/admin/report-lab`); return; }
    fetch(`${BASE_URL}admin/me`, { credentials: "include" })
      .then((r) => r.json() as Promise<{ isAdmin: boolean; promptsReadOnly?: boolean }>)
      .then(async (me) => {
        setIsAdmin(me.isAdmin);
        setReadOnly(me.promptsReadOnly === true);
        if (me.isAdmin) setSpend(await labApi.spend());
      })
      .catch((e: Error) => setError(e.message));
  }, [isLoaded, user, navigate]);

  const onSession = useCallback((id: string) => setSessionId(id), []);

  if (!isLoaded || isAdmin === null) {
    return (
      <div className="min-h-screen text-foreground flex items-center justify-center">
        {error ? <p className="text-sm text-destructive">{error}</p> : <Loader2 className="h-8 w-8 animate-spin text-primary/40" />}
      </div>
    );
  }

  if (isAdmin === false) {
    return (
      <div className="min-h-screen text-foreground flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <AlertCircle className="h-10 w-10 text-destructive mx-auto mb-4" />
          <h1 className="font-display text-2xl mb-2">Access Denied</h1>
          <p className="text-sm text-muted-foreground mb-6">Your account does not have admin access. Set <code className="font-numeric">ADMIN_USER_ID</code> to your Clerk user ID to enable this panel.</p>
          <Button variant="outline" onClick={() => navigate("/dashboard")}>Back to Dashboard</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-foreground">
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <button type="button" onClick={() => navigate("/dashboard")}><Wordmark /></button>
          <span className="font-label text-xs tracking-[0.15em] uppercase text-muted-foreground hidden sm:block">Admin</span>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-20 pb-20 flex gap-6">
        <aside className="hidden md:flex flex-col gap-1 w-48 shrink-0 pt-2">
          <p className="font-label text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-2 px-3">Admin</p>
          <button type="button" onClick={() => navigate("/admin/prompts")} className="text-left px-3 py-2 rounded-lg text-sm font-label text-muted-foreground hover:text-foreground">Prompts</button>
          <button type="button" onClick={() => navigate("/admin/report-lab")} className="text-left px-3 py-2 rounded-lg text-sm font-label bg-primary/10 text-primary">Lab</button>
        </aside>

        <main className="flex-1 min-w-0">
          <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="font-label text-xs tracking-[0.2em] uppercase text-primary/80 mb-1">Admin</p>
              <h1 className="font-display text-2xl">Report lab</h1>
              <p className="text-sm text-muted-foreground mt-1">Stored runs, replays with the chart and foundation held, and the blind reading room. Nothing generates before a session is spawned.</p>
            </div>
            <div className="text-right font-numeric text-sm">
              <p className="font-label text-[10px] tracking-[0.2em] uppercase text-muted-foreground">Lab spend {spend?.month ?? ""}</p>
              <p>{spend ? <>{cents(spend.spentUsd)} of {cents(spend.budgetUsd)} · {spend.runs} runs</> : "-"}</p>
            </div>
          </div>

          {readOnly && (
            <div role="status" className="mb-4 rounded-lg border border-amber-400/30 bg-amber-400/10 px-4 py-3 flex items-start gap-3 text-amber-200">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <p className="text-sm leading-relaxed">Read-only here. Replays and sessions run on staging only.</p>
            </div>
          )}

          <div className="mb-4 flex gap-1 p-1 rounded-lg border border-border/60 bg-card/40 w-fit">
            {TABS.map(([t, name]) => (
              <button key={t} type="button" onClick={() => setTab(t)}
                className={`px-3 py-1.5 rounded-md text-xs font-label tracking-wide transition-colors ${tab === t ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                {name}
              </button>
            ))}
          </div>

          {tab === "runs" && <RunsView />}
          {tab === "spawn" && <SpawnView onSpawned={(id) => { setSessionId(id); setTab("room"); }} />}
          {tab === "room" && <ReadingRoom sessionId={sessionId} onSession={onSession} onReveal={(id) => { setSessionId(id); setTab("reveal"); }} />}
          {tab === "reveal" && <RevealView sessionId={sessionId} onSession={onSession} />}
        </main>
      </div>
    </div>
  );
}

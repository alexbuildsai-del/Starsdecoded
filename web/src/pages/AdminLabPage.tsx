import { useCallback, useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useClerk, useUser } from "@clerk/react";
import { AlertCircle } from "lucide-react";
import { Alert } from "@/ds/molecules/Alert";
import { SegmentedControl } from "@/ds/molecules/SegmentedControl";
import { Eyebrow } from "@/ds/atoms/Eyebrow";
import { BASE_URL } from "@/lib/api";
import { AdminDenied, AdminLoading, AdminShell } from "@/components/lab/AdminShell";
import { ClerkStalledPage } from "@/components/ClerkStalled";
import { useClerkStalled } from "@/hooks/useClerkStalled";
import { usePageTitle } from "@/lib/page-title";
import { cents, labApi, type SpendResponse } from "@/lib/labApi";
import { RunsView } from "@/components/lab/RunsView";
import { SpawnView } from "@/components/lab/SpawnView";
import { ReadingRoom } from "@/components/lab/ReadingRoom";
import { RevealView } from "@/components/lab/RevealView";
import { SpotView } from "@/components/lab/SpotView";
import { FailuresView } from "@/components/lab/FailuresView";
import { ReleaseView } from "@/components/lab/ReleaseView";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

type Tab = "runs" | "spot" | "spawn" | "room" | "reveal" | "failures" | "release";
const TABS: Array<[Tab, string]> = [
  ["runs", "Runs"], ["spot", "Spot and dry"], ["spawn", "Spawn a session"], ["room", "Reading room"], ["reveal", "Reveal"], ["failures", "Failures"], ["release", "Release"],
];

/**
 * The Lab beside Prompts (annex scope 5), gated like it by the admin check.
 * Runs and Spawn make no model call and load no report text; the header
 * shows the month's lab spend against LAB_BUDGET_USD (ADR-77).
 */
export default function AdminLabPage() {
  usePageTitle("Report lab");
  const [, navigate] = useLocation();
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const clerkStalled = useClerkStalled();
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

  if (clerkStalled) return <ClerkStalledPage />;

  if (!isLoaded || isAdmin === null) return <AdminLoading error={error} />;

  if (isAdmin === false) {
    return <AdminDenied onSignOut={() => void signOut({ redirectUrl: `${basePath}/sign-in?return_to=/admin/report-lab` })} />;
  }

  return (
    <AdminShell
      current="/admin/report-lab"
      title="Report lab"
      lede="Stored runs, the spot and the dry, the blind reading room, the failure log and the release. Nothing generates before you press a button that shows its price."
      aside={
        <div className="text-right font-numeric text-small">
          <Eyebrow className="block">Lab spend {spend?.month ?? ""}</Eyebrow>
          <p className="m-0">{spend ? <>{cents(spend.spentUsd)} of {cents(spend.budgetUsd)} · {spend.runs} runs</> : "-"}</p>
        </div>
      }
    >
      {readOnly && (
        <Alert tone="notice" className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-brass" />
          <p className="m-0">Read-only here. Spots, sessions and releases run on staging only.</p>
        </Alert>
      )}

      <SegmentedControl<Tab>
        aria-label="Lab views"
        className="w-fit max-w-full flex-wrap"
        options={TABS.map(([id, label]) => ({ id, label }))}
        value={tab}
        onChange={setTab}
      />

      {tab === "runs" && <RunsView />}
      {tab === "spot" && <SpotView readOnly={readOnly} />}
      {tab === "spawn" && <SpawnView onSpawned={(id) => { setSessionId(id); setTab("room"); }} />}
      {tab === "room" && <ReadingRoom sessionId={sessionId} onSession={onSession} onReveal={(id) => { setSessionId(id); setTab("reveal"); }} />}
      {tab === "reveal" && <RevealView sessionId={sessionId} onSession={onSession} />}
      {tab === "failures" && <FailuresView />}
      {tab === "release" && <ReleaseView readOnly={readOnly} />}
    </AdminShell>
  );
}

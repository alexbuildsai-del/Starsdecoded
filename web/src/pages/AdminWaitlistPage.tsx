import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useClerk, useUser } from "@clerk/react";
import { Download } from "lucide-react";
import { Button } from "@/ds/atoms/Button";
import { Input } from "@/ds/atoms/Input";
import { Alert } from "@/ds/molecules/Alert";
import { AdminDenied, AdminLoading, AdminShell } from "@/components/lab/AdminShell";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/ds/organisms/Confirm";
import { ClerkStalledPage } from "@/components/ClerkStalled";
import { useClerkStalled } from "@/hooks/useClerkStalled";
import { BASE_URL } from "@/lib/api";
import { APP_ENV } from "@/lib/appEnv";
import { usePageTitle } from "@/lib/page-title";
import { PRELAUNCH } from "@/lib/prelaunch";
import { CONFIRM_LINK_DAYS, waitlistCounts, waitlistCsv, type WaitlistSignup } from "@/lib/waitlist";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

async function waitlistCall<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}admin/waitlist${path}`, { credentials: "include", ...init });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? `The waitlist answered ${res.status}.`);
  }
  return (res.status === 204 ? undefined : await res.json()) as T;
}

function download(rows: readonly WaitlistSignup[]) {
  const blob = new Blob([waitlistCsv(rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `stars-decoded-waitlist-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const stamp = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

/** The list production collects before launch (ADR-141, 145), for the admin alone. */
export default function AdminWaitlistPage() {
  usePageTitle("Waitlist");
  const [, navigate] = useLocation();
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const clerkStalled = useClerkStalled();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [rows, setRows] = useState<WaitlistSignup[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [removing, setRemoving] = useState<WaitlistSignup | null>(null);

  useEffect(() => {
    if (!isLoaded) return;
    if (!user) { navigate(`${basePath}/sign-in?return_to=/admin/waitlist`); return; }
    fetch(`${BASE_URL}admin/me`, { credentials: "include" })
      .then((r) => r.json() as Promise<{ isAdmin: boolean }>)
      .then(async (me) => {
        setIsAdmin(me.isAdmin);
        if (me.isAdmin) setRows((await waitlistCall<{ signups: WaitlistSignup[] }>("")).signups);
      })
      .catch((e: Error) => setError(e.message));
  }, [isLoaded, user, navigate]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (rows ?? []).filter((r) => !q || r.email.includes(q));
  }, [rows, query]);

  async function remove(row: WaitlistSignup) {
    try {
      await waitlistCall<void>(`/${encodeURIComponent(row.id)}`, { method: "DELETE" });
      setRows((all) => (all ?? []).filter((r) => r.id !== row.id));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRemoving(null);
    }
  }

  if (clerkStalled) return <ClerkStalledPage />;

  if (!isLoaded || isAdmin === null) return <AdminLoading error={error} />;

  if (isAdmin === false) {
    return <AdminDenied onSignOut={() => void signOut({ redirectUrl: `${basePath}/sign-in?return_to=/admin/waitlist` })} />;
  }

  const all = rows ?? [];
  const counts = waitlistCounts(all, new Date());
  const where = PRELAUNCH
    ? "Everyone who asked to hear when Stars Decoded launches. Visitors see the site, and its Get my report and Sign in buttons open the waitlist. You see the whole app."
    : APP_ENV === "production"
      ? "Everyone who joined before launch. The waitlist page is at /waitlist."
      : "Test sign-ups on this environment. The real list is on production, at mystarsdecoded.com/admin/waitlist.";

  return (
    <>
      <AdminShell
        current="/admin/waitlist"
        title="Waitlist"
        lede={<><p>{where}</p><p className="mt-1">Pending means the confirmation link hasn't been opened yet. Those addresses are deleted after {CONFIRM_LINK_DAYS} days.</p></>}
        aside={
          <Button variant="secondary" size="compact" onClick={() => download(all)} disabled={all.length === 0}>
            <Download />
            Download CSV
          </Button>
        }
      >
        <p className="font-mono text-data tabular-nums text-paper">
          {counts.confirmed} confirmed · {counts.pending} pending · {counts.day} confirmed in the last day · {counts.week} in the last 7 days
        </p>

        {error && <Alert>{error}</Alert>}

        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find an address" aria-label="Find an address" className="h-10 max-w-sm" />

        {all.length === 0 ? (
          <p className="py-10 text-small text-paper-dim">No one has joined yet. The form is on the waitlist page.</p>
        ) : (
          <div className="overflow-x-auto rounded-card border border-line bg-surface">
            <table className="w-full text-small">
              <thead className="text-left font-label text-label uppercase text-label-dim">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Email</th>
                  <th className="px-4 py-2.5 font-medium">Joined</th>
                  <th className="px-4 py-2.5 font-medium">Confirmed</th>
                  <th className="px-4 py-2.5 font-medium">Form</th>
                  <th className="px-4 py-2.5 font-medium">Campaign</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => (
                  <tr key={r.id} className="border-t border-line">
                    <td className="break-all px-4 py-2.5">{r.email}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 font-mono tabular-nums text-paper-dim">{stamp(r.createdAt)}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 font-mono tabular-nums text-paper-dim">{r.confirmedAt ? stamp(r.confirmedAt) : "Pending"}</td>
                    <td className="px-4 py-2.5 text-paper-dim">{r.source ?? ""}</td>
                    <td className="px-4 py-2.5 text-paper-dim">{[r.utmSource, r.utmMedium, r.utmCampaign, r.utmContent].filter(Boolean).join(" / ")}</td>
                    <td className="px-4 py-2.5 text-right">
                      <Button variant="secondary" size="compact" onClick={() => setRemoving(r)}>Remove</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminShell>

      <AlertDialog open={removing !== null} onOpenChange={(open) => { if (!open) setRemoving(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {removing?.email}?</AlertDialogTitle>
            <AlertDialogDescription>The address leaves the waitlist for good. Do this when someone asks to be deleted.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (removing) void remove(removing); }}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

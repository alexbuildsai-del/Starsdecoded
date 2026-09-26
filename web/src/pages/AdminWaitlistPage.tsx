import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useClerk, useUser } from "@clerk/react";
import { AlertCircle, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Wordmark } from "@/components/Wordmark";
import { BASE_URL } from "@/lib/api";
import { APP_ENV } from "@/lib/appEnv";
import { usePageTitle } from "@/lib/page-title";
import { PRELAUNCH } from "@/lib/prelaunch";
import { joinedWithin, waitlistCsv, type WaitlistSignup } from "@/lib/waitlist";

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

const joinedAt = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

/** The list production collects before launch (ADR-141), for the admin alone. */
export default function AdminWaitlistPage() {
  usePageTitle("Waitlist");
  const [, navigate] = useLocation();
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
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

  if (!isLoaded || isAdmin === null) {
    return (
      <div className="min-h-screen bg-background bg-stars text-foreground flex items-center justify-center">
        {error ? <p className="text-sm text-destructive">{error}</p> : <Loader2 className="h-8 w-8 animate-spin text-primary/40" />}
      </div>
    );
  }

  if (isAdmin === false) {
    return (
      <div className="min-h-screen bg-background bg-stars text-foreground flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <AlertCircle className="h-10 w-10 text-destructive mx-auto mb-4" />
          <h1 className="font-display text-2xl mb-2">This page is for the Stars Decoded team</h1>
          <p className="text-sm text-muted-foreground mb-6">You're signed in with an account that isn't the admin's. Sign out and sign in with the admin account.</p>
          <Button variant="outline" onClick={() => void signOut({ redirectUrl: `${basePath}/sign-in?return_to=/admin/waitlist` })}>Sign out</Button>
        </div>
      </div>
    );
  }

  const now = new Date();
  const all = rows ?? [];
  const where = PRELAUNCH
    ? "Everyone who asked to hear when Stars Decoded opens. Visitors see the waitlist page until launch. You see the app."
    : APP_ENV === "production"
      ? "Everyone who joined before launch. The waitlist page is at /waitlist."
      : "Test sign-ups on this environment. The real list is on production, at mystarsdecoded.com/admin/waitlist.";

  return (
    <div className="min-h-screen bg-background bg-stars text-foreground">
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
          <button type="button" onClick={() => navigate("/admin/report-lab")} className="text-left px-3 py-2 rounded-lg text-sm font-label text-muted-foreground hover:text-foreground">Lab</button>
          <button type="button" onClick={() => navigate("/admin/waitlist")} className="text-left px-3 py-2 rounded-lg text-sm font-label bg-primary/10 text-primary">Waitlist</button>
        </aside>

        <main className="flex-1 min-w-0">
          <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="font-label text-xs tracking-[0.2em] uppercase text-primary/80 mb-1">Admin</p>
              <h1 className="font-display text-2xl">Waitlist</h1>
              <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{where}</p>
            </div>
            <Button variant="outline" onClick={() => download(all)} disabled={all.length === 0}>
              <Download className="h-4 w-4" />
              Download CSV
            </Button>
          </div>

          <p className="font-numeric text-sm mb-4">
            {all.length} {all.length === 1 ? "address" : "addresses"} · {joinedWithin(all, 1, now)} in the last day · {joinedWithin(all, 7, now)} in the last 7 days
          </p>

          {error && (
            <div role="alert" className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm">{error}</div>
          )}

          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find an address" aria-label="Find an address" className="mb-3 max-w-sm" />

          {all.length === 0 ? (
            <p className="text-sm text-muted-foreground py-10">No one has joined yet. The form is on the waitlist page.</p>
          ) : (
            <div className="rounded-lg border border-border/60 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-card/60 text-left font-label text-[10px] tracking-[0.16em] uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Email</th>
                    <th className="px-4 py-2.5 font-medium">Joined</th>
                    <th className="px-4 py-2.5 font-medium">Form</th>
                    <th className="px-4 py-2.5 font-medium">Campaign</th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {shown.map((r) => (
                    <tr key={r.id} className="border-t border-border/40">
                      <td className="px-4 py-2.5 break-all">{r.email}</td>
                      <td className="px-4 py-2.5 font-numeric whitespace-nowrap text-muted-foreground">{joinedAt(r.createdAt)}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{r.source ?? ""}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{[r.utmSource, r.utmMedium, r.utmCampaign].filter(Boolean).join(" / ")}</td>
                      <td className="px-4 py-2.5 text-right">
                        <Button variant="ghost" size="sm" onClick={() => setRemoving(r)}>Remove</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>

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
    </div>
  );
}

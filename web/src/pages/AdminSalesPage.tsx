import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useLocation } from "wouter";
import { useClerk, useUser } from "@clerk/react";
import { AlertCircle, Check, Copy, Loader2 } from "lucide-react";
import { CAMPAIGN_ITEMS, MAX_CAMPAIGN_OFF, bundleById, formatEuro } from "@workspace/commerce";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Wordmark } from "@/components/Wordmark";
import { ClerkStalledPage } from "@/components/ClerkStalled";
import { useClerkStalled } from "@/hooks/useClerkStalled";
import { BASE_URL } from "@/lib/api";
import { APP_ENV } from "@/lib/appEnv";
import { usePageTitle } from "@/lib/page-title";
import {
  GRANT_COUNTS, SalesApiError, addTester, brusselsToday, campaignLink, campaignStatus, dayLabel, endCampaign,
  grantTester, listCampaigns, listTesters, removeTester, saveCampaign,
  type Campaign, type CampaignItem, type CampaignStatus, type GrantCount, type Tester,
} from "@/lib/adminPaymentsApi";

// The commerce list is typed as every bundle id; a campaign only ever holds these two.
const ITEMS = CAMPAIGN_ITEMS as readonly CampaignItem[];

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const lineOf = (e: unknown) => (e instanceof SalesApiError ? e.message : "We couldn't reach the server. Try again in a minute.");

/** "45" or "45.50" in euros to whole cents, or null when it isn't a price. */
function centsOf(text: string): number | null {
  const t = text.trim().replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return null;
  return Math.round(parseFloat(t) * 100);
}

const CHIP: Record<CampaignStatus, { label: string; cls: string }> = {
  live: { label: "Live", cls: "border-green-400/40 text-green-400" },
  scheduled: { label: "Scheduled", cls: "border-primary/40 text-primary" },
  ended: { label: "Ended", cls: "border-border text-muted-foreground" },
};

function Chip({ label, cls }: { label: string; cls: string }) {
  return <span className={`inline-block rounded-full border px-2.5 py-0.5 font-label text-[10px] tracking-[0.14em] uppercase whitespace-nowrap ${cls}`}>{label}</span>;
}

const price = (cents: number) => <span className="font-numeric">{formatEuro(cents)}</span>;

function CampaignLine({ c }: { c: Campaign }) {
  const items = ITEMS.filter((id) => c.prices[id] !== undefined);
  return (
    <p className="text-xs text-muted-foreground mt-0.5">
      {items.map((id, i) => (
        <span key={id}>
          {i > 0 && ", "}
          {bundleById(id).name} {price(bundleById(id).cents)} → {price(c.prices[id] as number)}
        </span>
      ))}
      {" · "}
      <span className="font-numeric">{dayLabel(c.startsOn)} to {dayLabel(c.endsOn)}</span>
      {" · "}
      {c.audience === "link" ? `link only, ?c=${c.slug ?? ""}` : "everyone"}
    </p>
  );
}

function CopyLink({ link, label = "Copy the campaign link" }: { link: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-2 mt-1.5">
      <code className="font-numeric text-xs text-muted-foreground break-all">{link}</code>
      <Button
        type="button" variant="ghost" size="sm"
        aria-label={label}
        onClick={() => { void navigator.clipboard.writeText(link).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }); }}
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? "Copied" : "Copy"}
      </Button>
    </div>
  );
}

function CampaignForm({ onSaved, onCancel }: { onSaved: () => void; onCancel: () => void }) {
  const [name, setName] = useState("");
  const [on, setOn] = useState<Record<CampaignItem, boolean>>({ couple: true, family: false });
  const [amounts, setAmounts] = useState<Record<CampaignItem, string>>({ couple: "", family: "" });
  const [startsOn, setStartsOn] = useState("");
  const [endsOn, setEndsOn] = useState("");
  const [audience, setAudience] = useState<"everyone" | "link">("everyone");
  const [slug, setSlug] = useState("");
  const [busy, setBusy] = useState(false);
  const [refusal, setRefusal] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const prices: Partial<Record<CampaignItem, number>> = {};
    for (const id of ITEMS) {
      if (!on[id]) continue;
      const cents = centsOf(amounts[id]);
      if (cents === null) { setRefusal(`Type the ${bundleById(id).name} price in euros, like 45 or 44.50.`); return; }
      prices[id] = cents;
    }
    if (Object.keys(prices).length === 0) { setRefusal("Pick Couple, Family & friends or both."); return; }
    if (!startsOn || !endsOn) { setRefusal("Pick the first and the last day."); return; }
    setBusy(true);
    setRefusal(null);
    try {
      await saveCampaign({ name: name.trim(), audience, slug: audience === "link" ? slug.trim() : null, startsOn, endsOn, prices });
      onSaved();
    } catch (err) {
      setRefusal(lineOf(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="rounded-lg border border-border/60 bg-card/40 p-4 mb-4 space-y-4">
      <div>
        <Label htmlFor="c-name" className="font-label text-[10px] tracking-[0.16em] uppercase text-muted-foreground">Name</Label>
        <Input id="c-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} required className="mt-1.5 max-w-sm" />
        <p className="text-xs text-muted-foreground mt-1">Buyers see this name on the receipt. Up to 40 letters.</p>
      </div>

      <fieldset>
        <legend className="font-label text-[10px] tracking-[0.16em] uppercase text-muted-foreground mb-1.5">Products and prices</legend>
        <div className="space-y-2">
          {ITEMS.map((id) => {
            const full = bundleById(id).cents;
            const floor = Math.ceil(full * (1 - MAX_CAMPAIGN_OFF));
            return (
              <div key={id} className="flex items-center gap-3 flex-wrap">
                <label className="flex items-center gap-2 text-sm w-44">
                  <input type="checkbox" checked={on[id]} onChange={(e) => setOn({ ...on, [id]: e.target.checked })} className="h-4 w-4 accent-[hsl(var(--primary))]" />
                  {bundleById(id).name}
                </label>
                <Input
                  value={amounts[id]} onChange={(e) => setAmounts({ ...amounts, [id]: e.target.value })}
                  disabled={!on[id]} inputMode="decimal" aria-label={`${bundleById(id).name} campaign price in euros`}
                  className="w-28 font-numeric"
                />
                <span className="text-xs text-muted-foreground">
                  now {price(full)}, lowest {price(floor)}
                </span>
              </div>
            );
          })}
        </div>
      </fieldset>

      <div className="flex gap-4 flex-wrap">
        <div>
          <Label htmlFor="c-start" className="font-label text-[10px] tracking-[0.16em] uppercase text-muted-foreground">First day</Label>
          <Input id="c-start" type="date" value={startsOn} min={brusselsToday(new Date())} onChange={(e) => setStartsOn(e.target.value)} required className="mt-1.5 w-44 font-numeric" />
        </div>
        <div>
          <Label htmlFor="c-end" className="font-label text-[10px] tracking-[0.16em] uppercase text-muted-foreground">Last day</Label>
          <Input id="c-end" type="date" value={endsOn} min={startsOn || undefined} onChange={(e) => setEndsOn(e.target.value)} required className="mt-1.5 w-44 font-numeric" />
        </div>
      </div>
      <p className="text-xs text-muted-foreground -mt-2">Days run on Brussels time, from midnight on the first to midnight at the end of the last.</p>

      <fieldset>
        <legend className="font-label text-[10px] tracking-[0.16em] uppercase text-muted-foreground mb-1.5">Who sees it</legend>
        <div className="flex gap-5 flex-wrap text-sm">
          <label className="flex items-center gap-2"><input type="radio" name="aud" checked={audience === "everyone"} onChange={() => setAudience("everyone")} className="accent-[hsl(var(--primary))]" /> Everyone</label>
          <label className="flex items-center gap-2"><input type="radio" name="aud" checked={audience === "link"} onChange={() => setAudience("link")} className="accent-[hsl(var(--primary))]" /> Only people with the link</label>
        </div>
        {audience === "link" && (
          <div className="mt-3">
            <Label htmlFor="c-slug" className="font-label text-[10px] tracking-[0.16em] uppercase text-muted-foreground">Link word</Label>
            <Input id="c-slug" value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase())} autoCapitalize="none" spellCheck={false} placeholder="waitlist" className="mt-1.5 max-w-xs" />
            <p className="text-xs text-muted-foreground mt-1">Lower case letters, numbers and dashes.</p>
            {slug.trim() && <CopyLink link={campaignLink(window.location.origin, slug.trim())} />}
          </div>
        )}
      </fieldset>

      {refusal && <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm">{refusal}</p>}

      <div className="flex gap-2">
        <Button type="submit" disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}Save campaign</Button>
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}

function CampaignSection({ rows, onChange, onError }: { rows: Campaign[]; onChange: () => void; onError: (m: string) => void }) {
  const [adding, setAdding] = useState(false);
  const [ending, setEnding] = useState<Campaign | null>(null);
  const now = new Date();
  const order: Record<CampaignStatus, number> = { live: 0, scheduled: 1, ended: 2 };
  const sorted = [...rows].sort((a, b) => order[campaignStatus(a, now)] - order[campaignStatus(b, now)] || b.startsOn.localeCompare(a.startsOn));

  async function end(c: Campaign) {
    try { await endCampaign(c.id); onChange(); } catch (e) { onError(lineOf(e)); } finally { setEnding(null); }
  }

  return (
    <section aria-labelledby="campaigns-h" className="mb-10">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 id="campaigns-h" className="font-label text-xs tracking-[0.2em] uppercase text-primary/80">Campaigns</h2>
        {!adding && <Button size="sm" onClick={() => setAdding(true)}>New campaign</Button>}
      </div>

      {adding && <CampaignForm onCancel={() => setAdding(false)} onSaved={() => { setAdding(false); onChange(); }} />}

      {sorted.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6">No campaigns yet. Buyers see the full prices.</p>
      ) : (
        <ul className="rounded-lg border border-border/60 divide-y divide-border/40">
          {sorted.map((c) => {
            const status = campaignStatus(c, now);
            return (
              <li key={c.id} className="px-4 py-3 grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_auto_auto] gap-x-4 gap-y-2 items-center">
                <div className="min-w-0">
                  <p className="text-sm">{c.name}</p>
                  <CampaignLine c={c} />
                  {c.audience === "link" && c.slug && status !== "ended" && <CopyLink link={campaignLink(window.location.origin, c.slug)} />}
                </div>
                <Chip {...CHIP[status]} />
                <div className="col-span-2 sm:col-span-1 sm:w-24 text-right">
                  {status !== "ended" && <Button variant="ghost" size="sm" onClick={() => setEnding(c)}>End now</Button>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <p className="text-xs text-muted-foreground mt-2">
        A link-only campaign runs from its own link, for example mystarsdecoded.com/?c=waitlist. Only Couple and Family &amp; friends take a campaign, at most {Math.round(MAX_CAMPAIGN_OFF * 100)}% off.
      </p>

      <AlertDialog open={ending !== null} onOpenChange={(open) => { if (!open) setEnding(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>End {ending?.name} now?</AlertDialogTitle>
            <AlertDialogDescription>Buyers see the full prices again right away. A payment already started keeps its price.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (ending) void end(ending); }}>End now</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

function TesterRow({ t, onChange, onError, onRemove }: { t: Tester; onChange: () => void; onError: (m: string) => void; onRemove: (t: Tester) => void }) {
  const [count, setCount] = useState<GrantCount>(3);
  const [busy, setBusy] = useState(false);

  async function grant() {
    setBusy(true);
    try { await grantTester(t.userId, count); onChange(); } catch (e) { onError(lineOf(e)); } finally { setBusy(false); }
  }

  const given = t.granted ?? 0;
  return (
    <li className="px-4 py-3 grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 items-center">
      <div className="min-w-0">
        <p className="text-sm break-all">{t.email}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          tester · <span className="font-numeric">{given}</span> {given === 1 ? "credit" : "credits"} · <span className="font-numeric">{t.used ?? 0}</span> used
        </p>
      </div>
      <div className="flex items-center gap-1.5 justify-end">
        <select
          value={count} onChange={(e) => setCount(Number(e.target.value) as GrantCount)} aria-label={`Credits to give ${t.email}`}
          className="h-8 rounded-md border border-input bg-transparent px-2 text-base md:text-xs font-numeric"
        >
          {GRANT_COUNTS.map((n) => <option key={n} value={n} className="bg-background">{n}</option>)}
        </select>
        <Button variant="outline" size="sm" disabled={busy} onClick={() => void grant()}>Grant {count}</Button>
        <Button variant="ghost" size="sm" onClick={() => onRemove(t)}>Remove</Button>
      </div>
    </li>
  );
}

function TesterSection({ rows, onChange, onError }: { rows: Tester[]; onChange: () => void; onError: (m: string) => void }) {
  const [adding, setAdding] = useState(false);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [refusal, setRefusal] = useState<string | null>(null);
  const [removing, setRemoving] = useState<Tester | null>(null);
  const people = rows.filter((t) => t.qa === null);
  // Its row holds the only copy of the address /qa signs in with, so it is shown here and never offered for removal.
  const qaAccount = rows.find((t) => t.qa === "qa-agent") ?? null;

  async function add(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setRefusal(null);
    try {
      await addTester(email.trim());
      setEmail("");
      setAdding(false);
      onChange();
    } catch (err) {
      setRefusal(lineOf(err));
    } finally {
      setBusy(false);
    }
  }

  async function remove(t: Tester) {
    try { await removeTester(t.userId); onChange(); } catch (e) { onError(lineOf(e)); } finally { setRemoving(null); }
  }

  return (
    <section aria-labelledby="testers-h">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 id="testers-h" className="font-label text-xs tracking-[0.2em] uppercase text-primary/80">Testers</h2>
        {!adding && <Button size="sm" variant="outline" onClick={() => setAdding(true)}>Add a tester by email</Button>}
      </div>

      {adding && (
        <form onSubmit={(e) => void add(e)} className="rounded-lg border border-border/60 bg-card/40 p-4 mb-4">
          <Label htmlFor="t-email" className="font-label text-[10px] tracking-[0.16em] uppercase text-muted-foreground">Email</Label>
          <Input id="t-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoCapitalize="none" className="mt-1.5 max-w-sm" />
          <p className="text-xs text-muted-foreground mt-1">The person needs an account already. Use the email they signed up with.</p>
          {refusal && <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm mt-3">{refusal}</p>}
          <div className="flex gap-2 mt-3">
            <Button type="submit" disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}Add tester</Button>
            <Button type="button" variant="ghost" onClick={() => { setAdding(false); setRefusal(null); }}>Cancel</Button>
          </div>
        </form>
      )}

      <ul className="rounded-lg border border-border/60 divide-y divide-border/40">
        {people.map((t) => <TesterRow key={t.userId} t={t} onChange={onChange} onError={onError} onRemove={setRemoving} />)}
        {APP_ENV !== "production" && (
          <li className="px-4 py-3 grid grid-cols-[1fr_auto] gap-x-4 items-center">
            <div className="min-w-0">
              <p className="text-sm">QA pair (staging only)</p>
              <p className="text-xs text-muted-foreground mt-0.5">qa-a and qa-b, made and reset by staging</p>
            </div>
            <Chip label="Auto" cls="border-green-400/40 text-green-400" />
          </li>
        )}
        {APP_ENV === "staging" && (
          <li className="px-4 py-3 grid grid-cols-[1fr_auto] gap-x-4 items-center">
            <div className="min-w-0">
              <p className="text-sm">QA account (staging only)</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {qaAccount ? "/qa signs in with this email. Staging makes it and tops up its test credits at each start." : "Staging makes it at its next start."}
              </p>
              {qaAccount && <CopyLink link={qaAccount.email} label="Copy the QA account's email" />}
            </div>
            <Chip label="Auto" cls="border-green-400/40 text-green-400" />
          </li>
        )}
        {people.length === 0 && APP_ENV === "production" && (
          <li className="px-4 py-6 text-sm text-muted-foreground">No testers yet. Add one by the email on their account.</li>
        )}
      </ul>
      <p className="text-xs text-muted-foreground mt-2">Granted credits show in History as "From Stars Decoded" and count as test credits.</p>

      <AlertDialog open={removing !== null} onOpenChange={(open) => { if (!open) setRemoving(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {removing?.email}?</AlertDialogTitle>
            <AlertDialogDescription>They stop being a tester. Credits you already gave them stay in their balance.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (removing) void remove(removing); }}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

/** Campaigns and testers on one page, for the admin alone (ADR-315). */
export default function AdminSalesPage() {
  usePageTitle("Sales");
  const [, navigate] = useLocation();
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const clerkStalled = useClerkStalled();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[] | null>(null);
  const [testers, setTesters] = useState<Tester[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const [c, t] = await Promise.all([listCampaigns(), listTesters()]);
      setCampaigns(c);
      setTesters(t);
      setError(null);
    } catch (e) {
      setError(lineOf(e));
    }
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    if (!user) { navigate(`${basePath}/sign-in?return_to=/admin/sales`); return; }
    fetch(`${BASE_URL}admin/me`, { credentials: "include" })
      .then((r) => r.json() as Promise<{ isAdmin: boolean }>)
      .then(async (me) => {
        setIsAdmin(me.isAdmin);
        if (me.isAdmin) await reload();
      })
      .catch(() => setError("We couldn't reach the server. Try again in a minute."));
  }, [isLoaded, user, navigate, reload]);

  if (clerkStalled) return <ClerkStalledPage />;

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
          <Button variant="outline" onClick={() => void signOut({ redirectUrl: `${basePath}/sign-in?return_to=/admin/sales` })}>Sign out</Button>
        </div>
      </div>
    );
  }

  const side = "text-left px-3 py-2 rounded-lg text-sm font-label";
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
          <button type="button" onClick={() => navigate("/admin/prompts")} className={`${side} text-muted-foreground hover:text-foreground`}>Prompts</button>
          <button type="button" onClick={() => navigate("/admin/report-lab")} className={`${side} text-muted-foreground hover:text-foreground`}>Lab</button>
          <button type="button" onClick={() => navigate("/admin/waitlist")} className={`${side} text-muted-foreground hover:text-foreground`}>Waitlist</button>
          <button type="button" onClick={() => navigate("/admin/sales")} className={`${side} bg-primary/10 text-primary`}>Sales</button>
        </aside>

        <main className="flex-1 min-w-0 max-w-3xl">
          <div className="mb-6">
            <p className="font-label text-xs tracking-[0.2em] uppercase text-primary/80 mb-1">Admin</p>
            <h1 className="font-display text-2xl">Sales</h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              Start a campaign price and give credits to testers. {APP_ENV === "production" ? "This is the live site's list." : "This list is for this test site only. Production has its own."}
            </p>
          </div>

          {error && <div role="alert" className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm">{error}</div>}

          {campaigns === null || testers === null ? (
            !error && <Loader2 className="h-6 w-6 animate-spin text-primary/40" />
          ) : (
            <>
              <CampaignSection rows={campaigns} onChange={() => void reload()} onError={setError} />
              <TesterSection rows={testers} onChange={() => void reload()} onError={setError} />
            </>
          )}
        </main>
      </div>
    </div>
  );
}

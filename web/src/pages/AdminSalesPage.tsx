import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useLocation } from "wouter";
import { useClerk, useUser } from "@clerk/react";
import { Check, Copy, Loader2 } from "lucide-react";
import { CAMPAIGN_ITEMS, MAX_CAMPAIGN_OFF, bundleById, formatEuro } from "@workspace/commerce";
import { Button } from "@/ds/atoms/Button";
import { Input } from "@/ds/atoms/Input";
import { Select } from "@/ds/atoms/Select";
import { Chip, type ChipTone } from "@/ds/atoms/Chip";
import { TextButton } from "@/ds/atoms/TextButton";
import { Alert } from "@/ds/molecules/Alert";
import { Card } from "@/ds/molecules/Card";
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

const CHIP: Record<CampaignStatus, { label: string; tone: ChipTone }> = {
  live: { label: "Live", tone: "teal" },
  scheduled: { label: "Scheduled", tone: "now" },
  ended: { label: "Ended", tone: "neutral" },
};

const price = (cents: number) => <span className="font-numeric">{formatEuro(cents)}</span>;

function CampaignLine({ c }: { c: Campaign }) {
  const items = ITEMS.filter((id) => c.prices[id] !== undefined);
  return (
    <p className="text-caption text-paper-dim mt-0.5">
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
      <code className="font-numeric text-caption text-paper-dim break-all">{link}</code>
      <TextButton
        aria-label={label}
        onClick={() => { void navigator.clipboard.writeText(link).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }); }}
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? "Copied" : "Copy"}
      </TextButton>
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
    <Card as="div" className="mb-4"><form onSubmit={(e) => void submit(e)} className="grid gap-4">
      <Input id="c-name" label="Name" hint="Buyers see this name on the receipt. Up to 40 letters." value={name} onChange={(e) => setName(e.target.value)} maxLength={40} required className="h-10 max-w-sm" />

      <fieldset>
        <legend className="mb-1.5 font-label text-label uppercase text-muted">Products and prices</legend>
        <div className="space-y-2">
          {ITEMS.map((id) => {
            const full = bundleById(id).cents;
            const floor = Math.ceil(full * (1 - MAX_CAMPAIGN_OFF));
            return (
              <div key={id} className="flex items-center gap-3 flex-wrap">
                <label className="flex items-center gap-2 text-small w-44">
                  <input type="checkbox" checked={on[id]} onChange={(e) => setOn({ ...on, [id]: e.target.checked })} className="h-4 w-4 accent-indigo" />
                  {bundleById(id).name}
                </label>
                <Input
                  value={amounts[id]} onChange={(e) => setAmounts({ ...amounts, [id]: e.target.value })}
                  disabled={!on[id]} inputMode="decimal" aria-label={`${bundleById(id).name} campaign price in euros`}
                  className="h-10 w-28 font-numeric"
                />
                <span className="text-caption text-paper-dim">
                  now {price(full)}, lowest {price(floor)}
                </span>
              </div>
            );
          })}
        </div>
      </fieldset>

      <div className="flex gap-4 flex-wrap">
        <Input id="c-start" label="First day" type="date" value={startsOn} min={brusselsToday(new Date())} onChange={(e) => setStartsOn(e.target.value)} required className="h-10 w-44 font-numeric" />
        <Input id="c-end" label="Last day" type="date" value={endsOn} min={startsOn || undefined} onChange={(e) => setEndsOn(e.target.value)} required className="h-10 w-44 font-numeric" />
      </div>
      <p className="text-caption text-paper-dim -mt-2">Days run on Brussels time, from midnight on the first to midnight at the end of the last.</p>

      <fieldset>
        <legend className="mb-1.5 font-label text-label uppercase text-muted">Who sees it</legend>
        <div className="flex gap-5 flex-wrap text-small">
          <label className="flex items-center gap-2"><input type="radio" name="aud" checked={audience === "everyone"} onChange={() => setAudience("everyone")} className="accent-indigo" /> Everyone</label>
          <label className="flex items-center gap-2"><input type="radio" name="aud" checked={audience === "link"} onChange={() => setAudience("link")} className="accent-indigo" /> Only people with the link</label>
        </div>
        {audience === "link" && (
          <div className="mt-3">
            <Input id="c-slug" label="Link word" hint="Lower case letters, numbers and dashes." value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase())} autoCapitalize="none" spellCheck={false} placeholder="waitlist" className="h-10 max-w-xs" />
            {slug.trim() && <CopyLink link={campaignLink(window.location.origin, slug.trim())} />}
          </div>
        )}
      </fieldset>

      {refusal && <Alert>{refusal}</Alert>}

      <div className="flex gap-2">
        <Button type="submit" disabled={busy}>{busy && <Loader2 className="animate-spin" />}Save campaign</Button>
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
      </div>
    </form></Card>
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
        <h2 id="campaigns-h" className="font-label text-kicker uppercase text-indigo-lt">Campaigns</h2>
        {!adding && <Button size="compact" onClick={() => setAdding(true)}>New campaign</Button>}
      </div>

      {adding && <CampaignForm onCancel={() => setAdding(false)} onSaved={() => { setAdding(false); onChange(); }} />}

      {sorted.length === 0 ? (
        <p className="text-small text-paper-dim py-6">No campaigns yet. Buyers see the full prices.</p>
      ) : (
        <ul className="divide-y divide-line rounded-card border border-line bg-surface">
          {sorted.map((c) => {
            const status = campaignStatus(c, now);
            return (
              <li key={c.id} className="px-4 py-3 grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_auto_auto] gap-x-4 gap-y-2 items-center">
                <div className="min-w-0">
                  <p className="text-small">{c.name}</p>
                  <CampaignLine c={c} />
                  {c.audience === "link" && c.slug && status !== "ended" && <CopyLink link={campaignLink(window.location.origin, c.slug)} />}
                </div>
                <Chip tone={CHIP[status].tone}>{CHIP[status].label}</Chip>
                <div className="col-span-2 sm:col-span-1 sm:w-24 text-right">
                  {status !== "ended" && <Button variant="secondary" size="compact" onClick={() => setEnding(c)}>End now</Button>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <p className="text-caption text-paper-dim mt-2">
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
        <p className="break-all text-small">{t.email}</p>
        <p className="text-caption text-paper-dim mt-0.5">
          tester · <span className="font-numeric">{given}</span> {given === 1 ? "credit" : "credits"} · <span className="font-numeric">{t.used ?? 0}</span> used
        </p>
      </div>
      <div className="flex items-center gap-1.5 justify-end">
        <Select
          value={count} onChange={(e) => setCount(Number(e.target.value) as GrantCount)} aria-label={`Credits to give ${t.email}`}
          className="h-9 w-20 font-numeric"
        >
          {GRANT_COUNTS.map((n) => <option key={n} value={n}>{n}</option>)}
        </Select>
        <Button variant="secondary" size="compact" disabled={busy} onClick={() => void grant()}>Grant {count}</Button>
        <Button variant="secondary" size="compact" onClick={() => onRemove(t)}>Remove</Button>
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
        <h2 id="testers-h" className="font-label text-kicker uppercase text-indigo-lt">Testers</h2>
        {!adding && <Button size="compact" variant="secondary" onClick={() => setAdding(true)}>Add a tester by email</Button>}
      </div>

      {adding && (
        <Card as="div" className="mb-4"><form onSubmit={(e) => void add(e)} className="grid gap-3">
          <Input id="t-email" label="Email" hint="The person needs an account already. Use the email they signed up with." type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoCapitalize="none" className="h-10 max-w-sm" />
          {refusal && <Alert>{refusal}</Alert>}
          <div className="flex gap-2">
            <Button type="submit" disabled={busy}>{busy && <Loader2 className="animate-spin" />}Add tester</Button>
            <Button type="button" variant="secondary" onClick={() => { setAdding(false); setRefusal(null); }}>Cancel</Button>
          </div>
        </form></Card>
      )}

      <ul className="divide-y divide-line rounded-card border border-line bg-surface">
        {people.map((t) => <TesterRow key={t.userId} t={t} onChange={onChange} onError={onError} onRemove={setRemoving} />)}
        {APP_ENV !== "production" && (
          <li className="px-4 py-3 grid grid-cols-[1fr_auto] gap-x-4 items-center">
            <div className="min-w-0">
              <p className="text-small">QA pair (staging only)</p>
              <p className="text-caption text-paper-dim mt-0.5">qa-a and qa-b, made and reset by staging</p>
            </div>
            <Chip tone="teal">Auto</Chip>
          </li>
        )}
        {APP_ENV === "staging" && (
          <li className="px-4 py-3 grid grid-cols-[1fr_auto] gap-x-4 items-center">
            <div className="min-w-0">
              <p className="text-small">QA account (staging only)</p>
              <p className="text-caption text-paper-dim mt-0.5">
                {qaAccount ? "/qa signs in with this email. Staging makes it and tops up its test credits at each start." : "Staging makes it at its next start."}
              </p>
              {qaAccount && <CopyLink link={qaAccount.email} label="Copy the QA account's email" />}
            </div>
            <Chip tone="teal">Auto</Chip>
          </li>
        )}
        {people.length === 0 && APP_ENV === "production" && (
          <li className="px-4 py-6 text-small text-paper-dim">No testers yet. Add one by the email on their account.</li>
        )}
      </ul>
      <p className="text-caption text-paper-dim mt-2">Granted credits show in History as "From Stars Decoded" and count as test credits.</p>

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

  if (!isLoaded || isAdmin === null) return <AdminLoading error={error} />;

  if (isAdmin === false) {
    return <AdminDenied onSignOut={() => void signOut({ redirectUrl: `${basePath}/sign-in?return_to=/admin/sales` })} />;
  }

  return (
    <AdminShell
      current="/admin/sales"
      title="Sales"
      lede={<>Start a campaign price and give credits to testers. {APP_ENV === "production" ? "This is the live site's list." : "This list is for this test site only. Production has its own."}</>}
    >
      <div className="grid max-w-3xl gap-3">
        {error && <Alert>{error}</Alert>}

        {campaigns === null || testers === null ? (
          !error && <Loader2 className="h-6 w-6 animate-spin text-muted" />
        ) : (
          <>
            <CampaignSection rows={campaigns} onChange={() => void reload()} onError={setError} />
            <TesterSection rows={testers} onChange={() => void reload()} onError={setError} />
          </>
        )}
      </div>
    </AdminShell>
  );
}

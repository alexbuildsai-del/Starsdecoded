import { PERSONAL_REPORT } from "@/lib/product";
import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useClerk, useUser } from "@clerk/react";
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  RotateCcw,
  Save,
  AlertCircle,
  Eye,
} from "lucide-react";
import { Button } from "@/ds/atoms/Button";
import { Textarea } from "@/components/ui/textarea";
import { BASE_URL } from "@/lib/api";
import { Alert } from "@/ds/molecules/Alert";
import { Card } from "@/ds/molecules/Card";
import { Chip } from "@/ds/atoms/Chip";
import { SegmentedControl } from "@/ds/molecules/SegmentedControl";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/ds/organisms/Dialog";
import { AdminDenied, AdminLoading, AdminShell } from "@/components/lab/AdminShell";
import { ClerkStalledPage } from "@/components/ClerkStalled";
import { useClerkStalled } from "@/hooks/useClerkStalled";
import { usePageTitle } from "@/lib/page-title";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

interface PromptEntry {
  key: string;
  category: string;
  subcategory: string;
  label: string;
  systemPrompt: string | null;
  userPrompt: string | null;
  defaultSystemPrompt: string | null;
  defaultUserPrompt: string | null;
  isOverridden: boolean;
  updatedAt: string | null;
}

/** One tab per prompt family `GET /admin/prompts` serves, by its rows' `category` (`promptDefaults.ts`). */
type Tab = "natal" | "pair" | "timeline" | "ask";

const TAB_LABELS: Record<Tab, string> = {
  natal: PERSONAL_REPORT,
  pair: "Compatibility",
  timeline: "Timeline",
  ask: "Ask",
};

const TABS = Object.keys(TAB_LABELS) as Tab[];

/** The lens reaches the model through the brief, so one prompt serves all three (ADR-40). */
const LENS_NOTE = "One prompt per chapter serves the three lenses: partners, parent and child, family. The lens, its register and who the parent is reach the model through the pair brief.";

async function apiFetch(path: string, opts?: RequestInit) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, { credentials: "include", ...opts });
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { message?: string };
    throw new Error(body.message ?? `HTTP ${res.status}`);
  }
  return res.json();
}

interface PreviewModalProps {
  open: boolean;
  label: string;
  loading: boolean;
  text: string | null;
  error: string | null;
  onClose: () => void;
}

function PreviewModal({ open, label, loading, text, error, onClose }: PreviewModalProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent aria-describedby={undefined} className="flex max-h-[80vh] flex-col sm:max-w-2xl">
        <DialogHeader>
          <p className="m-0 font-label text-label uppercase text-label-dim">AI Preview</p>
          <DialogTitle>{label}</DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center gap-3 py-8 text-paper-dim">
              <Loader2 className="h-5 w-5 animate-spin text-muted" />
              <span className="text-small">Calling AI…</span>
            </div>
          )}
          {error && !loading && (
            <div className="flex items-start gap-2 text-small text-error">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {!loading && !error && text !== null && text.length > 0 && (
            <pre className="whitespace-pre-wrap font-numeric text-small leading-relaxed text-paper">
              {text}
            </pre>
          )}
          {!loading && !error && text !== null && text.length === 0 && (
            <p className="py-8 text-center text-small text-paper-dim">
              The AI returned an empty response.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button size="compact" variant="secondary" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Per-key format notes shown under the editor. Empty on purpose: since V3 the
// response shape is applied by code from each section's schema and cannot be
// changed here, so an override only ever edits tone and instructions.
const FORMAT_NOTES: Record<string, string> = {};

function PromptCard({ entry, readOnly, onSaved }: { entry: PromptEntry; readOnly: boolean; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [system, setSystem] = useState(entry.systemPrompt ?? "");
  const [user, setUser] = useState(entry.userPrompt ?? "");
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [previewText, setPreviewText] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const defaultSystem = entry.defaultSystemPrompt ?? "";
  const defaultUser = entry.defaultUserPrompt ?? "";
  const dirty = system !== (entry.systemPrompt ?? "") || user !== (entry.userPrompt ?? "");

  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setSystem(entry.systemPrompt ?? "");
    setUser(entry.userPrompt ?? "");
  }, [entry.systemPrompt, entry.userPrompt]);

  const showSuccess = () => {
    setSuccess(true);
    if (successTimerRef.current) clearTimeout(successTimerRef.current);
    successTimerRef.current = setTimeout(() => setSuccess(false), 2000);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await apiFetch(`admin/prompts/${encodeURIComponent(entry.key)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemPrompt: system || null,
          userPrompt: user || null,
        }),
      });
      showSuccess();
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm(`Reset "${entry.label}" to default? This will remove your customisation.`)) return;
    setResetting(true);
    setError(null);
    try {
      await apiFetch(`admin/prompts/${encodeURIComponent(entry.key)}`, { method: "DELETE" });
      setSystem(defaultSystem);
      setUser(defaultUser);
      showSuccess();
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setResetting(false);
    }
  };

  const handlePreview = async () => {
    setPreviewOpen(true);
    setPreviewing(true);
    setPreviewText(null);
    setPreviewError(null);

    const effectiveSystem = system || defaultSystem || null;
    const effectiveUser = user || defaultUser || null;

    try {
      const data = await apiFetch("admin/prompts/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemPrompt: effectiveSystem,
          userPrompt: effectiveUser,
        }),
      }) as { text: string };
      setPreviewText(data.text);
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : "Preview failed");
    } finally {
      setPreviewing(false);
    }
  };

  const hasSystem = defaultSystem || system;
  const hasUser = defaultUser || user;

  return (
    <>
      <PreviewModal
        open={previewOpen}
        label={entry.label}
        loading={previewing}
        text={previewText}
        error={previewError}
        onClose={() => setPreviewOpen(false)}
      />
      <Card as="div" variant={entry.isOverridden ? "tint" : "surface"} className="gap-0 overflow-hidden p-0 sm:p-0">
        <Button
          variant="secondary"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="h-auto min-h-14 w-full justify-between gap-3 rounded-none border-0 px-5 py-4 text-left hover:bg-raised"
        >
          <div className="flex min-w-0 items-center gap-3">
            <span className="truncate font-label text-small text-paper">{entry.label}</span>
            {entry.isOverridden && (
              <Chip tone="now" className="shrink-0">Customised</Chip>
            )}
            {dirty && (
              <Chip tone="brass" className="shrink-0">Unsaved</Chip>
            )}
          </div>
          {open ? <ChevronUp className="h-4 w-4 text-paper-dim shrink-0" /> : <ChevronDown className="h-4 w-4 text-paper-dim shrink-0" />}
        </Button>

        {open && (
          <div className="flex flex-col gap-4 border-t border-line px-5 pb-5 pt-4">
            {error && <Alert>{error}</Alert>}

            {hasSystem && (
              <div className="flex flex-col gap-1.5">
                <label className="font-label text-label uppercase text-muted">
                  System Prompt
                </label>
                <Textarea
                  value={system}
                  onChange={(e) => setSystem(e.target.value)}
                  readOnly={readOnly}
                  className="min-h-[140px] resize-y bg-ground font-numeric text-data"
                  placeholder="Leave blank to use default…"
                />
                {defaultSystem && system !== defaultSystem && (
                  <p className="text-data-sm text-paper-dim">
                    Default: <span className="italic">{defaultSystem.slice(0, 80)}…</span>
                  </p>
                )}
              </div>
            )}

            {hasUser && (
              <div className="flex flex-col gap-1.5">
                <label className="font-label text-label uppercase text-muted">
                  User Prompt
                </label>
                <Textarea
                  value={user}
                  onChange={(e) => setUser(e.target.value)}
                  readOnly={readOnly}
                  className="min-h-[200px] resize-y bg-ground font-numeric text-data"
                  placeholder="Leave blank to use default…"
                />
                {defaultUser && user !== defaultUser && (
                  <p className="text-data-sm text-paper-dim">
                    Default: <span className="italic">{defaultUser.slice(0, 80)}…</span>
                  </p>
                )}
                {FORMAT_NOTES[entry.key] && (
                  <div className="flex items-start gap-2 rounded-card border border-brass/20 bg-brass/5 px-3 py-2">
                    <AlertCircle className="h-3.5 w-3.5 text-brass shrink-0 mt-0.5" />
                    <p className="text-data-sm text-brass/80 font-numeric whitespace-pre-wrap leading-relaxed">
                      {FORMAT_NOTES[entry.key]}
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-2 flex-wrap">
              {!readOnly && (
                <Button
                  size="compact"
                  onClick={handleSave}
                  disabled={saving || resetting}
                >
                  {saving ? <Loader2 className="animate-spin" /> : <Save />}
                  Save
                </Button>
              )}
              <Button
                size="compact"
                variant="secondary"
                onClick={handlePreview}
                disabled={saving || resetting || previewing}
              >
                {previewing ? <Loader2 className="animate-spin" /> : <Eye />}
                Preview
              </Button>
              {entry.isOverridden && !readOnly && (
                <Button
                  size="compact"
                  variant="secondary"
                  onClick={handleReset}
                  disabled={saving || resetting}
                >
                  {resetting ? <Loader2 className="animate-spin" /> : <RotateCcw />}
                  Reset to default
                </Button>
              )}
              {success && (
                <span className="font-label text-data text-teal">Saved!</span>
              )}
            </div>

            {entry.updatedAt && (
              <p className="text-data-sm text-paper-dim">
                Last saved: {new Date(entry.updatedAt).toLocaleString()}
              </p>
            )}
          </div>
        )}
      </Card>
    </>
  );
}

export default function AdminPromptsPage() {
  usePageTitle("Prompt admin");

  const [, navigate] = useLocation();
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const clerkStalled = useClerkStalled();

  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [readOnly, setReadOnly] = useState(false);
  const [prompts, setPrompts] = useState<PromptEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [tab, setTab] = useState<Tab>("natal");



  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const meData = await apiFetch("admin/me") as { isAdmin: boolean; promptsReadOnly?: boolean };
      setIsAdmin(meData.isAdmin);
      setReadOnly(meData.promptsReadOnly === true);
      if (!meData.isAdmin) {
        setLoading(false);
        return;
      }
      const promptsData = (await apiFetch("admin/prompts")) as PromptEntry[];
      setPrompts(promptsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  };



  const signedIn = Boolean(user);
  useEffect(() => {
    if (isLoaded) {
      if (!signedIn) {
        navigate(`${basePath}/sign-in?return_to=/admin/prompts`);
      } else {
        loadData();
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, signedIn]);

  if (clerkStalled) return <ClerkStalledPage />;

  if (!isLoaded || loading) return <AdminLoading error={null} />;

  if (isAdmin === false) {
    return <AdminDenied onSignOut={() => void signOut({ redirectUrl: `${basePath}/sign-in?return_to=/admin/prompts` })} />;
  }

  if (error) {
    return (
      <div className="grid min-h-screen place-items-center bg-ground px-6 text-paper">
        <div className="max-w-md text-center">
          <AlertCircle className="mx-auto mb-4 h-10 w-10 text-error" />
          <p className="mb-4 text-small text-paper-dim">{error}</p>
          <Button variant="secondary" onClick={() => loadData()}>Retry</Button>
        </div>
      </div>
    );
  }

  const displayedPrompts = prompts.filter((p) => p.category === tab);

  const overrideCount = prompts.filter((p) => p.isOverridden).length;

  return (
    <AdminShell
      current="/admin/prompts"
      title="Prompt Templates"
      lede={
        <>
          {readOnly
            ? "The prompts this environment uses for reports, Timeline and Ask."
            : "Edit the AI prompts for reports, Timeline and Ask. Changes take effect on the next report, reading or answer."}
          {overrideCount > 0 && (
            <> <span className="text-indigo-lt">{overrideCount} customised.</span></>
          )}
        </>
      }
    >
      {readOnly && (
        <Alert tone="notice" className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-brass" />
          <p className="m-0">
            Read-only here. Prompts are edited on staging and promoted to production with each release.
          </p>
        </Alert>
      )}

      <SegmentedControl<Tab>
        aria-label="Prompt families"
        className="w-fit max-w-full flex-wrap"
        options={TABS.map((id) => ({ id, label: TAB_LABELS[id] }))}
        value={tab}
        onChange={setTab}
      />

      {tab === "pair" && (
        <p className="max-w-prose text-caption text-paper-dim">{LENS_NOTE}</p>
      )}

      <div className="flex flex-col gap-3">
        {displayedPrompts.length === 0 ? (
          <p className="py-8 text-center text-small text-paper-dim">No prompts in this section.</p>
        ) : (
          displayedPrompts.map((p) => (
            <PromptCard key={p.key} entry={p} readOnly={readOnly} onSaved={loadData} />
          ))
        )}
      </div>
    </AdminShell>
  );
}

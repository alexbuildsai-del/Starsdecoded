import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useUser } from "@clerk/react";
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  RotateCcw,
  Save,
  AlertCircle,
  Eye,
  X,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { BASE_URL } from "@/lib/api";

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

type Tab = "natal" | "synastry";
type RelType = "romantic" | "sibling" | "parent_child" | "custom";

const TAB_LABELS: Record<Tab, string> = {
  natal: "Natal Report",
  synastry: "Synastry",
};

const REL_TYPE_LABELS: Record<RelType, string> = {
  romantic: "Romantic",
  sibling: "Sibling",
  parent_child: "Parent / Child",
  custom: "Custom",
};

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
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-2xl rounded-2xl border border-border/60 bg-[#0D1117] shadow-2xl flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/40 shrink-0">
          <div>
            <p className="font-label text-[10px] tracking-[0.2em] uppercase text-primary/70 mb-0.5">AI Preview</p>
            <h2 className="font-display text-base font-light text-foreground">{label}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-card/60"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 min-h-0">
          {loading && (
            <div className="flex items-center gap-3 text-muted-foreground py-8 justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-primary/60" />
              <span className="text-sm">Calling AI…</span>
            </div>
          )}
          {error && !loading && (
            <div className="flex items-start gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          {!loading && !error && text !== null && text.length > 0 && (
            <pre className="text-sm text-foreground/90 whitespace-pre-wrap font-mono leading-relaxed">
              {text}
            </pre>
          )}
          {!loading && !error && text !== null && text.length === 0 && (
            <p className="text-sm text-muted-foreground py-8 text-center">
              The AI returned an empty response.
            </p>
          )}
        </div>

        <div className="px-5 py-3 border-t border-border/40 shrink-0 flex justify-end">
          <Button size="sm" variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
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
      <div
        className={`rounded-xl border ${entry.isOverridden ? "border-primary/40 bg-primary/5" : "border-border/60 bg-card/40"} backdrop-blur-sm overflow-hidden`}
      >
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="w-full text-left px-5 py-4 flex items-center justify-between gap-3 hover:bg-card/60 transition-colors"
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="font-label text-sm text-foreground/90 truncate">{entry.label}</span>
            {entry.isOverridden && (
              <span className="shrink-0 text-[10px] font-label tracking-[0.15em] uppercase text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                Customised
              </span>
            )}
            {dirty && (
              <span className="shrink-0 text-[10px] font-label tracking-[0.15em] uppercase text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full">
                Unsaved
              </span>
            )}
          </div>
          {open ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
        </button>

        {open && (
          <div className="px-5 pb-5 flex flex-col gap-4 border-t border-border/40 pt-4">
            {error && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {hasSystem && (
              <div className="flex flex-col gap-1.5">
                <label className="font-label text-xs tracking-[0.12em] uppercase text-muted-foreground">
                  System Prompt
                </label>
                <Textarea
                  value={system}
                  onChange={(e) => setSystem(e.target.value)}
                  readOnly={readOnly}
                  className="font-mono text-xs min-h-[140px] resize-y bg-background/60"
                  placeholder="Leave blank to use default…"
                />
                {defaultSystem && system !== defaultSystem && (
                  <p className="text-[11px] text-muted-foreground">
                    Default: <span className="italic">{defaultSystem.slice(0, 80)}…</span>
                  </p>
                )}
              </div>
            )}

            {hasUser && (
              <div className="flex flex-col gap-1.5">
                <label className="font-label text-xs tracking-[0.12em] uppercase text-muted-foreground">
                  User Prompt
                </label>
                <Textarea
                  value={user}
                  onChange={(e) => setUser(e.target.value)}
                  readOnly={readOnly}
                  className="font-mono text-xs min-h-[200px] resize-y bg-background/60"
                  placeholder="Leave blank to use default…"
                />
                {defaultUser && user !== defaultUser && (
                  <p className="text-[11px] text-muted-foreground">
                    Default: <span className="italic">{defaultUser.slice(0, 80)}…</span>
                  </p>
                )}
                {FORMAT_NOTES[entry.key] && (
                  <div className="flex items-start gap-2 rounded-lg border border-amber-400/20 bg-amber-400/5 px-3 py-2">
                    <AlertCircle className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-amber-300/80 font-mono whitespace-pre-wrap leading-relaxed">
                      {FORMAT_NOTES[entry.key]}
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-2 flex-wrap">
              {!readOnly && (
                <Button
                  size="sm"
                  className="gradient-primary text-white border-0 font-label font-medium"
                  onClick={handleSave}
                  disabled={saving || resetting}
                >
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
                  Save
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={handlePreview}
                disabled={saving || resetting || previewing}
              >
                {previewing ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Eye className="h-3.5 w-3.5 mr-1.5" />}
                Preview
              </Button>
              {entry.isOverridden && !readOnly && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleReset}
                  disabled={saving || resetting}
                >
                  {resetting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <RotateCcw className="h-3.5 w-3.5 mr-1.5" />}
                  Reset to default
                </Button>
              )}
              {success && (
                <span className="text-xs text-green-400 font-label">Saved!</span>
              )}
            </div>

            {entry.updatedAt && (
              <p className="text-[11px] text-muted-foreground">
                Last saved: {new Date(entry.updatedAt).toLocaleString()}
              </p>
            )}
          </div>
        )}
      </div>
    </>
  );
}

export default function AdminPromptsPage() {
  const [, navigate] = useLocation();
  const { user, isLoaded } = useUser();

  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [readOnly, setReadOnly] = useState(false);
  const [prompts, setPrompts] = useState<PromptEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [tab, setTab] = useState<Tab>("natal");
  const [relType, setRelType] = useState<RelType>("romantic");



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



  useEffect(() => {
    if (isLoaded) {
      if (!user) {
        navigate(`${basePath}/sign-in?return_to=/admin/prompts`);
      } else {
        loadData();
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, user]);

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-background bg-stars text-foreground flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary/40" />
      </div>
    );
  }

  if (isAdmin === false) {
    return (
      <div className="min-h-screen bg-background bg-stars text-foreground flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <AlertCircle className="h-10 w-10 text-destructive mx-auto mb-4" />
          <h1 className="font-display text-2xl font-light mb-2">Access Denied</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Your account does not have admin access. Set the <code className="font-mono">ADMIN_USER_ID</code> env var to your Clerk user ID to enable this panel.
          </p>
          <Button variant="outline" onClick={() => navigate("/dashboard")}>Back to Dashboard</Button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background bg-stars text-foreground flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <AlertCircle className="h-10 w-10 text-destructive mx-auto mb-4" />
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <Button variant="outline" onClick={() => loadData()}>Retry</Button>
        </div>
      </div>
    );
  }

  const filteredByTab = prompts.filter((p) => p.category === tab);

  const displayedPrompts = tab === "synastry"
    ? filteredByTab.filter((p) => p.subcategory === relType)
    : filteredByTab;

  const overrideCount = prompts.filter((p) => p.isOverridden).length;

  return (
    <div className="min-h-screen bg-background bg-stars text-foreground">
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="font-display text-lg gradient-text"
          >
            Astra
          </button>
          <div className="flex items-center gap-4">
            <span className="font-label text-xs tracking-[0.15em] uppercase text-muted-foreground hidden sm:block">
              Admin
            </span>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-20 pb-20 flex gap-6">
        {/* Sidebar */}
        <aside className="hidden md:flex flex-col gap-1 w-48 shrink-0 pt-2">
          <p className="font-label text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-2 px-3">
            Admin
          </p>
          <button
            type="button"
            onClick={() => navigate("/admin/prompts")}
            className="text-left px-3 py-2 rounded-lg text-sm font-label bg-primary/10 text-primary"
          >
            Prompts
          </button>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0">
          <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="font-label text-xs tracking-[0.2em] uppercase text-primary/80 mb-1">Admin</p>
              <h1 className="font-display text-2xl font-light">Prompt Templates</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {readOnly
                  ? "The prompts this environment generates reports with."
                  : "Edit AI prompts used in report generation. Changes take effect on the next report."}
                {overrideCount > 0 && (
                  <> <span className="text-primary">{overrideCount} customised.</span></>
                )}
              </p>
            </div>
          </div>

          {readOnly && (
            <div
              role="status"
              className="mb-4 rounded-lg border border-amber-400/30 bg-amber-400/10 px-4 py-3 flex items-start gap-3 text-amber-200"
            >
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <p className="text-sm leading-relaxed">
                Read-only here. Prompts are edited on staging and promoted to production with each release.
              </p>
            </div>
          )}

          {/* Tab bar */}
          <div className="mb-4 flex gap-1 p-1 rounded-lg border border-border/60 bg-card/40 w-fit">
            {(["natal", "synastry"] as Tab[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`px-3 py-1.5 rounded-md text-xs font-label tracking-wide transition-colors ${
                  tab === t
                    ? "bg-primary/20 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {TAB_LABELS[t]}
              </button>
            ))}
          </div>

          {/* Synastry relationship-type selector */}
          {tab === "synastry" && (
            <div className="mb-4 flex gap-1 p-1 rounded-lg border border-border/60 bg-card/40 w-fit">
              {(["romantic", "sibling", "parent_child", "custom"] as RelType[]).map((rt) => (
                <button
                  key={rt}
                  type="button"
                  onClick={() => setRelType(rt)}
                  className={`px-3 py-1.5 rounded-md text-xs font-label tracking-wide transition-colors ${
                    relType === rt
                      ? "bg-violet-500/20 text-violet-300"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {REL_TYPE_LABELS[rt]}
                </button>
              ))}
            </div>
          )}


          {/* Prompt cards */}
          <div className="flex flex-col gap-3">
            {displayedPrompts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No prompts in this section.</p>
            ) : (
              displayedPrompts.map((p) => (
                <PromptCard key={p.key} entry={p} readOnly={readOnly} onSaved={loadData} />
              ))
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

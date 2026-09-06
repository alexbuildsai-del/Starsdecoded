import { useEffect, useMemo, useState } from "react";
import { useLocation, Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  Save,
  Trash2,
  RefreshCcw,
  AlertCircle,
  Search,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  useGetMeaningLibraryStats,
  useListMeaningLibraryEntries,
  updateMeaningLibraryEntry,
  deleteMeaningLibraryEntry,
  getListMeaningLibraryEntriesQueryKey,
  getGetMeaningLibraryStatsQueryKey,
  type MeaningLibraryEntry,
} from "@workspace/api-client-react";

const KIND_LABELS: Record<string, string> = {
  planet_sign: "Planet × Sign",
  planet_house: "Planet × House",
  aspect: "Aspect",
};

const KINDS = ["planet_sign", "planet_house", "aspect"] as const;
type KindOption = (typeof KINDS)[number];

const PAGE_SIZE = 50;
const STORAGE_KEY = "meaning_library_admin_key";

// ---------------------------------------------------------------------------
// Payload validation per kind.
// ---------------------------------------------------------------------------

function validatePayload(kind: KindOption, payload: unknown): string | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return "Payload must be a JSON object.";
  }
  const obj = payload as Record<string, unknown>;
  if (kind === "planet_sign" || kind === "planet_house") {
    if (typeof obj.summary !== "string" || obj.summary.trim() === "") {
      return "Payload must have a non-empty `summary` string.";
    }
    return null;
  }
  // aspect
  for (const field of ["dynamic", "tension", "behavior", "growth"] as const) {
    if (typeof obj[field] !== "string" || (obj[field] as string).trim() === "") {
      return `Payload must have a non-empty \`${field}\` string.`;
    }
  }
  return null;
}

function previewLine(entry: MeaningLibraryEntry): string {
  const p = entry.payload as Record<string, unknown>;
  const candidate = (p.summary ?? p.dynamic ?? "") as string;
  const text = typeof candidate === "string" ? candidate : "";
  return text.length > 110 ? text.slice(0, 109) + "…" : text;
}

// ---------------------------------------------------------------------------
// Admin key flow.
// ---------------------------------------------------------------------------

function useAdminKey(): {
  adminKey: string | null;
  setAdminKey: (key: string) => void;
  clearAdminKey: () => void;
} {
  const [adminKey, setAdminKeyState] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return window.sessionStorage.getItem(STORAGE_KEY);
  });

  // On first mount, check for `?key=` in the URL and persist it.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    const queryKey = url.searchParams.get("key");
    if (queryKey) {
      window.sessionStorage.setItem(STORAGE_KEY, queryKey);
      setAdminKeyState(queryKey);
      url.searchParams.delete("key");
      window.history.replaceState({}, "", url.pathname + url.search + url.hash);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    adminKey,
    setAdminKey: (key: string) => {
      window.sessionStorage.setItem(STORAGE_KEY, key);
      setAdminKeyState(key);
    },
    clearAdminKey: () => {
      window.sessionStorage.removeItem(STORAGE_KEY);
      setAdminKeyState(null);
    },
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function MeaningLibraryAdminPage() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { adminKey, setAdminKey, clearAdminKey } = useAdminKey();

  const [kind, setKind] = useState<KindOption>("planet_sign");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [selectedEntry, setSelectedEntry] = useState<MeaningLibraryEntry | null>(null);
  const [editorValue, setEditorValue] = useState("");
  const [editorError, setEditorError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [pendingKeyInput, setPendingKeyInput] = useState("");

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setOffset(0);
    }, 250);
    return () => clearTimeout(t);
  }, [search]);

  // Auth header for every request.
  const requestOptions = useMemo(
    () => (adminKey ? { headers: { "x-admin-key": adminKey } } : undefined),
    [adminKey],
  );

  const statsQueryKey = getGetMeaningLibraryStatsQueryKey();
  const statsQuery = useGetMeaningLibraryStats({
    request: requestOptions,
    query: { enabled: !!adminKey, retry: false, queryKey: statsQueryKey },
  });

  const listParams = {
    kind,
    search: debouncedSearch || undefined,
    limit: PAGE_SIZE,
    offset,
  };

  const listQueryKey = getListMeaningLibraryEntriesQueryKey(listParams);
  const listQuery = useListMeaningLibraryEntries(listParams, {
    request: requestOptions,
    query: { enabled: !!adminKey, retry: false, queryKey: listQueryKey },
  });

  // Reset selected entry when kind changes
  useEffect(() => {
    setSelectedEntry(null);
    setOffset(0);
  }, [kind]);

  // When selected entry changes, sync the editor.
  useEffect(() => {
    if (selectedEntry) {
      setEditorValue(JSON.stringify(selectedEntry.payload, null, 2));
      setEditorError(null);
    } else {
      setEditorValue("");
      setEditorError(null);
    }
  }, [selectedEntry]);

  const isAuthError =
    (statsQuery.error as { status?: number } | undefined)?.status === 401 ||
    (listQuery.error as { status?: number } | undefined)?.status === 401;

  // ---------------------------------------------------------------------
  // Auth gate
  // ---------------------------------------------------------------------
  if (!adminKey || isAuthError) {
    return (
      <div className="min-h-screen bg-background bg-stars text-foreground flex items-center justify-center px-6">
        <div className="max-w-md w-full p-8 rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm">
          <p className="font-label text-xs tracking-[0.2em] uppercase text-primary/80 mb-3">
            Admin
          </p>
          <h1 className="font-display text-2xl font-light mb-2">Meaning Library</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Enter the admin key to manage the pre-generated meaning library. Or pass
            it via <code className="font-mono">?key=…</code> in the URL.
          </p>
          {isAuthError && (
            <div className="mb-4 flex items-start gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>The provided admin key was rejected.</span>
            </div>
          )}
          <Input
            type="password"
            placeholder="Admin key"
            value={pendingKeyInput}
            onChange={(e) => setPendingKeyInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && pendingKeyInput.trim()) {
                setAdminKey(pendingKeyInput.trim());
                setPendingKeyInput("");
              }
            }}
            className="mb-4"
          />
          <div className="flex gap-2">
            <Button
              className="flex-1 gradient-primary text-white border-0 font-label font-medium"
              disabled={!pendingKeyInput.trim()}
              onClick={() => {
                setAdminKey(pendingKeyInput.trim());
                setPendingKeyInput("");
              }}
            >
              Unlock
            </Button>
            <Button variant="outline" onClick={() => navigate("/dashboard")}>
              Back
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------
  // Save / Delete handlers
  // ---------------------------------------------------------------------
  const handleSave = async () => {
    if (!selectedEntry) return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(editorValue);
    } catch (err) {
      setEditorError(`Invalid JSON: ${err instanceof Error ? err.message : String(err)}`);
      return;
    }
    const validationError = validatePayload(selectedEntry.kind as KindOption, parsed);
    if (validationError) {
      setEditorError(validationError);
      return;
    }
    setEditorError(null);
    setIsSaving(true);
    try {
      const updated = await updateMeaningLibraryEntry(
        selectedEntry.kind as KindOption,
        selectedEntry.key,
        { payload: parsed as Record<string, unknown> },
        requestOptions,
      );
      setSelectedEntry(updated);
      await queryClient.invalidateQueries({ queryKey: getListMeaningLibraryEntriesQueryKey(listParams) });
    } catch (err) {
      setEditorError(`Save failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedEntry) return;
    if (!window.confirm(`Delete entry "${selectedEntry.key}"? It will be regenerated on next lookup.`)) {
      return;
    }
    setIsDeleting(true);
    try {
      await deleteMeaningLibraryEntry(
        selectedEntry.kind as KindOption,
        selectedEntry.key,
        requestOptions,
      );
      setSelectedEntry(null);
      await queryClient.invalidateQueries({ queryKey: getListMeaningLibraryEntriesQueryKey(listParams) });
      await queryClient.invalidateQueries({ queryKey: getGetMeaningLibraryStatsQueryKey() });
    } catch (err) {
      setEditorError(`Delete failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const entries = listQuery.data?.entries ?? [];
  const total = listQuery.data?.total ?? 0;
  const stats = statsQuery.data;

  // ---------------------------------------------------------------------
  // Main UI
  // ---------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-background bg-stars text-foreground">
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="font-display text-lg gradient-text"
          >
            Astra
          </button>
          <div className="flex items-center gap-3">
            <span className="font-label text-xs tracking-[0.15em] uppercase text-muted-foreground">
              Meaning Library Admin
            </span>
            <Button variant="ghost" size="sm" onClick={clearAdminKey}>
              Sign out
            </Button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 pt-20 pb-20 flex gap-6">
        {/* Sidebar */}
        <aside className="hidden md:flex flex-col gap-1 w-48 shrink-0 pt-2">
          <p className="font-label text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-2 px-3">
            Admin
          </p>
          <Link
            to="/admin/prompts"
            className="px-3 py-2 rounded-lg text-sm font-label text-muted-foreground hover:text-foreground hover:bg-card/60 transition-colors"
          >
            Prompts
          </Link>
          <div className="px-3 py-2 rounded-lg text-sm font-label bg-primary/10 text-primary">
            Meaning Library
          </div>
        </aside>

      <main className="flex-1 min-w-0">
        {/* Stats */}
        <div className="mb-8 grid grid-cols-2 md:grid-cols-4 gap-3">
          {(["planet_sign", "planet_house", "aspect"] as KindOption[]).map((k) => (
            <div
              key={k}
              className="p-4 rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm"
            >
              <p className="font-label text-[10px] tracking-[0.18em] uppercase text-muted-foreground mb-1">
                {KIND_LABELS[k]}
              </p>
              <p className="font-display text-2xl font-light">
                {stats?.byKind?.[k] ?? "—"}
              </p>
            </div>
          ))}
          <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 backdrop-blur-sm">
            <p className="font-label text-[10px] tracking-[0.18em] uppercase text-primary/70 mb-1">
              Total
            </p>
            <p className="font-display text-2xl font-light text-primary">
              {stats?.total ?? "—"}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <div className="flex gap-1 p-1 rounded-lg border border-border/60 bg-card/40">
            {KINDS.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                className={`px-3 py-1.5 rounded-md text-xs font-label tracking-wide transition-colors ${
                  kind === k
                    ? "bg-primary/20 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {KIND_LABELS[k]}
              </button>
            ))}
          </div>

          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by key…"
              className="pl-9"
            />
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              listQuery.refetch();
              statsQuery.refetch();
            }}
          >
            <RefreshCcw className="h-3.5 w-3.5 mr-1.5" />
            Refresh
          </Button>
        </div>

        {/* Two-column layout: list + side panel */}
        <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-6">
          {/* Entries list */}
          <div className="rounded-xl border border-border/60 bg-card/40 backdrop-blur-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-border/60 flex items-center justify-between">
              <p className="font-label text-xs tracking-[0.15em] uppercase text-muted-foreground">
                {total} {total === 1 ? "entry" : "entries"}
              </p>
              {listQuery.isFetching && (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
              )}
            </div>

            {listQuery.isLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-primary/40" />
              </div>
            ) : listQuery.isError ? (
              <div className="flex flex-col items-center py-16 text-center px-6">
                <AlertCircle className="h-6 w-6 text-destructive mb-2" />
                <p className="text-sm text-muted-foreground mb-3">Failed to load entries.</p>
                <Button size="sm" variant="outline" onClick={() => listQuery.refetch()}>
                  Retry
                </Button>
              </div>
            ) : entries.length === 0 ? (
              <div className="py-16 text-center text-sm text-muted-foreground">
                No entries found.
              </div>
            ) : (
              <ul className="divide-y divide-border/40">
                {entries.map((entry) => {
                  const isSelected = selectedEntry?.id === entry.id;
                  return (
                    <li key={entry.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedEntry(entry)}
                        className={`w-full text-left px-4 py-3 transition-colors ${
                          isSelected
                            ? "bg-primary/10"
                            : "hover:bg-card/80"
                        }`}
                      >
                        <p className="font-mono text-xs text-primary/90 mb-1">{entry.key}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {previewLine(entry) || (
                            <span className="italic">empty payload</span>
                          )}
                        </p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            {/* Pagination */}
            {entries.length > 0 && (
              <div className="px-4 py-3 border-t border-border/60 flex items-center justify-between text-xs">
                <span className="font-label text-muted-foreground">
                  Showing {offset + 1}–{Math.min(offset + entries.length, total)} of {total}
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={offset === 0}
                    onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                  >
                    Prev
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={offset + PAGE_SIZE >= total}
                    onClick={() => setOffset(offset + PAGE_SIZE)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Side panel */}
          <div className="rounded-xl border border-border/60 bg-card/40 backdrop-blur-sm">
            {!selectedEntry ? (
              <div className="flex items-center justify-center py-24 text-sm text-muted-foreground">
                Select an entry to inspect or edit.
              </div>
            ) : (
              <div className="p-5 flex flex-col gap-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-label text-[10px] tracking-[0.18em] uppercase text-muted-foreground mb-1">
                      {KIND_LABELS[selectedEntry.kind]} · v{selectedEntry.promptVersion}
                    </p>
                    <h2 className="font-mono text-base text-primary">{selectedEntry.key}</h2>
                    <p className="font-label text-xs text-muted-foreground mt-1">
                      Updated {new Date(selectedEntry.updatedAt).toLocaleString()}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedEntry(null)}
                    aria-label="Close"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div>
                  <p className="font-label text-[10px] tracking-[0.18em] uppercase text-muted-foreground mb-2">
                    Payload (JSON)
                  </p>
                  <Textarea
                    value={editorValue}
                    onChange={(e) => setEditorValue(e.target.value)}
                    spellCheck={false}
                    rows={18}
                    className="font-mono text-xs leading-relaxed"
                  />
                </div>

                {editorError && (
                  <div className="flex items-start gap-2 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>{editorError}</span>
                  </div>
                )}

                <div className="flex items-center justify-between gap-3">
                  <Button
                    variant="outline"
                    onClick={handleDelete}
                    disabled={isDeleting || isSaving}
                    className="text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
                  >
                    {isDeleting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    <span className="ml-1.5">Delete</span>
                  </Button>

                  <Button
                    onClick={handleSave}
                    disabled={isSaving || isDeleting}
                    className="gradient-primary text-white border-0 font-label font-medium"
                  >
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    <span className="ml-1.5">Save</span>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      </div>
    </div>
  );
}

import { createElement, useEffect, useMemo, useState, type ComponentType } from "react";
import { useLocation } from "wouter";
import { useClerk, useUser } from "@clerk/react";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/Wordmark";
import { ClerkStalledPage } from "@/components/ClerkStalled";
import { useClerkStalled } from "@/hooks/useClerkStalled";
import { BASE_URL } from "@/lib/api";
import { parseDoc, spans, type DocBlock } from "@/lib/doc-page";
import { usePageTitle } from "@/lib/page-title";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

// Globs, so a part that lands with its doc and example shows here with no edit to this page.
const DOCS = import.meta.glob<string>("/src/ds/**/*.doc.md", { query: "?raw", import: "default", eager: true });
const EXAMPLES = import.meta.glob<{ default: ComponentType }>("/src/ds/**/*.example.tsx", { eager: true });

const LEVELS = ["atoms", "molecules", "organisms", "templates"] as const;
const CHARTS = "Charts";

interface Part {
  name: string;
  section: string;
  doc: string | null;
  Example: ComponentType | null;
}

function partFrom(path: string) {
  const parts = (/\/ds\/(.*)$/.exec(path)?.[1] ?? "").split("/");
  const name = (parts[parts.length - 1] ?? "").replace(/\.(doc\.md|example\.tsx)$/, "");
  const folders = parts.slice(0, -1);
  const section = folders.includes("chart") ? CHARTS : (folders[0] ?? "other");
  return { key: [...folders, name].join("/"), name, section };
}

function collect(): Part[] {
  const byKey = new Map<string, Part>();
  const touch = (path: string) => {
    const { key, name, section } = partFrom(path);
    let part = byKey.get(key);
    if (!part) byKey.set(key, (part = { name, section, doc: null, Example: null }));
    return part;
  };
  for (const [path, doc] of Object.entries(DOCS)) touch(path).doc = doc;
  for (const [path, mod] of Object.entries(EXAMPLES)) touch(path).Example = mod.default;
  return [...byKey.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function sectionsOf(parts: Part[]): { title: string; parts: Part[] }[] {
  const known = [...LEVELS, CHARTS] as string[];
  const titles = [...known, ...new Set(parts.map((p) => p.section).filter((s) => !known.includes(s)))];
  return titles
    .map((s) => ({ title: s, parts: parts.filter((p) => p.section === s) }))
    .filter((s) => s.parts.length > 0);
}

function Inline({ text }: { text: string }) {
  return (
    <>
      {spans(text).map((s, i) =>
        s.code ? (
          <code key={i} className="rounded bg-muted px-1 py-0.5 text-[0.85em]">
            {s.text}
          </code>
        ) : (
          <span key={i}>{s.text}</span>
        ),
      )}
    </>
  );
}

function Block({ block }: { block: DocBlock }) {
  switch (block.kind) {
    case "heading":
      return createElement(
        `h${Math.min(block.level + 2, 6)}`,
        { className: block.level <= 2 ? "font-display text-xl mt-6 mb-2" : "font-label text-sm mt-4 mb-1" },
        <Inline text={block.text} />,
      );
    case "list":
      return (
        <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground mb-3">
          {block.items.map((item, i) => (
            <li key={i}>
              <Inline text={item} />
            </li>
          ))}
        </ul>
      );
    case "code":
      return <pre className="overflow-x-auto rounded-lg bg-muted p-3 text-xs mb-3">{block.text}</pre>;
    case "paragraph":
      return (
        <p className="text-sm text-muted-foreground mb-3">
          <Inline text={block.text} />
        </p>
      );
  }
}

function PartPage({ part }: { part: Part }) {
  const blocks = useMemo(() => (part.doc ? parseDoc(part.doc) : []), [part.doc]);
  return (
    <section id={part.name} className="rounded-2xl border border-border/60 p-4 sm:p-6 mb-8">
      <h2 className="font-display text-2xl mb-3">{part.name}</h2>
      {part.Example ? (
        <div className="overflow-x-auto rounded-xl border border-border/40 p-3 sm:p-4 mb-4">
          <part.Example />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground mb-3">No example yet.</p>
      )}
      {blocks.length > 0 ? blocks.map((b, i) => <Block key={i} block={b} />) : <p className="text-sm text-muted-foreground">No doc page yet.</p>}
    </section>
  );
}

function DesignList() {
  const sections = useMemo(() => sectionsOf(collect()), []);
  if (sections.length === 0) return <p className="text-sm text-muted-foreground">No parts have landed yet.</p>;
  return (
    <>
      <nav className="flex flex-wrap gap-x-4 gap-y-1 mb-8 text-sm">
        {sections.flatMap((s) =>
          s.parts.map((p) => (
            <a key={`${s.title}/${p.name}`} href={`#${p.name}`} className="text-primary hover:underline">
              {p.name}
            </a>
          )),
        )}
      </nav>
      {sections.map((s) => (
        <div key={s.title}>
          <h2 className="font-label text-xs tracking-[0.2em] uppercase text-muted-foreground mb-4">{s.title}</h2>
          {s.parts.map((p) => (
            <PartPage key={`${s.title}/${p.name}`} part={p} />
          ))}
        </div>
      ))}
    </>
  );
}

/** Every design-system part by level, its doc page and its live example, for the admin alone (ADR-430). */
export default function AdminDesignPage() {
  usePageTitle("Design");
  const [, navigate] = useLocation();
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const clerkStalled = useClerkStalled();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded) return;
    if (!user) {
      navigate(`${basePath}/sign-in?return_to=/admin/design`);
      return;
    }
    fetch(`${BASE_URL}admin/me`, { credentials: "include" })
      .then((r) => r.json() as Promise<{ isAdmin: boolean }>)
      .then((me) => setIsAdmin(me.isAdmin))
      .catch((e: Error) => setError(e.message));
  }, [isLoaded, user, navigate]);

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
          <Button variant="outline" onClick={() => void signOut({ redirectUrl: `${basePath}/sign-in?return_to=/admin/design` })}>Sign out</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background bg-stars text-foreground">
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <button type="button" onClick={() => navigate("/dashboard")}><Wordmark /></button>
          <span className="font-label text-xs tracking-[0.15em] uppercase text-muted-foreground">Admin</span>
        </div>
      </nav>
      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-20 pb-20">
        <h1 className="font-display text-3xl mb-6">Design</h1>
        <DesignList />
      </main>
    </div>
  );
}

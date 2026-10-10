import type { ReactNode } from "react";
import { useLocation } from "wouter";
import { AlertCircle, Loader2 } from "lucide-react";
import { AdminPage } from "@/ds/templates/AdminPage";
import { TopBar } from "@/ds/organisms/TopBar";
import { Wordmark } from "@/ds/atoms/Wordmark";
import { TextButton } from "@/ds/atoms/TextButton";
import { Chip } from "@/ds/atoms/Chip";
import { Eyebrow } from "@/ds/atoms/Eyebrow";
import { Button } from "@/ds/atoms/Button";

const PAGES = [
  { path: "/admin/prompts", name: "Prompts" },
  { path: "/admin/report-lab", name: "Lab" },
  { path: "/admin/waitlist", name: "Waitlist" },
  { path: "/admin/sales", name: "Sales" },
] as const;

export type AdminPath = (typeof PAGES)[number]["path"];

/** The admin pages' one frame: the admin TopBar, the page links, the title and its lede. */
export function AdminShell({ current, title, lede, aside, children }: {
  current: AdminPath;
  title: string;
  lede?: ReactNode;
  /** Sits beside the title: a button or a figure. */
  aside?: ReactNode;
  children: ReactNode;
}) {
  const [, navigate] = useLocation();
  const toolbar = (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="grid gap-2">
        <nav aria-label="Admin" className="flex flex-wrap gap-2">
          {PAGES.map((p) => (
            <Chip
              key={p.path}
              href={p.path}
              selected={p.path === current}
              onClick={(e) => { e.preventDefault(); navigate(p.path); }}
            >
              {p.name}
            </Chip>
          ))}
        </nav>
        {lede && <div className="max-w-2xl text-small text-paper-dim">{lede}</div>}
      </div>
      {aside}
    </div>
  );
  return (
    <AdminPage
      header={
          <TopBar
            version="admin"
            widthClass="max-w-7xl"
            left={<TextButton onClick={() => navigate("/dashboard")}><Wordmark size={17} /></TextButton>}
            right={<Eyebrow className="hidden text-muted sm:block">Admin</Eyebrow>}
          />
      }
      title={title}
      toolbar={toolbar}
    >
      {children}
    </AdminPage>
  );
}

export function AdminLoading({ error }: { error: string | null }) {
  return (
    <div className="grid min-h-screen place-items-center bg-ground px-6 text-paper">
      {error ? <p role="alert" className="text-small text-error">{error}</p> : <Loader2 aria-hidden="true" className="h-8 w-8 animate-spin text-muted motion-reduce:animate-none" />}
    </div>
  );
}

export function AdminDenied({ onSignOut }: { onSignOut: () => void }) {
  return (
    <div className="grid min-h-screen place-items-center bg-ground px-6 text-paper">
      <div className="max-w-md text-center">
        <AlertCircle className="mx-auto mb-4 h-10 w-10 text-error" />
        <h1 className="mb-2 font-display text-page-title">This page is for the Stars Decoded team</h1>
        <p className="mb-6 text-small text-paper-dim">You're signed in with an account that isn't the admin's. Sign out and sign in with the admin account.</p>
        <Button variant="secondary" onClick={onSignOut}>Sign out</Button>
      </div>
    </div>
  );
}

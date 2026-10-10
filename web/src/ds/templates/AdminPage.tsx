import type { ReactNode } from "react";

export interface AdminPageProps {
  /** The TopBar with the Admin label. */
  header: ReactNode;
  title?: ReactNode;
  /** Tabs or filters under the title. */
  toolbar?: ReactNode;
  children?: ReactNode;
}

/** The dense tempo: wider than the app, tighter gaps, the same parts. */
export function AdminPage({ header, title, toolbar, children }: AdminPageProps) {
  return (
    <div className="min-h-screen bg-ground text-paper">
      {header}
      <main className="mx-auto w-full max-w-7xl px-4 pb-16 pt-5 sm:px-6">
        {title && <h1 className="m-0 mb-3 font-display text-page-title text-paper">{title}</h1>}
        {toolbar && <div className="mb-4">{toolbar}</div>}
        <div className="grid gap-3">{children}</div>
      </main>
    </div>
  );
}

export default AdminPage;

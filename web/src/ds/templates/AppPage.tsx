import type { ReactNode } from "react";

export interface AppPageProps {
  /** The TopBar. */
  header: ReactNode;
  title?: ReactNode;
  /** Right of the title on a wide screen, under it on a phone. */
  titleAside?: ReactNode;
  children?: ReactNode;
  /** Ask, fixed in the corner. */
  corner?: ReactNode;
}

/** The working tempo: one content column under a fixed bar, so the page starts 56 px down, under the bar. */
export function AppPage({ header, title, titleAside, children, corner }: AppPageProps) {
  return (
    <div className="min-h-screen bg-ground bg-stars pt-14 text-paper">
      {header}
      <main className="mx-auto w-full max-w-4xl px-4 pb-24 pt-6 sm:px-6">
        {(title || titleAside) && (
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            {title && <h1 className="m-0 font-display text-page-title text-paper">{title}</h1>}
            {titleAside}
          </div>
        )}
        <div className="grid gap-4">{children}</div>
      </main>
      {corner && <div className="fixed bottom-4 right-4 z-30">{corner}</div>}
    </div>
  );
}

export default AppPage;

import { AppPage } from "./AppPage";

function Slot({ name, className = "" }: { name: string; className?: string }) {
  return (
    <div className={`grid place-items-center rounded-control border border-dashed border-line-strong p-4 font-label text-label uppercase text-label-dim ${className}`}>
      {name}
    </div>
  );
}

export default function AppPageExample() {
  return (
    <div className="relative max-h-[560px] overflow-auto rounded-card border border-line [transform:translateZ(0)]">
      <AppPage
        header={<Slot name="TopBar" />}
        title="Page title"
        titleAside={<Slot name="Aside" className="py-2" />}
        corner={<Slot name="Ask" className="bg-surface" />}
      >
        <Slot name="Content" className="min-h-32" />
        <Slot name="Content" className="min-h-32" />
      </AppPage>
    </div>
  );
}

import { AdminPage } from "./AdminPage";

function Slot({ name, className = "" }: { name: string; className?: string }) {
  return (
    <div className={`grid place-items-center rounded-control border border-dashed border-line-strong p-4 font-label text-label uppercase text-label-dim ${className}`}>
      {name}
    </div>
  );
}

export default function AdminPageExample() {
  return (
    <div className="max-h-[560px] overflow-auto rounded-card border border-line">
      <AdminPage header={<Slot name="TopBar with Admin" />} title="Page title" toolbar={<Slot name="Tabs" className="py-2" />}>
        <Slot name="Dense content" className="min-h-32" />
        <Slot name="Dense content" className="min-h-32" />
      </AdminPage>
    </div>
  );
}

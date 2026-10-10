import { ReportPage, ReportPageChapter } from "./ReportPage";

function Slot({ name, className = "" }: { name: string; className?: string }) {
  return (
    <div className={`grid place-items-center rounded-control border border-dashed border-line-strong p-4 font-label text-label uppercase text-label-dim ${className}`}>
      {name}
    </div>
  );
}

export default function ReportPageExample() {
  return (
    <div className="max-h-[640px] overflow-auto rounded-card border border-line">
      <ReportPage
        header={<Slot name="TopBar" />}
        hero={<Slot name="Hero" className="min-h-40" />}
        rail={<Slot name="Rail" className="min-h-24" />}
        closing={<Slot name="Closing" className="min-h-24" />}
        footer={<Slot name="Footer" />}
      >
        <ReportPageChapter accent={1} title="Chapter one">
          <Slot name="Chapter body" className="min-h-24" />
        </ReportPageChapter>
        <ReportPageChapter accent={4} title="Chapter four">
          <Slot name="Chapter body" className="min-h-24" />
        </ReportPageChapter>
      </ReportPage>
    </div>
  );
}

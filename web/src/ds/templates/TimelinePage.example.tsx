import { TimelinePage } from "./TimelinePage";

function Slot({ name, className = "" }: { name: string; className?: string }) {
  return (
    <div className={`grid place-items-center rounded-control border border-dashed border-line-strong p-4 font-label text-label uppercase text-label-dim ${className}`}>
      {name}
    </div>
  );
}

export default function TimelinePageExample() {
  return (
    <div className="max-h-[640px] overflow-auto rounded-card border border-line">
      <TimelinePage
        header={<Slot name="TopBar" />}
        intro={<Slot name="Kicker, title, lede" className="min-h-24" />}
        dial={<Slot name="Dial" className="size-56 rounded-full" />}
        cards={
          <>
            <Slot name="Card (tone)" className="min-h-24" />
            <Slot name="Card (tone)" className="min-h-24" />
          </>
        }
        closing={<Slot name="Closing" className="min-h-16" />}
        footer={<Slot name="Footer" />}
      />
    </div>
  );
}

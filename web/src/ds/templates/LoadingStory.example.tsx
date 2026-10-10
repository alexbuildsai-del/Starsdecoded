import { LoadingStory } from "./LoadingStory";

function Slot({ name, className = "" }: { name: string; className?: string }) {
  return (
    <div className={`grid place-items-center rounded-control border border-dashed border-line-strong p-4 font-label text-label uppercase text-label-dim ${className}`}>
      {name}
    </div>
  );
}

export default function LoadingStoryExample() {
  return (
    <div className="h-[560px] w-full max-w-md overflow-hidden rounded-card border border-line bg-void">
      <LoadingStory
        counter="Step 3 of 5"
        title="The sky draws"
        subtitle="Each body runs to its degree."
        stage={<Slot name="Stage" className="h-full w-full" />}
        detail={<Slot name="Detail" className="w-full py-2" />}
        pct={<Slot name="58%" className="border-0 p-0" />}
        door={<Slot name="Door" className="border-0 p-0" />}
      />
    </div>
  );
}

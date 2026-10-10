import { Button } from "@/ds/atoms/Button";
import { EmptyState } from "./EmptyState";

export default function EmptyStateExample() {
  return (
    <div className="grid max-w-md gap-6">
      <div className="grid gap-2">
        <p className="m-0 font-label text-label uppercase text-label-dim">With an action</p>
        <EmptyState
          label="Your circle"
          title="Add the people you care about"
          body="Add your partner, parents, kids or friends."
          action={<Button>Add someone</Button>}
        />
      </div>
      <div className="grid gap-2">
        <p className="m-0 font-label text-label uppercase text-label-dim">Without an action</p>
        <EmptyState label="This week" title="No transits this week" body="Nothing big touches your chart in these days." />
      </div>
    </div>
  );
}

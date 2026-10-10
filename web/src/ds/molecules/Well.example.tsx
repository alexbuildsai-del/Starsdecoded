import { Well } from "./Well";

function Side({ title, note, children }: { title: string; note: string; children: React.ReactNode }) {
  return (
    <div className="grid content-start gap-2">
      <p className="m-0 font-label text-label uppercase text-label-dim">{title}</p>
      {children}
      <p className="m-0 text-caption text-muted">{note}</p>
    </div>
  );
}

export default function WellExample() {
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <Side title="Today" note="C11 · PairBlock, 12 px corners, three copies">
        <div className="grid min-w-0 content-start gap-2 rounded-[12px] border border-[#242C3B] bg-[#0D1117] p-3.5">
          <p className="m-0 font-label text-[11px] font-medium uppercase tracking-[.18em]" style={{ color: "#3FA796" }}>Comes naturally</p>
          <ul className="m-0 grid list-disc gap-1 pl-4 text-[13px] leading-[1.5] text-[#E8EBF2]">
            <li>You both like a plan before you start.</li>
            <li>You laugh at the same things.</li>
          </ul>
        </div>
      </Side>
      <Side title="After" note="The standard well">
        <Well>
          <p className="m-0 font-label text-label uppercase text-teal">Comes naturally</p>
          <ul className="m-0 grid list-disc gap-1 pl-4 text-small text-paper">
            <li>You both like a plan before you start.</li>
            <li>You laugh at the same things.</li>
          </ul>
        </Well>
      </Side>
    </div>
  );
}

import { Numbers } from "./Numbers";

export default function NumbersExample() {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <section aria-label="Today" className="space-y-4">
        <h3 className="font-label text-label text-muted uppercase">Today</h3>
        <div>
          <div className="mb-1 font-mono text-data text-muted">K4 · public site tag, 10.5 px</div>
          <span
            className="font-mono uppercase text-muted"
            style={{ fontSize: 10.5, lineHeight: 1.4, letterSpacing: ".14em" }}
          >
            Free · nothing is saved
          </span>
        </div>
        <div>
          <div className="mb-1 font-mono text-data text-muted">Methodology box, degrees in Inter</div>
          <p className="font-sans text-paper-dim" style={{ fontSize: 13 }}>Sun altitude 16.6° below the horizon · orb 2.1°</p>
        </div>
        <div>
          <div className="mb-1 font-mono text-data text-muted">W6 · loading bar, 12.5 px</div>
          <span className="font-mono text-paper-dim" style={{ fontSize: 12.5 }}>58% · writing this month</span>
        </div>
      </section>
      <section aria-label="After" className="space-y-4">
        <h3 className="font-label text-label text-muted uppercase">After</h3>
        <div>
          <div className="mb-1 font-mono text-data text-muted">K4 · data-sm</div>
          <Numbers size="data-sm">Free · nothing is saved</Numbers>
        </div>
        <div>
          <div className="mb-1 font-mono text-data text-muted">data</div>
          <Numbers>Sun altitude −16.6° · below the horizon · orb 2.1°</Numbers>
        </div>
        <div>
          <div className="mb-1 font-mono text-data text-muted">W6 · stat, kept</div>
          <Numbers size="stat" className="text-paper">58%</Numbers>
        </div>
      </section>
    </div>
  );
}

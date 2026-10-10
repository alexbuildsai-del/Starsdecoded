import { Eyebrow } from "./Eyebrow";

const ROWS: { id: string; today: string; text: string; kind: "kicker" | "label"; tone?: string; todayStyle: React.CSSProperties }[] = [
  { id: "K1", today: "Public site, over a section title", text: "Questions people ask", kind: "kicker", todayStyle: { color: "#5C6BC0", letterSpacing: ".24em", fontSize: 11 } },
  { id: "K11", today: "Report, Did you know", text: "Did you know", kind: "label", tone: "text-brass", todayStyle: { color: "#C9A86A", letterSpacing: ".16em", fontSize: 10.5 } },
  { id: "K8", today: "Dashboard, Your week", text: "Your week", kind: "label", tone: "text-brass", todayStyle: { color: "#C9A86A", letterSpacing: ".18em", fontSize: 10 } },
  { id: "K5", today: "Timeline, Now and ahead", text: "Now and coming up", kind: "label", tone: "text-indigo-lt", todayStyle: { color: "#7E889A", letterSpacing: ".16em", fontSize: 10 } },
  { id: "K7", today: "Timeline reading sheet", text: "Your reading", kind: "kicker", todayStyle: { color: "#7E889A", letterSpacing: ".2em", fontSize: 10.5 } },
  { id: "K3", today: "Admin forms", text: "Prompt name", kind: "label", tone: "text-muted", todayStyle: { color: "#7E889A", letterSpacing: ".1em", fontSize: 10 } },
  { id: "K14", today: "Checkout, top right", text: "Checkout", kind: "label", tone: "text-muted", todayStyle: { color: "#7E889A", letterSpacing: ".2em", fontSize: 10 } },
];

export default function EyebrowExample() {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <section aria-label="Today" className="space-y-3">
        <h3 className="font-label text-label text-muted uppercase">Today</h3>
        {ROWS.map((r) => (
          <div key={r.id} className="flex items-baseline gap-3">
            <IdTag id={r.id} />
            <span className="font-label uppercase" style={r.todayStyle}>{r.text}</span>
            <span className="text-caption text-muted">{r.today}</span>
          </div>
        ))}
      </section>
      <section aria-label="After" className="space-y-3">
        <h3 className="font-label text-label text-muted uppercase">After</h3>
        {ROWS.map((r) => (
          <div key={r.id} className="flex items-baseline gap-3">
            <IdTag id={r.id} />
            <Eyebrow kind={r.kind} className={r.tone}>{r.text}</Eyebrow>
            <span className="text-caption text-muted">{r.kind}</span>
          </div>
        ))}
      </section>
    </div>
  );
}

function IdTag({ id }: { id: string }) {
  return <span className="w-8 font-mono text-data text-muted">{id}</span>;
}

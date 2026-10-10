import { Heading, type HeadingStyle } from "./Heading";

const ROWS: { id: string; style: HeadingStyle; text: string; today: string; todayStyle: React.CSSProperties }[] = [
  { id: "T4", style: "hero", text: "How we make your report", today: "Public site title", todayStyle: { fontSize: 40, lineHeight: 1.02 } },
  { id: "T1", style: "section", text: "Questions people ask", today: "Public site section", todayStyle: { fontSize: 34, lineHeight: 1.06 } },
  { id: "T5", style: "page-title", text: "Dashboard", today: "App page title", todayStyle: { fontSize: 30, lineHeight: 1.15 } },
  { id: "T6", style: "sheet-title", text: "Add someone", today: "Side sheets", todayStyle: { fontSize: 22, lineHeight: 1.2 } },
  { id: "T3", style: "card-title", text: "Work feels heavier", today: "Card titles", todayStyle: { fontSize: 19, lineHeight: 1.25 } },
  { id: "T8", style: "card-title", text: "Timeline started", today: "After paying", todayStyle: { fontSize: 22, lineHeight: 1.2 } },
  { id: "-", style: "card-title-sm", text: "Did you know?", today: "Small grid card", todayStyle: { fontSize: 17, lineHeight: 1.3 } },
  { id: "-", style: "lede", text: "You build your life around felt safety.", today: "Chapter opening", todayStyle: { fontSize: 18, lineHeight: 1.5 } },
];

export default function HeadingExample() {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <section aria-label="Today" className="space-y-4">
        <h3 className="font-label text-label text-muted uppercase">Today</h3>
        {ROWS.map((r) => (
          <div key={r.id + r.style + r.text}>
            <div className="mb-1 font-mono text-data text-muted">{r.id} · {r.today}</div>
            <div className="font-display text-paper" style={r.todayStyle}>{r.text}</div>
          </div>
        ))}
      </section>
      <section aria-label="After" className="space-y-4">
        <h3 className="font-label text-label text-muted uppercase">After</h3>
        {ROWS.map((r) => (
          <div key={r.id + r.style + r.text}>
            <div className="mb-1 font-mono text-data text-muted">{r.id} · {r.style}</div>
            <Heading style={r.style} as="div">{r.text}</Heading>
          </div>
        ))}
      </section>
    </div>
  );
}

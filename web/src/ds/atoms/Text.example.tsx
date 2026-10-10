import { Text, type TextStyle } from "./Text";

const ROWS: { style: TextStyle; text: string; today: string; todayStyle: React.CSSProperties }[] = [
  { style: "prose", text: "You concentrate your effort into a narrow set of priorities.", today: "Report body, 15 px", todayStyle: { fontSize: 15, lineHeight: 1.7 } },
  { style: "ui", text: "Add the people you care about.", today: "Sheets and forms, 14.5 px", todayStyle: { fontSize: 14.5, lineHeight: 1.5 } },
  { style: "small", text: "Mars sits in the sixth house of daily work.", today: "Card body, 13 px", todayStyle: { fontSize: 13, lineHeight: 1.5 } },
  { style: "caption", text: "Your birth time is only used on your device.", today: "Notes, 10.5 px", todayStyle: { fontSize: 10.5, lineHeight: 1.4 } },
];

export default function TextExample() {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <section aria-label="Today" className="space-y-4">
        <h3 className="font-label text-label text-muted uppercase">Today</h3>
        {ROWS.map((r) => (
          <div key={r.style}>
            <div className="mb-1 font-mono text-data text-muted">{r.today}</div>
            <p className="font-sans text-paper-dim" style={r.todayStyle}>{r.text}</p>
          </div>
        ))}
      </section>
      <section aria-label="After" className="space-y-4">
        <h3 className="font-label text-label text-muted uppercase">After</h3>
        {ROWS.map((r) => (
          <div key={r.style}>
            <div className="mb-1 font-mono text-data text-muted">{r.style}</div>
            <Text style={r.style}>{r.text}</Text>
          </div>
        ))}
      </section>
    </div>
  );
}

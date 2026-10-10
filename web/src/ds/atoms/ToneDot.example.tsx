import { ToneDot, type Tone } from "./ToneDot";

const WORDS: [Tone, string][] = [
  ["heavy", "Heavy"],
  ["mixed", "Mixed"],
  ["light", "Light"],
  ["credit", "1 credit"],
];

export default function ToneDotExample() {
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <section>
        <h3 className="mb-2 text-xs text-muted">Today (P1, P2): a dot per screen, three rose shades and two violets</h3>
        <ul className="grid gap-2 text-sm text-paper-dim">
          {WORDS.map(([tone, word]) => (
            <li key={tone} className="flex items-center gap-2">
              <span className="inline-block size-2 rounded-full bg-current" aria-hidden="true" />
              {word}
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h3 className="mb-2 text-xs text-muted">After: P1 the standard, P2 kept as credit dots, P5 with a hue</h3>
        <ul className="grid gap-2 text-sm text-paper-dim">
          {WORDS.map(([tone, word]) => (
            <li key={tone} className="flex items-center gap-2">
              <ToneDot tone={tone} />
              {word}
            </li>
          ))}
          <li className="flex items-center gap-2">
            <ToneDot tone="mixed" hue="var(--color-indigo-lt)" />
            Waiting for Sam
          </li>
        </ul>
      </section>
    </div>
  );
}

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PLANET_GLYPHS, PLANET_LABELS, type AspectMeaning } from "@/types/chart";

const ASPECT_TYPES = ["conjunction", "sextile", "square", "trine", "opposition"] as const;

function parseAspectKey(
  key: string,
): { planet1: string; type: string; planet2: string } | null {
  for (const type of ASPECT_TYPES) {
    const separator = `_${type}_`;
    const idx = key.indexOf(separator);
    if (idx !== -1) {
      return {
        planet1: key.slice(0, idx),
        type,
        planet2: key.slice(idx + separator.length),
      };
    }
  }
  return null;
}

const ASPECT_SYMBOLS: Record<string, string> = {
  conjunction: "☌",
  sextile: "⚹",
  square: "□",
  trine: "△",
  opposition: "☍",
};

interface AspectChipProps {
  aspectKey: string;
  meaning?: AspectMeaning;
  colorClass?: string;
}

export function AspectChip({ aspectKey, meaning, colorClass = "text-primary border-primary/30 bg-primary/10 hover:bg-primary/20" }: AspectChipProps) {
  const parsed = parseAspectKey(aspectKey);
  if (!parsed) return null;

  const { planet1, type, planet2 } = parsed;
  const glyph1 = PLANET_GLYPHS[planet1] ?? "";
  const glyph2 = PLANET_GLYPHS[planet2] ?? "";
  const label1 = PLANET_LABELS[planet1] ?? planet1;
  const label2 = PLANET_LABELS[planet2] ?? planet2;
  const aspectSymbol = ASPECT_SYMBOLS[type] ?? type;

  const chipLabel = (
    <span className="flex items-center gap-1">
      <span>{glyph1}</span>
      <span>{label1}</span>
      <span className="opacity-60">{aspectSymbol}</span>
      <span>{glyph2}</span>
      <span>{label2}</span>
    </span>
  );

  if (!meaning) {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-label text-[11px] ${colorClass}`}
      >
        {chipLabel}
      </span>
    );
  }

  const rows: { label: string; text: string }[] = [
    meaning.dynamic ? { label: "Dynamic", text: meaning.dynamic } : null,
    meaning.tension ? { label: "Tension", text: meaning.tension } : null,
    meaning.behavior ? { label: "Behavior", text: meaning.behavior } : null,
    meaning.growth ? { label: "Growth", text: meaning.growth } : null,
  ].filter((r): r is { label: string; text: string } => r !== null);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-label text-[11px] transition-colors cursor-pointer ${colorClass}`}
        >
          {chipLabel}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 border-border/60 bg-card/95 backdrop-blur-sm p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-border/40 bg-card/60">
          <p className="font-label text-xs tracking-wider uppercase text-muted-foreground">
            {glyph1} {label1} {aspectSymbol} {glyph2} {label2}
          </p>
          <p className="font-label text-[10px] tracking-[0.14em] uppercase text-muted-foreground/60 mt-0.5 capitalize">
            {type}
          </p>
        </div>
        <div className="px-4 py-3 space-y-3 max-h-72 overflow-y-auto">
          {rows.map(({ label, text }) => (
            <div key={label}>
              <p className="font-label text-[9px] tracking-[0.18em] uppercase text-primary/60 mb-1">
                {label}
              </p>
              <p className="text-xs leading-relaxed text-foreground/80">{text}</p>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

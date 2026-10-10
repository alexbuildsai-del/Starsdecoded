import { HouseObject } from "@/ds/atoms/HouseObject";
import { houseBandLabel } from "@/ds/organisms/chart/scene";

export default function HouseObjectExample() {
  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))" }}>
      {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
        <div key={h} className="flex items-center gap-2 font-label text-label text-paper-dim">
          <HouseObject house={h} />
          {houseBandLabel(h)}
        </div>
      ))}
    </div>
  );
}

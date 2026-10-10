import { useState } from "react";
import { SegmentedControl } from "./SegmentedControl";

const RANGES = [
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
  { id: "six", label: "6 months" },
] as const;

export default function SegmentedControlExample() {
  const [range, setRange] = useState<(typeof RANGES)[number]["id"]>("week");
  const [view, setView] = useState<"circle" | "people">("circle");
  return (
    <div className="grid gap-4">
      <SegmentedControl<typeof range> aria-label="How far ahead" options={RANGES} value={range} onChange={setRange} />
      <SegmentedControl<typeof view>
        aria-label="Show"
        options={[{ id: "circle", label: "Circle" }, { id: "people", label: "People" }]}
        value={view}
        onChange={setView}
      />
    </div>
  );
}

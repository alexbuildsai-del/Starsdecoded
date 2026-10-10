import { useState } from "react";
import { BirthDateField, BirthTimeControl, PlaceField } from "@/ds/molecules/BirthFields";
import type { BirthTimeAnswer } from "@/lib/birth-time";
import type { GeocodeResult } from "@/lib/places";

export default function BirthFieldsExample() {
  const [date, setDate] = useState("");
  const [place, setPlace] = useState<GeocodeResult | null>(null);
  const [answer, setAnswer] = useState<BirthTimeAnswer>({ mode: "roughly", kind: "part", part: "morning", time: "" });
  return (
    <div className="grid gap-8 sm:grid-cols-2">
      <section className="grid max-w-sm content-start gap-3">
        <b>Today</b>
        <select aria-label="Part of the day" className="w-64 rounded-md border border-input bg-background px-3 py-2 text-sm" defaultValue="morning">
          <option value="morning">Morning</option>
          <option value="afternoon">Afternoon</option>
          <option value="evening">Evening</option>
          <option value="night">Night</option>
        </select>
      </section>
      <section className="grid max-w-sm gap-6">
        <b>After</b>
        <BirthDateField id="bf-date" value={date} onChange={setDate} />
        <BirthTimeControl value={answer} onChange={setAnswer} timeId="bf-time" />
        <PlaceField id="bf-place" value={place} onChange={setPlace} />
      </section>
    </div>
  );
}

import { Select } from "@/ds/atoms/Select";

export default function SelectExample() {
  return (
    <div className="grid gap-8 sm:grid-cols-2">
      <section className="grid max-w-sm gap-3">
        <b>Today</b>
        <select aria-label="Part of the day" className="w-64 rounded-md border border-input bg-background px-3 py-2 text-sm">
          <option>Morning</option>
        </select>
      </section>
      <section className="grid max-w-sm gap-4">
        <b>After</b>
        <Select label="Part of the day" defaultValue="morning">
          <option value="morning">Morning</option>
          <option value="afternoon">Afternoon</option>
        </Select>
        <Select aria-label="Disabled" disabled>
          <option>Disabled</option>
        </Select>
      </section>
    </div>
  );
}

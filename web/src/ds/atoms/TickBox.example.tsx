import { useState } from "react";
import { TickBox } from "@/ds/atoms/TickBox";

export default function TickBoxExample() {
  const [a, setA] = useState(false);
  const [b, setB] = useState(true);
  return (
    <div className="grid gap-8 sm:grid-cols-2">
      <section className="grid max-w-sm gap-3">
        <b>Today</b>
        <span className="flex items-center gap-2.5 text-sm">
          <span className="h-5 w-5 rounded-[6px] border-[1.5px] border-[#6E7789]" />
          Say one kind thing today
        </span>
      </section>
      <section className="grid max-w-sm gap-1">
        <b>After</b>
        <TickBox checked={a} onChange={setA} label="Say one kind thing today">
          <span className="text-sm">Say one kind thing today</span>
        </TickBox>
        <TickBox checked={b} onChange={setB} label="Walk without your phone">
          <span className="text-sm">Walk without your phone</span>
        </TickBox>
        <TickBox checked disabled onChange={() => {}} label="Disabled, ticked">
          <span className="text-sm">Disabled, ticked</span>
        </TickBox>
      </section>
    </div>
  );
}

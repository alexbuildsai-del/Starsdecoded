import { Button } from "@/ds/atoms/Button";

const variants = ["primary", "secondary", "danger"] as const;
const label = { primary: "Get my report", secondary: "Read a sample", danger: "Delete report" };

// Hover, pressed and focus come from the real classes; the forced rows are for the page's eye only.
const forced = {
  hover: "border-indigo-lt",
  focus: "outline-2 outline-offset-2 outline-solid outline-focus",
};

export default function ButtonExample() {
  return (
    <div className="flex flex-col gap-8 bg-ground p-6 text-paper">
      {(["default", "compact"] as const).map((size) => (
        <section key={size} className="flex flex-col gap-3">
          <h3 className="text-xs uppercase text-muted">{size}</h3>
          <div className="flex flex-wrap items-center gap-3">
            {variants.map((v) => (
              <Button key={v} variant={v} size={size}>{label[v]}</Button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button size={size} className={forced.hover}>Hover</Button>
            <Button size={size} className={forced.focus}>Focus</Button>
            <Button size={size} busy="Writing" />
            <Button size={size} variant="secondary" busy="Starting" />
          </div>
        </section>
      ))}
      <section className="flex max-w-[390px] flex-col gap-3">
        <h3 className="text-xs uppercase text-muted">Full width, as on a phone</h3>
        <Button full>Pay</Button>
        <Button full variant="secondary">Back</Button>
        <Button full busy="Paying" />
      </section>
    </div>
  );
}

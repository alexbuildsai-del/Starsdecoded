import { InputWithButton } from "@/ds/atoms/InputWithButton";

const BUTTON = "inline-flex items-center justify-center rounded-control bg-indigo px-5 font-label text-sm font-medium text-on-indigo";

export default function InputWithButtonExample() {
  return (
    <div className="grid gap-8 sm:grid-cols-2">
      <section className="grid max-w-md gap-3">
        <b>Today</b>
        <div className="flex gap-2">
          <input
            aria-label="Their email"
            placeholder="name@example.com"
            className="h-[46px] min-w-0 flex-1 rounded-[8px] border border-[#242C3B] bg-[#0D1117] px-3 text-base text-[#E8EBF2]"
          />
          <button type="button" className="h-[46px] rounded-[8px] bg-[#5C6BC0] px-5 text-sm text-white">Join the waitlist</button>
        </div>
      </section>
      <section className="grid max-w-md gap-4">
        <b>After</b>
        <form onSubmit={(e) => e.preventDefault()}>
          <InputWithButton
            label="Email"
            placeholder="name@example.com"
            hint="Enter joins: this one is a form."
            button={<button type="submit" className={BUTTON}>Join the waitlist</button>}
          />
        </form>
        <InputWithButton
          label="Their email"
          placeholder="name@example.com"
          hint="No form: Enter does nothing here."
          button={<button type="button" className={BUTTON}>Share</button>}
        />
      </section>
    </div>
  );
}

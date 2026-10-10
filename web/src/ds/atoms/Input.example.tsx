import { Input } from "@/ds/atoms/Input";

export default function InputExample() {
  return (
    <div className="grid gap-8 sm:grid-cols-2">
      <section className="grid max-w-sm gap-3">
        <b>Today</b>
        <input
          placeholder="First name"
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors placeholder:text-muted-foreground md:text-sm"
        />
      </section>
      <section className="grid max-w-sm gap-4">
        <b>After</b>
        <Input label="Their first name" placeholder="First name" hint="Up to 60 letters" />
        <Input label="Email" defaultValue="name@" error="Enter an email address, like name@example.com." />
        <Input aria-label="Disabled" placeholder="Disabled" disabled />
      </section>
    </div>
  );
}

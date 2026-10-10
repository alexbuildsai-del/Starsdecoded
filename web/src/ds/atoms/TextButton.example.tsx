import { Button } from "@/ds/atoms/Button";
import { TextButton } from "@/ds/atoms/TextButton";

export default function TextButtonExample() {
  return (
    <div className="flex flex-col gap-8 bg-ground p-6 text-paper">
      <section className="flex max-w-[390px] items-center justify-between">
        <Button size="compact">Write my report</Button>
        <TextButton>Share</TextButton>
      </section>
      <section className="flex flex-col items-start gap-2">
        <span className="text-sm text-muted">Something went wrong.</span>
        <TextButton>Try again</TextButton>
      </section>
      <section className="flex gap-6">
        <TextButton>Back to today</TextButton>
        <TextButton className="text-paper">Hover</TextButton>
        <TextButton className="outline-2 outline-offset-2 outline-solid outline-focus">Focus</TextButton>
      </section>
    </div>
  );
}

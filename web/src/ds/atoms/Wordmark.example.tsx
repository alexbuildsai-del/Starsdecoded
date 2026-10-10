import { Wordmark } from "@/ds/atoms/Wordmark";

export default function WordmarkExample() {
  return (
    <div className="grid gap-4 bg-[#06080C] p-6">
      <Wordmark />
      <Wordmark size={17} />
    </div>
  );
}

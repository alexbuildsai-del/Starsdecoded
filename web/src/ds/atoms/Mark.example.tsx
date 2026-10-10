import { Mark } from "@/ds/atoms/Mark";

export default function MarkExample() {
  return (
    <div className="flex items-center gap-6 bg-[#06080C] p-6 text-primary">
      <Mark className="h-5 w-5" title="Stars Decoded" />
      <Mark className="h-16 w-16" title="Stars Decoded" />
      <Mark className="h-16 w-16 text-[#E8EBF2]" point="#E8EBF2" title="One colour" />
    </div>
  );
}

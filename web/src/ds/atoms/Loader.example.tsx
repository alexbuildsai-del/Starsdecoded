import { Loader } from "@/ds/atoms/Loader";

export default function LoaderExample() {
  return (
    <div className="grid gap-4 bg-[#06080C]">
      <Loader className="min-h-48" label="Loading" />
      <Loader className="min-h-48" label="Opening your report" progress={{ pct: 42, line: "42% · working out your chart" }} />
    </div>
  );
}

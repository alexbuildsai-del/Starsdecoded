import { Progress } from "@/ds/atoms/Progress";

export default function ProgressExample() {
  return (
    <div className="grid max-w-xs gap-6 bg-[#06080C] p-6">
      <Progress pct={0} line="0% · checking your details" />
      <Progress pct={58} line="58% · writing this month" />
      <Progress pct={100} line="100% · your report is ready" />
    </div>
  );
}

import { StatusDots } from "@/ds/atoms/StatusDots";

export default function StatusDotsExample() {
  return (
    <div className="flex flex-col gap-4 bg-ground p-6 text-paper">
      {["Writing", "Starting", "Paying", "Stopping"].map((word) => (
        <StatusDots key={word} label={word} />
      ))}
      <span className="text-sm text-muted">Under reduced motion the dots stay, still, beside the word.</span>
    </div>
  );
}

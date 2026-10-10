import { Mark } from "@/ds/atoms/Mark";
import { Wordmark } from "@/ds/atoms/Wordmark";

export interface LogoProps {
  kind: "mark" | "wordmark" | "icon";
  className?: string;
}

/** Mark alone on a phone bar, Wordmark beside the name, the icon as the app tile (logo.svg). */
export function Logo({ kind, className }: LogoProps) {
  if (kind === "wordmark") return <Wordmark className={className} />;
  if (kind === "mark") return <Mark className={className ?? "h-5 w-5 text-primary"} title="Stars Decoded" />;
  return (
    <span
      className={className ?? "inline-grid h-16 w-16 place-items-center rounded-[14px] bg-[#0D1117] text-primary"}
      role="img"
      aria-label="Stars Decoded"
    >
      <Mark className="h-10 w-10" />
    </span>
  );
}

export default Logo;

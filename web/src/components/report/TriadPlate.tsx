/**
 * The small Sun, Moon and rising plate the dashboard sky card and the birth-time plates print. It is the one chart in
 * its Sun, Moon and rising state (TriadRing), so it keeps no ring, horizon or marker of its own; callers keep its props.
 */
import { TriadRing } from "@/ds/atoms/TriadRing";
import type { ChartData } from "@/types/chart";

/** The plate's side in px as the dashboard prints it; under 200 px the ring carries no sign names. */
const PLATE = 104;

export interface TriadPlateProps {
  chart: ChartData;
  name: string;
  className?: string;
}

export function TriadPlate({ chart, name, className }: TriadPlateProps) {
  return <TriadRing chart={chart} name={name} size={PLATE} className={className ?? "block h-auto w-[min(220px,40vw)]"} />;
}

export default TriadPlate;

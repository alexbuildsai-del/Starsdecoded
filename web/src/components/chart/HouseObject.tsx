/**
 * The twelve house objects (ADR-321, report-loading-story §3): one line drawing per house, made once here for
 * the app, the site and the film, on a 32-unit grid. They are drawn in the houses' light indigo, the colour the
 * house words take, and never in brass, which is measured geometry only (§9). So no prop can recolour them.
 */
import type { ReactElement } from "react";
import { HOUSE_OBJECTS, type HouseObjectId } from "@/lib/houses";

const INDIGO_LT = "#9FA8DA";

const DRAWINGS: Record<HouseObjectId, ReactElement> = {
  Mirror: (
    <>
      <ellipse cx={16} cy={12} rx={7.5} ry={9} />
      <path d="M12.6 12.4l4.6-4.6M14 15.8l2.4-2.4" />
      <path d="M14.5 21v7a1.5 1.5 0 0 0 3 0v-7" />
    </>
  ),
  Wallet: (
    <>
      <path d="M7.5 9.5 20 5.2l1.5 4.3" />
      <rect x={4} y={9.5} width={24} height={17} rx={2.5} />
      <path d="M28 14.5h-5.5a3 3 0 0 0 0 6H28" />
      <circle cx={22.5} cy={17.5} r={0.9} fill={INDIGO_LT} stroke="none" />
    </>
  ),
  Phone: (
    <>
      <rect x={5.5} y={3} width={13} height={26} rx={2.5} />
      <path d="M10 6.5h4M10.5 25.5h3" />
      <path d="M22.5 12.5a4.5 4.5 0 0 1 0 7M25.5 9.5a8.5 8.5 0 0 1 0 13" />
    </>
  ),
  "Family tree": (
    <>
      <path d="M16 28.5V10.6M16 20.5l-5.6-5.6M16 17.2l5.6-5.6" />
      <circle cx={16} cy={7.5} r={3.1} />
      <circle cx={8.2} cy={12.7} r={3.1} />
      <circle cx={23.8} cy={9.4} r={3.1} />
      <path d="M16 25c0 2.1-2.3 3.5-5.2 3.5M16 25c0 2.1 2.3 3.5 5.2 3.5" />
    </>
  ),
  Paintbrush: (
    <>
      <g transform="rotate(45 17 14)">
        <path d="M15.5 2.5h3V12h-3z" />
        <path d="M14.5 12h5v3h-5z" />
        <path d="M14.5 15c-.6 3.6-.1 7.2 2.5 10.5 2.6-3.3 3.1-6.9 2.5-10.5" />
      </g>
      <path d="M7.5 28c3.5-.2 7-1.6 10.5-1.4 3 .2 5.5 1.2 8.5.8" />
    </>
  ),
  "To-do list": (
    <>
      <rect x={6} y={5} width={20} height={24} rx={2} />
      <rect x={11.5} y={3} width={9} height={4} rx={1} />
      <path d="M9.5 12.5l1.5 1.5 3-3.2M9.5 18.5l1.5 1.5 3-3.2" />
      <rect x={9.6} y={22.6} width={3.8} height={3.8} rx={0.7} />
      <path d="M16.5 12.5h6M16.5 18.5h6M16.5 24.5h6" />
    </>
  ),
  Handshake: (
    <>
      <path d="M2 13.5 7.5 11l4.5 1" />
      <path d="M30 13.5 24.5 11c-1.6-.7-3.4-.6-4.9.3L13.4 15a1.8 1.8 0 0 0 1.9 3l4-2.3" />
      <path d="M2 20.5l5.8 4.2a1.7 1.7 0 0 0 2.3-2.4l1.9 1.9a1.7 1.7 0 0 0 2.4-2.4l1.6 1.6a1.7 1.7 0 0 0 2.4-2.4l-.9-.9" />
      <path d="M30 20.5l-3.4-2.5-5.8-5.2" />
    </>
  ),
  "Locked box": (
    <>
      <rect x={4} y={8} width={24} height={19} rx={2} />
      <path d="M4 13.5h24" />
      <path d="M13.5 18v-1.6a2.5 2.5 0 0 1 5 0V18" />
      <rect x={12} y={18} width={8} height={6} rx={1} />
      <path d="M16 20.4V22" />
    </>
  ),
  Passport: (
    <>
      <rect x={7} y={3} width={18} height={26} rx={2} />
      <circle cx={16} cy={13.5} r={5} />
      <ellipse cx={16} cy={13.5} rx={2.1} ry={5} />
      <path d="M11 13.5h10M12.5 23.5h7" />
    </>
  ),
  Spotlight: (
    <>
      <path d="M4.5 4h8M8.5 4v2.8" />
      <path d="M6.42 8 10.58 5.6l4.53 3.85-7.62 4.4z" />
      <path d="M7.2 14 11 23.2M14.4 10.6l12.2 12.6" strokeDasharray="1.2 2.4" />
      <ellipse cx={19} cy={25.3} rx={8.6} ry={2.7} />
    </>
  ),
  Team: (
    <>
      <circle cx={16} cy={10.5} r={3.5} />
      <path d="M9.5 26v-2a6.5 6.5 0 0 1 13 0v2" />
      <circle cx={7} cy={12.5} r={2.7} />
      <path d="M2.5 24.5v-1.2a4.5 4.5 0 0 1 6.3-4.1" />
      <circle cx={25} cy={12.5} r={2.7} />
      <path d="M29.5 24.5v-1.2a4.5 4.5 0 0 0-6.3-4.1" />
    </>
  ),
  Pillow: (
    <>
      <path d="M5 8.5c3.8 1.4 18.2 1.4 22 0-1.4 3.8-1.4 11.2 0 15-3.8-1.4-18.2-1.4-22 0 1.4-3.8 1.4-11.2 0-15z" />
      <path d="M5 8.5l2.8 2.6M27 8.5l-2.8 2.6M5 23.5l2.8-2.6M27 23.5l-2.8-2.6" />
    </>
  ),
};

export interface HouseObjectProps {
  /** 1 to 12; any other number draws nothing. */
  house: number;
  /** Width and height in pixels; the lines scale with it. */
  size?: number;
  className?: string;
}

/**
 * A house's object, in HTML flow or inside a plate. Hidden from screen readers, since every place that draws one
 * prints the object's name or its house's word beside it.
 */
export function HouseObject({ house, size = 32, className }: HouseObjectProps) {
  if (!Number.isInteger(house) || house < 1 || house > 12) return null;
  const object = HOUSE_OBJECTS[house - 1];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      aria-hidden="true"
      className={className}
      data-object={object}
      fill="none"
      stroke={INDIGO_LT}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {DRAWINGS[object]}
    </svg>
  );
}

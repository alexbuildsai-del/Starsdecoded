import type { ReactNode } from "react";
import { LoadingStory, type LoadingStorySlots } from "@/ds/templates/LoadingStory";

/** What a loading screen puts on the grid (ADR-351); the slot's place is the frame's, never the content's. */
export interface LoadingSlots extends Omit<LoadingStorySlots, "pct" | "door"> {
  /** After the frame, outside the grid, for what a screen adds below it. */
  below?: ReactNode;
}

export interface LoadingFrameProps extends LoadingSlots {
  /** The progress bar with its line (ADR-394), in the slot above the door. */
  pct?: ReactNode;
  door?: ReactNode;
}

/**
 * The stories' own slots plus `below`, which the template does not have: the card band under the Personal story
 * sits in a column with the grid, so the grid takes what the band leaves.
 */
export function LoadingFrame({ below, ...slots }: LoadingFrameProps) {
  if (!below) return <LoadingStory {...slots} />;
  return (
    <div className="flex h-full flex-col items-center">
      <div className="min-h-0 w-full flex-1">
        <LoadingStory {...slots} />
      </div>
      {below}
    </div>
  );
}

export default LoadingFrame;

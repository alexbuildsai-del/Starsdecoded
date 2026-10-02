import { useLayoutEffect } from "react";
import { continueRender, delayRender, useCurrentFrame, useVideoConfig } from "remotion";
import { setVirtualTime, settle } from "../clock";

/** Sets the frame-locked clock for this frame before anything renders, then waits for live components to draw. */
export function useClock(): number {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  setVirtualTime((frame / fps) * 1000);
  useLayoutEffect(() => {
    const h = delayRender(`clock ${frame}`);
    settle().then(() => continueRender(h));
  }, [frame]);
  return frame / fps;
}

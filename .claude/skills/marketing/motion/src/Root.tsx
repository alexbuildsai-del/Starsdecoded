import { Composition } from "remotion";
import { Trailer, type TrailerProps } from "./Trailer";
import { FPS, SLOW } from "./lib/motion";
import "./motion.css";

// The date is the posting day, so the chart behind the wheel is "born today" (rule 1): render.mjs takes --date.
const defaults: TrailerProps = { date: "2026-10-02", music: "temp-score.wav" };

export const Root = () => (
  <Composition id="launch-trailer" component={Trailer} width={1080} height={1920} fps={FPS} durationInFrames={Math.round(30 * SLOW * FPS)} defaultProps={defaults} />
);

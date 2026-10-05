import { Composition } from "remotion";
import { Trailer, type TrailerProps } from "./Trailer";
import { Opening } from "./v5/Opening";
import TL from "./v5/opening.json";
import { FPS, SLOW } from "./lib/motion";
import "./motion.css";

// The date is the posting day, so the chart behind the wheel is "born today" (rule 1): render.mjs takes --date.
const defaults: TrailerProps = { date: "2026-10-02", music: "temp-score.wav" };

export const Root = () => (
  <>
    <Composition id="launch-trailer" component={Trailer} width={1080} height={1920} fps={FPS} durationInFrames={Math.round(30 * SLOW * FPS)} defaultProps={defaults} />
    <Composition id="v5-opening" component={Opening} width={1080} height={1920} fps={FPS} durationInFrames={Math.round(TL.duration * FPS)} defaultProps={{ ...defaults, music: "v5-mix.wav" }} />
  </>
);

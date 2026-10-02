import { useEffect, useState } from "react";
import { continueRender, delayRender, staticFile } from "remotion";
import { PLANET_RENDERS, SUN_HERO } from "@/lib/planet-renders";

/** Holds the first frame until the product's fonts and every render the trailer draws are decoded. */
export function useAssets() {
  const [handle] = useState(() => delayRender("fonts and renders"));
  useEffect(() => {
    const srcs = [...Object.values(PLANET_RENDERS), SUN_HERO, staticFile("gift-cover.png")];
    const imgs = srcs.map((src) => { const i = new Image(); i.src = src; return i.decode().catch(() => undefined); });
    const fonts = ["400 100px Newsreader", "italic 400 100px Newsreader", "400 40px Inter", "500 40px 'Space Grotesk'", "400 40px 'IBM Plex Mono'", "500 40px 'IBM Plex Mono'"].map((f) => document.fonts.load(f));
    Promise.all([...imgs, ...fonts]).then(() => document.fonts.ready).then(() => continueRender(handle));
  }, [handle]);
}

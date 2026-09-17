/**
 * The ten planet renders, as bodies and never as UI (§9). They are 192 px
 * WebP with alpha, so anything larger than MAX_RENDER_PX must fall back to the
 * drawn sphere rather than upscale a soft image (MB-13).
 */
import sunImg from "@/assets/planets/sun.webp";
import moonImg from "@/assets/planets/moon.webp";
import mercuryImg from "@/assets/planets/mercury.webp";
import venusImg from "@/assets/planets/venus.webp";
import marsImg from "@/assets/planets/mars.webp";
import jupiterImg from "@/assets/planets/jupiter.webp";
import saturnImg from "@/assets/planets/saturn.webp";
import uranusImg from "@/assets/planets/uranus.webp";
import neptuneImg from "@/assets/planets/neptune.webp";
import plutoImg from "@/assets/planets/pluto.webp";

export const PLANET_RENDERS: Record<string, string> = {
  sun: sunImg,
  moon: moonImg,
  mercury: mercuryImg,
  venus: venusImg,
  mars: marsImg,
  jupiter: jupiterImg,
  saturn: saturnImg,
  uranus: uranusImg,
  neptune: neptuneImg,
  pluto: plutoImg,
};

export const MAX_RENDER_PX = 90;

/** Chiron and the nodes have no render, which usefully reads as "point, not planet". */
export function renderFor(body: string, sizePx: number): string | null {
  if (sizePx > MAX_RENDER_PX) return null;
  return PLANET_RENDERS[body] ?? null;
}

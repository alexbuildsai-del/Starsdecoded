/**
 * The orthographic globe the loading stories turn to a birthplace (report-loading-story §1): the Earth as seen
 * from far off, centred on one place. Pure: degrees in, points and SVG paths out, so a story's frame is worked out
 * here and its component only draws it.
 */

const RAD = Math.PI / 180;

/** [longitude, latitude] in degrees, east and north positive, as Natural Earth lists a ring's points. */
export type LonLat = readonly [lon: number, lat: number];
export type Ring = readonly LonLat[];

export interface GlobeView {
  /** The place at the centre of the globe, in degrees. */
  lat0: number;
  lon0: number;
  /** The globe's radius, in the drawing's units. */
  r: number;
}

/**
 * A place on the globe, measured from its centre: x to the east and y to the south, the way SVG counts, so a
 * component adds its centre and draws. `front` is false when the place is on the far side.
 */
export interface GlobePoint {
  x: number;
  y: number;
  front: boolean;
}

export function orthographic({ lat0, lon0, r }: GlobeView): (lat: number, lon: number) => GlobePoint {
  const sin0 = Math.sin(lat0 * RAD);
  const cos0 = Math.cos(lat0 * RAD);
  return (lat, lon) => {
    const phi = lat * RAD;
    const dl = (lon - lon0) * RAD;
    const sinPhi = Math.sin(phi);
    const cosPhi = Math.cos(phi);
    const cosDl = Math.cos(dl);
    return {
      x: r * cosPhi * Math.sin(dl),
      y: -r * (cos0 * sinPhi - sin0 * cosPhi * cosDl),
      front: sin0 * sinPhi + cos0 * cosPhi * cosDl >= 0,
    };
  };
}

const meridian = (lon: number): Ring => Array.from({ length: 37 }, (_, k): LonLat => [lon, -90 + k * 5]);
const parallel = (lat: number): Ring => Array.from({ length: 73 }, (_, k): LonLat => [-180 + k * 5, lat]);

/** The globe's faint grid: a meridian every 30° and a parallel every 30° from 60° S to 60° N. */
export const GRATICULE: readonly Ring[] = [
  ...Array.from({ length: 12 }, (_, i) => meridian(-180 + i * 30)),
  ...[-60, -30, 0, 30, 60].map(parallel),
];

/**
 * One SVG path through every stretch of the rings on the near side, drawn around (cx, cy). A ring breaks where it
 * goes round the back, so no line cuts across the globe's face.
 */
export function visiblePath(
  project: (lat: number, lon: number) => GlobePoint,
  rings: readonly Ring[],
  cx: number,
  cy: number,
): string {
  const parts: string[] = [];
  for (const ring of rings) {
    let pen = false;
    for (const [lon, lat] of ring) {
      const p = project(lat, lon);
      if (!p.front) {
        pen = false;
        continue;
      }
      parts.push(`${pen ? "L" : "M"}${(cx + p.x).toFixed(1)} ${(cy + p.y).toFixed(1)}`);
      pen = true;
    }
  }
  return parts.join("");
}

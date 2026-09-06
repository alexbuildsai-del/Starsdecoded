import { lazy, Suspense, useRef } from "react";

// Code-split the Leaflet map: leaflet + react-leaflet + leaflet.css
// add ~150KB to the bundle and we don't want them blocking initial paint.
const BirthLocationLeafletMap = lazy(
  () => import("./BirthLocationLeafletMap")
);

interface Props {
  birthPlace: string;
  birthTime: string;
  latitude: number;
  longitude: number;
  ascendantSign: string;
  ascendantDegree: number;
  ascendantAbsoluteDegree: number;
}

const GOOGLE_MAPS_API_KEY: string | undefined = import.meta.env
  .VITE_GOOGLE_MAPS_API_KEY;

function GoogleMapsEmbed({
  latitude,
  longitude,
  birthPlace,
}: {
  latitude: number;
  longitude: number;
  birthPlace: string;
}) {
  const src = `https://www.google.com/maps/embed/v1/view?key=${encodeURIComponent(
    GOOGLE_MAPS_API_KEY ?? ""
  )}&center=${latitude},${longitude}&zoom=10&maptype=roadmap`;
  return (
    <iframe
      title={`Map of ${birthPlace}`}
      src={src}
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
      allowFullScreen={false}
      className="w-full h-full block border-0"
      style={{
        // Visually approximate the editorial dark theme until the
        // Google Maps JS SDK + style JSON path is added.
        filter: "invert(0.92) hue-rotate(180deg) saturate(0.7) brightness(0.9)",
      }}
    />
  );
}

function formatLatitude(lat: number): string {
  const hemisphere = lat >= 0 ? "N" : "S";
  return `${Math.abs(lat).toFixed(4)}° ${hemisphere}`;
}

function formatLongitude(lng: number): string {
  const hemisphere = lng >= 0 ? "E" : "W";
  return `${Math.abs(lng).toFixed(4)}° ${hemisphere}`;
}

function cityPill(birthPlace: string): string {
  const first = birthPlace.split(",").slice(0, 2).join(",").trim();
  return first.toUpperCase();
}

function MapPlaceholder() {
  return (
    <div
      className="w-full h-full min-h-[260px] flex items-center justify-center"
      style={{ background: "#0d1117" }}
      aria-hidden
    >
      <div className="w-2 h-2 rounded-full bg-primary/60 animate-pulse" />
    </div>
  );
}

function HorizonDiagram({
  ascendantSign,
  ascendantAbsoluteDegree,
}: {
  ascendantSign: string;
  ascendantAbsoluteDegree: number;
}) {
  const cx = 110;
  const cy = 110;
  const ringR = 86;
  const dotR = 5;

  // Use the ascendant's absolute zodiac degree as a bearing (from North),
  // giving each chart a unique horizon orientation.
  const bearingDeg = ((ascendantAbsoluteDegree % 360) + 360) % 360;
  const rad = ((bearingDeg - 90) * Math.PI) / 180;
  const dotX = cx + ringR * Math.cos(rad);
  const dotY = cy + ringR * Math.sin(rad);

  return (
    <svg viewBox="0 0 220 220" className="w-full max-w-[220px] mx-auto">
      <defs>
        <radialGradient id="horizonGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(92,107,192,0.18)" />
          <stop offset="60%" stopColor="rgba(92,107,192,0.06)" />
          <stop offset="100%" stopColor="rgba(13,17,23,0)" />
        </radialGradient>
        <radialGradient id="dotGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(159,168,218,0.95)" />
          <stop offset="60%" stopColor="rgba(124,131,212,0.5)" />
          <stop offset="100%" stopColor="rgba(124,131,212,0)" />
        </radialGradient>
      </defs>

      {/* Soft inner glow */}
      <circle cx={cx} cy={cy} r={ringR + 12} fill="url(#horizonGlow)" />

      {/* Horizon circle */}
      <circle
        cx={cx}
        cy={cy}
        r={ringR}
        fill="none"
        stroke="rgba(159,168,218,0.18)"
        strokeWidth="1"
      />
      <circle
        cx={cx}
        cy={cy}
        r={ringR - 22}
        fill="none"
        stroke="rgba(159,168,218,0.08)"
        strokeWidth="0.75"
      />

      {/* Crosshairs */}
      <line
        x1={cx - ringR}
        y1={cy}
        x2={cx + ringR}
        y2={cy}
        stroke="rgba(159,168,218,0.1)"
        strokeWidth="0.5"
        strokeDasharray="2 4"
      />
      <line
        x1={cx}
        y1={cy - ringR}
        x2={cx}
        y2={cy + ringR}
        stroke="rgba(159,168,218,0.1)"
        strokeWidth="0.5"
        strokeDasharray="2 4"
      />

      {/* Cardinal labels */}
      <text
        x={cx}
        y={cy - ringR - 6}
        textAnchor="middle"
        fontSize="9"
        fontFamily="Space Grotesk"
        fill="rgba(159,168,218,0.55)"
        letterSpacing="0.18em"
      >
        N
      </text>
      <text
        x={cx + ringR + 10}
        y={cy + 3}
        textAnchor="middle"
        fontSize="9"
        fontFamily="Space Grotesk"
        fill="rgba(159,168,218,0.55)"
        letterSpacing="0.18em"
      >
        E
      </text>
      <text
        x={cx}
        y={cy + ringR + 12}
        textAnchor="middle"
        fontSize="9"
        fontFamily="Space Grotesk"
        fill="rgba(159,168,218,0.55)"
        letterSpacing="0.18em"
      >
        S
      </text>
      <text
        x={cx - ringR - 10}
        y={cy + 3}
        textAnchor="middle"
        fontSize="9"
        fontFamily="Space Grotesk"
        fill="rgba(159,168,218,0.55)"
        letterSpacing="0.18em"
      >
        W
      </text>

      {/* Centre marker */}
      <circle cx={cx} cy={cy} r={1.5} fill="rgba(159,168,218,0.4)" />

      {/* Orientation dot with glow */}
      <circle cx={dotX} cy={dotY} r={dotR + 6} fill="url(#dotGlow)" />
      <circle
        cx={dotX}
        cy={dotY}
        r={dotR}
        fill="rgba(220,225,245,0.95)"
        stroke="rgba(124,131,212,0.7)"
        strokeWidth="1"
      />

      {/* Ascendant label below dot */}
      <text
        x={dotX}
        y={dotY + 18}
        textAnchor="middle"
        fontSize="7.5"
        fontFamily="Space Grotesk"
        fill="rgba(159,168,218,0.7)"
        letterSpacing="0.12em"
      >
        ASC · {ascendantSign.toUpperCase()}
      </text>
    </svg>
  );
}

export function BirthLocationHorizon({
  birthPlace,
  birthTime,
  latitude,
  longitude,
  ascendantSign,
  ascendantDegree,
  ascendantAbsoluteDegree,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cityShort = cityPill(birthPlace);

  return (
    <section ref={containerRef} className="mb-12 print-section">
      <div className="rounded-2xl border border-border/60 bg-card/40 p-6 md:p-8">
        {/* Header row */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-2xl md:text-3xl font-light">
            Birth Location &amp; Horizon
          </h2>
          <span className="px-3 py-1.5 rounded-full border border-border/60 bg-background/60 text-[10px] font-label tracking-[0.18em] uppercase text-muted-foreground">
            {cityShort}
          </span>
        </div>

        <div className="grid md:grid-cols-[1.6fr_1fr] gap-5">
          {/* Left: Map — Google Maps when VITE_GOOGLE_MAPS_API_KEY is set,
              lazily-loaded Leaflet + CartoDB Dark Matter as fallback. */}
          <div className="relative rounded-xl overflow-hidden border border-border/50 bg-background/40 min-h-[260px]">
            {GOOGLE_MAPS_API_KEY ? (
              <GoogleMapsEmbed
                latitude={latitude}
                longitude={longitude}
                birthPlace={birthPlace}
              />
            ) : (
              <Suspense fallback={<MapPlaceholder />}>
                <BirthLocationLeafletMap
                  latitude={latitude}
                  longitude={longitude}
                />
              </Suspense>
            )}

            {/* Coordinate chip overlay (works for both map providers) */}
            <div className="absolute left-3 bottom-3 z-[400] rounded-md border border-border/60 bg-background/85 backdrop-blur-sm px-3 py-1.5 pointer-events-none">
              <div className="font-label text-[10px] uppercase tracking-[0.18em] text-muted-foreground/80">
                {birthPlace.split(",")[0]}
              </div>
              <div className="font-label text-[11px] text-foreground/90 mt-0.5">
                {formatLatitude(latitude)} · {formatLongitude(longitude)}
              </div>
            </div>
          </div>

          {/* Right: Horizon diagram */}
          <div className="rounded-xl border border-border/50 bg-background/40 p-5 flex flex-col">
            <p className="font-label text-[10px] tracking-[0.22em] uppercase text-muted-foreground mb-4">
              Local Horizon State
            </p>
            <div className="flex-1 flex items-center justify-center">
              <HorizonDiagram
                ascendantSign={ascendantSign}
                ascendantAbsoluteDegree={ascendantAbsoluteDegree}
              />
            </div>
            <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground/80 text-center">
              The celestial arrangement relative to the observer&apos;s place at{" "}
              <span className="text-foreground/85">{birthTime}</span>{" "}
              <span className="font-label">
                ({ascendantDegree.toFixed(1)}° {ascendantSign} rising)
              </span>
              .
            </p>
          </div>
        </div>

        {/* Latitude / Longitude tiles */}
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-border/50 bg-background/30 px-5 py-4">
            <p className="font-label text-[10px] tracking-[0.22em] uppercase text-muted-foreground mb-1.5">
              Latitude
            </p>
            <p className="font-display text-xl md:text-2xl font-light text-foreground/95">
              {formatLatitude(latitude)}
            </p>
          </div>
          <div className="rounded-xl border border-border/50 bg-background/30 px-5 py-4">
            <p className="font-label text-[10px] tracking-[0.22em] uppercase text-muted-foreground mb-1.5">
              Longitude
            </p>
            <p className="font-display text-xl md:text-2xl font-light text-foreground/95">
              {formatLongitude(longitude)}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

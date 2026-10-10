import { PlanetBody, PlanetBodyMark } from "@/ds/atoms/PlanetBody";

const BODIES = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto", "chiron", "north_node", "south_node"];

export default function PlanetBodyExample() {
  return (
    <div className="grid gap-6">
      <figure>
        <figcaption>In flow at 26 px (a Chip's icon slot); Chiron and the nodes are drawn points</figcaption>
        <div className="flex flex-wrap gap-3">{BODIES.map((b) => <PlanetBody key={b} body={b} size={26} />)}</div>
      </figure>
      <figure>
        <figcaption>On a chart: backing disc, and the R for going backwards</figcaption>
        <svg width={260} height={70} viewBox="0 0 260 70">
          <PlanetBodyMark body="jupiter" size={40} x={35} y={35} disc />
          <PlanetBodyMark body="mercury" size={40} x={105} y={35} disc retrograde />
          <PlanetBodyMark body="sun" size={40} x={175} y={35} disc />
          <PlanetBodyMark body="chiron" size={40} x={235} y={35} disc />
        </svg>
      </figure>
    </div>
  );
}

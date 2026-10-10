import { calculateNatalChart } from "@workspace/engine";
import audrey from "../../../../fixtures/charts/audrey-hepburn.json";
import { PlacementLabel, ordinal } from "./PlacementLabel";
import { HOUSE_WORDS } from "@/lib/houses";

const timed = calculateNatalChart(audrey.birthDate, audrey.birthTime, audrey.latitude, audrey.longitude, audrey.timezone);
const blind = calculateNatalChart(audrey.birthDate, audrey.birthTime, audrey.latitude, audrey.longitude, audrey.timezone, 720);

const word = (house?: number) => (house ? HOUSE_WORDS[house - 1].toLowerCase() : undefined);
const mercury = timed.planets.mercury;
const backwards = Object.entries(timed.planets).filter(([, p]) => p.retrograde).slice(0, 2);
const rows = [["mercury", mercury] as const, ...backwards];

function Caption({ children }: { children: string }) {
  return <p className="m-0 font-label text-label uppercase text-label-dim">{children}</p>;
}

export default function PlacementLabelExample() {
  return (
    <div className="grid max-w-md gap-6">
      <div className="grid gap-2">
        <Caption>Today · O22 · hand-made tooltip</Caption>
        <div className="w-fit whitespace-nowrap rounded-md border border-[#242C3B] bg-[rgba(23,29,41,.96)] px-2.5 py-1.5 font-numeric text-[11.5px] leading-tight text-[#E8EBF2]">
          Mercury · {mercury.degree.toFixed(1)}° {mercury.sign} · {ordinal(mercury.house ?? 1)} ({word(mercury.house)})
        </div>
      </div>
      <div className="grid gap-2">
        <Caption>After · on a chart</Caption>
        <PlacementLabel body="mercury" deg={mercury.degree} sign={mercury.sign} house={mercury.house} />
      </div>
      <div className="grid gap-2">
        <Caption>After · with the house word</Caption>
        <PlacementLabel body="mercury" deg={mercury.degree} sign={mercury.sign} house={mercury.house} houseWord={word(mercury.house)} />
      </div>
      <div className="grid gap-2">
        <Caption>After · a row in a list, with any body going backwards</Caption>
        <div>
          {rows.map(([body, p]) => (
            <PlacementLabel key={body} variant="row" body={body} deg={p.degree} sign={p.sign} house={p.house} retrograde={p.retrograde} />
          ))}
        </div>
      </div>
      <div className="grid gap-2">
        <Caption>After · no birth time</Caption>
        <PlacementLabel variant="row" body="mercury" deg={blind.planets.mercury.degree} sign={blind.planets.mercury.sign} house={blind.planets.mercury.house} />
      </div>
    </div>
  );
}

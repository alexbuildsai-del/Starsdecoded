import { ChoiceTile } from "./ChoiceTile";

const noop = () => {};

export default function ChoiceTileExample() {
  return (
    <div className="grid max-w-sm gap-6">
      <div className="grid gap-2">
        <p className="m-0 font-label text-label uppercase text-label-dim">Today · B11 · Space Grotesk 13.5 px</p>
        <span className="inline-grid grid-cols-2 gap-2">
          <button type="button" className="grid min-h-14 min-w-0 content-center gap-0.5 rounded-[10px] border border-primary bg-primary px-3 py-2.5 text-left text-white">
            <span className="font-label text-[13.5px] font-medium leading-tight">Your Personal report</span>
            <span className="text-xs leading-snug text-white">Start with you</span>
          </button>
          <button type="button" className="grid min-h-14 min-w-0 content-center gap-0.5 rounded-[10px] border border-[#2E3646] bg-transparent px-3 py-2.5 text-left text-[#E8EBF2]">
            <span className="font-label text-[13.5px] font-medium leading-tight">Compatibility</span>
            <span className="text-xs leading-snug text-[#9AA3B5]">Pick two people</span>
          </button>
        </span>
      </div>
      <div className="grid gap-2">
        <p className="m-0 font-label text-label uppercase text-label-dim">After · Inter 15 px</p>
        <div className="grid grid-cols-2 gap-2">
          <ChoiceTile main title="Your Personal report" line="Start with you" onClick={noop} />
          <ChoiceTile title="Compatibility" line="Pick two people" onClick={noop} />
        </div>
      </div>
      <div className="grid gap-2">
        <p className="m-0 font-label text-label uppercase text-label-dim">After · disabled</p>
        <div className="grid grid-cols-2 gap-2">
          <ChoiceTile disabled title="Your Personal report" line="Start with you" onClick={noop} />
          <ChoiceTile disabled title="Compatibility" line="Pick two people" onClick={noop} />
        </div>
      </div>
    </div>
  );
}

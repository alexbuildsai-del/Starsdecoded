import { Strip } from "./Strip";

export default function StripExample() {
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <div className="grid content-start gap-2">
        <p className="m-0 font-label text-label uppercase text-label-dim">Today</p>
        <figure className="m-0 grid min-w-0 rounded-[13px] border border-[#242C3B] bg-[#171D29] px-4 py-[15px] text-[#E8EBF2]">
          <blockquote className="m-0 font-display text-sm italic leading-normal">“You like to know the plan before you say yes.”</blockquote>
          <figcaption className="mt-3 border-t border-[#1A202C] pt-2.5 font-label text-[9.5px] uppercase tracking-[.14em] text-[#AEB6C6]">
            Your Personal report
          </figcaption>
        </figure>
        <p className="m-0 text-caption text-muted">C15 · AskCards, 13 px corners, a 9.5 px caption</p>
      </div>
      <div className="grid content-start gap-2">
        <p className="m-0 font-label text-label uppercase text-label-dim">After</p>
        <Strip>
          <figure className="m-0 grid gap-2.5">
            <blockquote className="m-0 font-display text-ui italic text-paper">“You like to know the plan before you say yes.”</blockquote>
            <figcaption className="border-t border-line-soft pt-2.5 font-label text-label uppercase text-paper-dim">Your Personal report</figcaption>
          </figure>
        </Strip>
        <p className="m-0 text-caption text-muted">The standard strip: raised fill, no edge, caption at 11 px</p>
      </div>
    </div>
  );
}

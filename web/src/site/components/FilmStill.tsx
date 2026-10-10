/**
 * A film self-hosted on a public page (report-loading-story §5, ADR-323), so there is no third-party player and no
 * cookie. The page arrives with a still and a video that fetches nothing (preload="none") until a tap plays it with its
 * voice; the captions are burned into the picture, so there is no caption track to load. Narrower than the site's
 * 560 px step the 9:16 cut plays, which a phone held upright fills; a wider screen gets the 16:9 cut.
 */
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { TextButton } from "@/ds/atoms/TextButton";

export type FilmCut = { video: string; still: string; width: number; height: number };
export type Film = { title: string; seconds: number; wide: FilmCut; tall: FilmCut };

const WIDE = "(min-width: 560px)";

type Stage = "still" | "starting" | "playing";

export function FilmStill({ film }: { film: Film }) {
  const video = useRef<HTMLVideoElement>(null);
  const focusVideo = useRef(false);
  const [stage, setStage] = useState<Stage>("still");
  const playing = stage === "playing";

  // The play button leaves with the still, so a keyboard reader who pressed it goes on from the video's own controls.
  useEffect(() => {
    if (playing && focusVideo.current) video.current?.focus();
  }, [playing]);

  function play(event: MouseEvent<HTMLButtonElement>) {
    const element = video.current;
    if (!element || stage !== "still") return;
    focusVideo.current = document.activeElement === event.currentTarget;
    // The browser matched a source to the window when the page loaded; a window resized across the step since then
    // loads the cut its still now shows.
    const cut = window.matchMedia(WIDE).matches ? film.wide : film.tall;
    if (!element.currentSrc.endsWith(cut.video)) element.load();
    setStage("starting");
    // Called inside the tap, so a browser that wants a gesture before sound has one; a refusal still shows its controls.
    element.play().catch(() => setStage("playing"));
  }

  return (
    <div className="relative mx-auto aspect-[9/16] w-[min(100%,calc(80svh*9/16))] min-[560px]:aspect-video min-[560px]:w-[min(100%,calc(80svh*16/9))]">
      <video
        ref={video}
        className="absolute inset-0 size-full rounded-control bg-void"
        preload="none"
        playsInline
        controls={playing}
        aria-label={film.title}
        aria-hidden={playing ? undefined : true}
        onPlaying={() => setStage("playing")}
      >
        {/* The wide cut first: a browser that ignores `media` here plays it on every screen, letterboxed on a phone. */}
        <source src={film.wide.video} type="video/mp4" media={WIDE} />
        <source src={film.tall.video} type="video/mp4" />
      </video>
      <TextButton
        onClick={play}
        inert={playing}
        aria-label={`Play the video: ${film.title}`}
        className={`group absolute inset-0 block min-h-0 rounded-control p-0 transition-opacity duration-(--dur-slow) ease-[var(--ease)] after:content-none motion-reduce:transition-none ${
          playing ? "pointer-events-none opacity-0" : stage === "starting" ? "cursor-progress" : "cursor-pointer"
        }`}
      >
        <picture>
          <source media={WIDE} srcSet={film.wide.still} width={film.wide.width} height={film.wide.height} />
          <img
            src={film.tall.still}
            width={film.tall.width}
            height={film.tall.height}
            alt=""
            decoding="async"
            className="block size-full rounded-control object-cover"
          />
        </picture>
        <span
          aria-hidden="true"
          className={`absolute top-1/2 left-1/2 grid size-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-indigo text-on-indigo transition-[background-color,transform,opacity] duration-(--dur-fast) ease-[var(--ease)] group-hover:bg-indigo-hover group-active:scale-95 motion-reduce:transition-none ${
            stage === "starting" ? "opacity-70" : ""
          }`}
        >
          <svg viewBox="0 0 24 24" className="ml-[3px] size-7" fill="currentColor">
            <path d="M7 4.5v15l12-7.5z" />
          </svg>
        </span>
      </TextButton>
    </div>
  );
}

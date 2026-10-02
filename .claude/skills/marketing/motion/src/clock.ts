// A frame-locked clock, so the product's own live components (rAF loops, CSS keyframes, WAAPI) render
// the same frame every time. performance.now and rAF timestamps read the composition's time; every
// document animation is paused and set to the time since it first appeared. Render with concurrency 1:
// a component's start is the virtual time it mounted, which only holds when frames come in order.
const realRAF = window.requestAnimationFrame.bind(window);
let vt = 0;
performance.now = () => vt;
window.requestAnimationFrame = (cb: FrameRequestCallback) => realRAF(() => cb(vt));

const starts = new WeakMap<Animation, number>();
export function syncAnimations() {
  for (const a of document.getAnimations()) {
    if (!starts.has(a)) starts.set(a, vt);
    const local = vt - starts.get(a)!;
    const end = a.effect?.getComputedTiming().endTime;
    if (typeof end === "number" && Number.isFinite(end) && local >= end) {
      if (a.playState !== "finished") a.finish();
      continue;
    }
    a.pause();
    a.currentTime = Math.max(0, local);
  }
}
export function setVirtualTime(ms: number) { vt = ms; }
/** Two real frames: every rAF loop has drawn at the new time, then animations are set. */
export const settle = () => new Promise<void>((done) => realRAF(() => realRAF(() => { syncAnimations(); done(); })));

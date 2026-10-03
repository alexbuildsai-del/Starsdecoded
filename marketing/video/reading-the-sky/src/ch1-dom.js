// The words and the product wheel on one paused GSAP timeline; positions come from the scene's layout.
(function () {
  const L = window.__L, S = window.SCENES, K = window.KEYS;
  const { W, H, V, U, CX, CY, RO, SC } = L;
  const $ = (id) => document.getElementById(id);
  const place = (el, x, y, anchor = "c") => {
    el.style.left = `${x}px`; el.style.top = `${y}px`;
    el.style.transform = anchor === "c" ? "translate(-50%,-50%)" : anchor === "l" ? "translate(0,-50%)" : "translate(-100%,-50%)";
  };

  // The product's wheel, sized so its band sits exactly on the drawn ring, turned as the website turns it.
  const wheel = $("wheel"), size = 702 * SC;
  Object.assign(wheel.style, { width: `${size}px`, height: `${size}px`, left: `${CX - 351 * SC}px`, top: `${CY - 351 * SC}px` });
  $("wheel-tilt").style.transform = `rotate(${window.WHEEL_TILT}deg)`;

  const sideX = V ? W / 2 : W * 0.155, sideX2 = V ? W / 2 : W * 0.845;
  const below = CY + RO + 90 * U;
  const title = $("title"); title.style.top = `${V ? H * 0.08 : H * 0.07}px`;
  place($("date"), V ? W / 2 : W * 0.155, V ? H * 0.085 : H * 0.12, "c");
  place($("clock"), V ? W / 2 : W * 0.845, V ? H * 0.075 : H * 0.2, "c");
  place($("rising"), V ? W / 2 : W * 0.845, V ? below : H * 0.33, "c");
  place($("chip-periods"), V ? W / 2 : sideX, V ? below : H * 0.24, "c");
  place($("chip-flat"), V ? W / 2 : sideX, V ? below + 80 * U : H * 0.32, "c");
  place($("note-scale"), V ? W / 2 : sideX, V ? H * 0.14 : H * 0.9, "c");
  place($("chip-eq"), V ? W / 2 : sideX, V ? below : H * 0.24, "c");
  place($("chip-pisces"), V ? W / 2 : sideX, V ? below + 80 * U : H * 0.32, "c");
  place($("chip-time"), V ? W / 2 : sideX, V ? below + 10 * U : H * 0.24, "c");
  place($("chip-sunrise"), V ? W / 2 : sideX, V ? below + 88 * U : H * 0.32, "c");
  place($("chip-speed"), V ? W / 2 : sideX2, V ? below + 88 * U : H * 0.42, "c");
  place($("lab-east"), V ? 28 * U : CX - RO - 40 * U, CY - 30 * U, V ? "l" : "r");
  place($("lab-west"), V ? W - 28 * U : CX + RO + 40 * U, CY - 30 * U, V ? "r" : "l");
  place($("lab-zodiac"), CX, CY - RO - 34 * U, "c");
  document.querySelectorAll(".signline").forEach((el) => { el.style.top = `${CY}px`; el.style.transform = "translateY(-50%)"; el.style.padding = `0 ${W / 2 - L.RI * 0.8}px`; });
  const cap = $("caption"); cap.style.top = `${V ? H * 0.765 : H * 0.885}px`;
  if (V) document.head.insertAdjacentHTML("beforeend", "<style>#caption .line{max-width:74%}</style>");
  const end = $("end"); end.style.top = `${V ? below + 40 * U : H * 0.4}px`;
  if (!V) { end.style.left = `${W * 0.76}px`; end.style.right = "0"; }

  if (!V) document.querySelectorAll(".chip").forEach((el) => { el.classList.add("wrap"); el.style.maxWidth = `${W * 0.25}px`; });
  if (V) document.querySelectorAll(".chip").forEach((el) => { el.classList.add("wrap"); el.style.maxWidth = `${W * 0.86}px`; });
  const tl = gsap.timeline({ paused: true });
  const E = "expo.out";
  const show = (sel, a, b, d = 0.6) => {
    tl.fromTo(sel, { opacity: 0, y: 14 * U }, { opacity: 1, y: 0, duration: d, ease: E }, a);
    if (b != null) tl.to(sel, { opacity: 0, duration: 0.5, ease: "power2.in" }, b);
  };

  // 1 · the title is the promise, on screen inside the first second.
  show("#title", 0.15, 3.3, 0.9);
  // The wheel assembles on the gathered ring: band and houses, then each body drops onto its degree.
  tl.fromTo("#wheel", { opacity: 0, scale: 1.04 }, { opacity: 1, scale: 1, duration: 1.4, ease: E }, 7.5);
  tl.fromTo("#wheel .wl-body", { opacity: 0, scale: 1.8, transformOrigin: "50% 50%" }, { opacity: 1, scale: 1, duration: 0.7, ease: "back.out(1.6)", stagger: 0.09 }, 8.2);
  tl.to("#wheel", { opacity: 0, scale: 0.92, duration: 0.9, ease: "power2.in" }, S.disc[0] - 0.3);

  // 2 · the year to the birth date, the orbits' facts, and the zodiac named.
  show("#date", S.disc[0] + 0.8, K.soFrom + 0.4);
  show("#chip-periods", K.speed - 0.2, K.flat + 0.2);
  show("#note-scale", S.disc[0] + 1.2, K.soFrom + 0.4);
  show("#chip-flat", K.flat + 1.6, K.soFrom + 1.2);
  show("#lab-zodiac", K.zodiac - 0.1, S.disc[1] + 1.4);

  // 3 · the equinox, the mismatch with the stars, then one line per sign.
  show("#chip-eq", K.spring - 0.6, K.named - 0.4);
  show("#chip-pisces", K.named + 1.0, S.beat[0] - 0.2);
  document.querySelectorAll(".signline").forEach((el, i) => {
    const a = S.beat[0] + i * S.beatStep;
    tl.fromTo(el, { opacity: 0, y: 10 * U }, { opacity: 1, y: 0, duration: 0.35, ease: E }, a);
    tl.to(el, { opacity: 0, duration: 0.25, ease: "power2.in" }, a + S.beatStep - 0.22);
  });

  // 4 · the horizon, the clock, the rising times, then the product wheel lands on the drawn sky.
  show("#lab-east", S.horizon[0] + 1.4, null);
  show("#lab-west", S.horizon[0] + 1.6, S.end[0]);
  show("#clock", S.sweep[0] - 0.4, S.end[0]);
  show("#rising", S.sweep[0], K.London - 1.0);
  show("#chip-speed", K.slow - 0.4, K.London - 1.0);
  show("#chip-time", K.London - 0.2, S.end[0]);
  show("#chip-sunrise", K.Virgo + 0.2, S.end[0]);
  tl.fromTo("#wheel", { opacity: 0, scale: 1 }, { opacity: 1, scale: 1, duration: 1.6, ease: E, immediateRender: false }, K.here - 0.6);
  tl.set("#wheel .wl-body", { opacity: 1, scale: 1 }, K.here - 0.6);
  tl.to("#lab-east", { opacity: 0, duration: 0.5 }, S.end[0]);
  show("#end", S.end[0] + 0.7, null, 0.9);

  window.__timelines["ch1"] = tl;
})();

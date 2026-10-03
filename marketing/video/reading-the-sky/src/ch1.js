// Chapter 1, "The real sky". Every frame is drawn from window.DATA (computed by tools/data.mjs) at the
// time HyperFrames seeks to, so the render is exact; the DOM layers (wheel, words) ride one GSAP timeline.
(function () {
  const D = window.DATA, F = window.FORMAT, K = window.KEYS, CAPS = window.CAPTIONS;
  const W = F.w, H = F.h, V = H > W, U = Math.min(W, H) / 1080;
  const root = document.getElementById("root");
  root.style.setProperty("--u", U);

  const C = { void: "#06080c", ground: "#0d1117", paper: "#e8ebf2", muted: "#9aa3b5", brass: "#d4b06a", indigo: "#5c6bc0", line: "#242c3b" };
  const DEG = Math.PI / 180;
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const lerp = (a, b, k) => a + (b - a) * k;
  const prog = (t, a, b) => clamp((t - a) / (b - a));
  const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
  const out = (k) => 1 - Math.pow(1 - k, 3);
  // The product's one easing, cubic-bezier(.16,1,.3,1), close enough as an expo-out.
  const sd = (k) => (k >= 1 ? 1 : 1 - Math.pow(2, -10 * k));
  const fade = (t, a, b, c, d) => Math.min(prog(t, a, b), 1 - prog(t, c, d));

  // Scene windows (s) and voice starts, set by tools/build.mjs from the measured voice.
  const S = window.SCENES;

  // Layout: the ring sits centre in 16:9 and in the upper part on a phone, clear of TikTok's caption zone.
  const CX = W / 2, CY = V ? H * 0.40 : H * 0.45;
  const RO = V ? W * 0.40 : H * 0.37;            // the band's outer edge, as the product wheel's 286.8
  const SC = RO / 286.8;                          // product wheel units → px
  const RI = 231.6 * SC, RM = (RO + RI) / 2, BAND = RO - RI;

  const canvas = document.getElementById("sky");
  canvas.width = W; canvas.height = H;
  const g = canvas.getContext("2d");

  // Seeded field of faint background stars, so every frame has the same sky.
  let seed = 20120830;
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  const field = Array.from({ length: Math.round(900 * (W * H) / (1920 * 1080)) }, () => ({ x: rnd() * W, y: rnd() * H, r: 0.35 + rnd() * 0.9, a: 0.08 + rnd() * 0.32 }));

  // Star colour from B−V, gentle: blue-white to warm.
  const starCol = (bv) => { const k = clamp(((bv ?? 0.6) + 0.2) / 1.8); return `rgb(${Math.round(lerp(190, 255, k))},${Math.round(lerp(210, 214, k))},${Math.round(lerp(255, 170, k))})`; };
  const magR = (m) => clamp(3.2 - m * 0.5, 0.6, 4.2) * U;
  const magA = (m) => clamp(1.25 - m * 0.15, 0.3, 1);
  const twinkle = (hip, t) => 0.82 + 0.18 * Math.sin(t * (1.3 + (hip % 7) * 0.31) + hip);

  const imgs = {};
  const IMG = ["sun-512", "sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"];
  window.__hf = window.__hf || {}; window.__hf.buildReady = window.__hf.buildReady || {};
  window.__hf.buildReady["ch1-images"] = Promise.all(IMG.map((n) => new Promise((res) => { const i = new Image(); i.onload = res; i.onerror = res; i.src = `assets/planets/${n}.webp`; imgs[n] = i; }))).then(() => draw(window.__hfThreeTime || 0));

  // Ring geometry: a longitude's screen angle when longitude L0 sits on the left (east) end of the horizon.
  const ang = (lon, L0) => (180 - (lon - L0)) * DEG;
  const onRing = (lon, lat, L0, r = RM) => { const a = ang(lon, L0), rr = r + lat * (BAND / 2 / 9); return [CX + rr * Math.cos(a), CY + rr * Math.sin(a)]; };

  // The real stars in the zodiac band (ecliptic of date), and the same stars where they stood over London.
  const band = D.stars.stars;
  const eastByHip = new Map(D.east.stars.map((s) => [s.hip, s]));
  const BODY = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"];
  const bodyLon = (b) => D.chart.planets[b].absoluteDegree;
  const bodyLat = (b) => (D.geo[b] ? D.geo[b].lat : 0);

  // The eastern sky over London at 06:30 BST, stereographic about azimuth 100°, altitude 22°.
  function skyProj(az, alt, az0, alt0, scale, cx, cy) {
    const A = (az - az0) * DEG, h = alt * DEG, h0 = alt0 * DEG;
    const cosc = Math.sin(h0) * Math.sin(h) + Math.cos(h0) * Math.cos(h) * Math.cos(A);
    const k = 2 / (1 + cosc);
    const x = k * Math.cos(h) * Math.sin(A), y = k * (Math.cos(h0) * Math.sin(h) - Math.sin(h0) * Math.cos(h) * Math.cos(A));
    return [cx + x * scale, cy - y * scale, cosc];
  }

  function glow(x, y, r, col, a) {
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, col.replace("A", a)); gr.addColorStop(1, col.replace("A", 0));
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }
  function dot(x, y, r, col, a) { g.globalAlpha = a; g.fillStyle = col; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1; }
  function sprite(name, x, y, r, a = 1) { const i = imgs[name]; if (!i || !i.complete || !i.naturalWidth) return; g.globalAlpha = a; g.drawImage(i, x - r, y - r, r * 2, r * 2); g.globalAlpha = 1; }

  function background(a = 1) {
    g.fillStyle = C.void; g.fillRect(0, 0, W, H);
    const vg = g.createRadialGradient(CX, CY, 0, CX, CY, Math.max(W, H) * 0.75);
    vg.addColorStop(0, "rgba(22,28,44,0.55)"); vg.addColorStop(1, "rgba(6,8,12,0)");
    g.fillStyle = vg; g.fillRect(0, 0, W, H);
    for (const s of field) dot(s.x, s.y, s.r * U, "#dfe6ff", s.a * a);
  }

  // The zodiac ring: band, real stars, and optionally the bodies at their computed longitudes.
  function ring(L0, o) {
    const a = o.a ?? 1;
    if (a <= 0) return;
    g.save();
    g.globalAlpha = a * 0.9;
    g.lineWidth = 1.2 * U; g.strokeStyle = "rgba(212,176,106,0.55)";
    g.beginPath(); g.arc(CX, CY, RO, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = "rgba(212,176,106,0.28)"; g.beginPath(); g.arc(CX, CY, RI, 0, Math.PI * 2); g.stroke();
    const bg = g.createRadialGradient(CX, CY, RI, CX, CY, RO);
    bg.addColorStop(0, "rgba(212,176,106,0.02)"); bg.addColorStop(0.5, `rgba(212,176,106,${0.05 + 0.08 * (o.bandGlow ?? 0)})`); bg.addColorStop(1, "rgba(212,176,106,0.02)");
    g.fillStyle = bg; g.beginPath(); g.arc(CX, CY, RO, 0, Math.PI * 2); g.arc(CX, CY, RI, 0, Math.PI * 2, true); g.fill();
    g.restore();
    const below = o.horizon ? (y) => (y > CY + 1 ? 0.38 : 1) : () => 1;
    for (const s of band) {
      const [x, y] = onRing(s.lon, s.lat, L0);
      dot(x, y, magR(s.mag) * 0.85, starCol(s.bv), magA(s.mag) * a * (Math.abs(s.lat) > 9 ? 0.45 : 1) * below(y));
    }
    if (o.bodies) for (const b of BODY) {
      const [x, y] = onRing(bodyLon(b), bodyLat(b), L0);
      const pa = o.bodies * below(y) * (o.bodyAlpha ? o.bodyAlpha(b) : 1);
      if (pa <= 0) continue;
      const r = (b === "sun" ? 26 : b === "moon" ? 18 : 15) * U * (o.pulse ?? 1);
      if (b === "sun") glow(x, y, r * 3.2, "rgba(255,190,90,A)", 0.35 * pa);
      sprite(b === "sun" ? "sun" : b, x, y, r, pa);
    }
  }

  // ---- Scene 1: the eastern sky over London, gathered into the zodiac ring.
  function hook(t) {
    const [a0, a1] = S.hook;
    const L0 = D.chart.angles.ascendant.absoluteDegree;
    const az0 = 100 + (t - a0) * 0.5, alt0 = 22;
    const scale = (V ? H * 0.50 : W * 0.46);
    const skyCX = W / 2, skyCY = V ? H * 0.47 : H * 0.55;
    const gather = ease(prog(t, 3.4, 7.4));
    const skyA = 1 - prog(t, 3.2, 6.2);
    // Horizon and the dawn: the Sun was 2.4° up, twenty minutes after sunrise.
    if (skyA > 0) {
      const hz = [];
      for (let az = 0; az <= 220; az += 2) hz.push(skyProj(az, 0, az0, alt0, scale, skyCX, skyCY));
      const sun = D.east.bodies.find((b) => /sun/i.test(b.name || b.body));
      const [sx, sy] = skyProj(sun.az, sun.alt, az0, alt0, scale, skyCX, skyCY);
      g.globalAlpha = skyA;
      const dawn = g.createLinearGradient(0, 0, 0, sy + 40 * U);
      dawn.addColorStop(0, "rgba(10,16,34,0)"); dawn.addColorStop(0.65, "rgba(28,44,82,0.35)"); dawn.addColorStop(1, "rgba(120,96,92,0.32)");
      g.fillStyle = dawn; g.fillRect(0, 0, W, H);
      glow(sx, sy, 420 * U, "rgba(255,170,90,A)", 0.28);
      g.globalAlpha = 1;
      for (const s of D.east.stars) {
        if (s.alt < 0) continue;
        const inBand = band.some((b) => b.hip === s.hip);
        if (inBand && gather > 0) continue;
        const [x, y, c] = skyProj(s.az, s.alt, az0, alt0, scale, skyCX, skyCY);
        if (c < -0.2) continue;
        const tw = twinkle(s.hip, t);
        if (s.mag < 1.6) glow(x, y, magR(s.mag) * 5, "rgba(220,230,255,A)", 0.22 * skyA * tw);
        dot(x, y, magR(s.mag), starCol(s.bv), magA(s.mag) * skyA * tw);
        if (s.name && s.mag < 1.6 && skyA > 0.05) { g.globalAlpha = 0.7 * skyA; g.fillStyle = C.muted; g.font = `500 ${15 * U}px "Space Grotesk"`; g.textAlign = "left"; g.fillText(s.name.toUpperCase(), x + 10 * U, y + 5 * U); g.globalAlpha = 1; }
      }
      g.globalAlpha = skyA;
      g.fillStyle = "#07090d"; g.beginPath(); g.moveTo(hz[0][0], hz[0][1]);
      for (const p of hz) g.lineTo(p[0], p[1]);
      g.lineTo(W + 50, H + 50); g.lineTo(-50, H + 50); g.closePath(); g.fill();
      g.strokeStyle = "rgba(212,176,106,0.75)"; g.lineWidth = 1.5 * U; g.beginPath(); g.moveTo(hz[0][0], hz[0][1]);
      for (const p of hz) g.lineTo(p[0], p[1]); g.stroke();
      g.globalAlpha = 1;
      sprite("sun", sx, sy, 20 * U, skyA);
      const tag = (n, x, y) => { g.globalAlpha = 0.9 * skyA; g.fillStyle = C.brass; g.font = `500 ${16 * U}px "Space Grotesk"`; g.textAlign = "left"; g.fillText(n.toUpperCase(), x + 18 * U, y + 5 * U); g.globalAlpha = 1; };
      tag("Sun", sx, sy);
      for (const b of D.east.bodies) {
        const n = (b.name || b.body).toLowerCase();
        if (n === "sun" || b.alt < 0) continue;
        const [x, y] = skyProj(b.az, b.alt, az0, alt0, scale, skyCX, skyCY);
        if (y < 60 * U || x > W - 120 * U) continue;
        glow(x, y, 40 * U, "rgba(255,240,210,A)", 0.25 * skyA);
        sprite(n, x, y, 12 * U, skyA); tag(n, x, y);
      }
    }
    // Each zodiac star flies from where it stood over London to its longitude on the ring.
    for (const s of band) {
      const e = eastByHip.get(s.hip);
      const [rx, ry] = onRing(s.lon, s.lat, L0);
      const st = clamp((gather * 1.35) - ((s.lon - L0 + 360) % 360) / 360 * 0.35);
      let x = rx, y = ry, a = magA(s.mag) * (Math.abs(s.lat) > 9 ? 0.45 : 1);
      if (e && e.alt >= 0) {
        const [ex, ey] = skyProj(e.az, e.alt, az0, alt0, scale, skyCX, skyCY);
        const k = ease(st), k0 = ease(clamp(st - 0.08));
        x = lerp(ex, rx, k); y = lerp(ey, ry, k);
        if (k > 0 && k < 1) { g.strokeStyle = starCol(s.bv); g.globalAlpha = 0.35 * a; g.lineWidth = magR(s.mag) * 0.9; g.beginPath(); g.moveTo(lerp(ex, rx, k0), lerp(ey, ry, k0)); g.lineTo(x, y); g.stroke(); g.globalAlpha = 1; }
      } else a *= st;
      dot(x, y, magR(s.mag) * 0.85, starCol(s.bv), a * (1 - 0.8 * prog(t, 7.8, 9.2)));
    }
    const ringA = prog(t, 6.6, 7.8) * (1 - 0.85 * prog(t, 7.8, 9.2));
    if (ringA > 0) ring(L0, { a: ringA, bodies: 0 });
  }

  // ---- Scene 2: the solar system from above, tipped edge-on, then the view from Earth.
  const ORDER = ["Mercury", "Venus", "Earth", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune"];
  const SIZE = { Mercury: 9, Venus: 13, Earth: 13, Mars: 11, Jupiter: 24, Saturn: 26, Uranus: 15, Neptune: 15 };
  const helioAt = (b, k) => { const arr = D.helio[b], f = k * (arr.length - 1), i = Math.floor(f), j = Math.min(arr.length - 1, i + 1), u = f - i; return arr[i].map((v, n) => lerp(v, arr[j][n], u)); };
  const RMAX = V ? W * 0.47 : H * 0.70;
  const squash = (r) => RMAX * Math.sqrt(r / 30.1);
  function solarXY(v, pitch, zoom, ox, oy) {
    const r = Math.hypot(v[0], v[1], v[2]) || 1e-9, f = squash(r) / r * zoom;
    const x = v[0] * f, y = v[1] * f, z = v[2] * f;
    return [ox + x, oy - (y * Math.cos(pitch) + z * Math.sin(pitch) * 3.0)];
  }
  function disc(t) {
    const [a0] = S.disc;
    const k = t - a0;
    const dayK = sd(prog(k, 0.8, 11.5));
    const pitch = lerp(V ? 46 : 62, 89.2, ease(prog(t, K.flat - 0.6, K.flat + 2.6))) * DEG;
    const toEarth = ease(prog(t, K.soFrom - 0.3, K.soFrom + 2.6));
    const earth = helioAt("Earth", dayK);
    const [ex, ey] = solarXY(earth, pitch, 1, 0, 0);
    const zoom = lerp(1, 7, toEarth);
    const ox = CX - ex * (zoom - 1) * 1, oy = CY - ey * (zoom - 1) * 1;
    const sysA = prog(t, a0 + 0.2, a0 + 1.4) * (1 - prog(t, K.soFrom + 0.6, K.soFrom + 2.4));
    if (sysA > 0) {
      g.save(); g.globalAlpha = sysA;
      for (const b of ORDER) {
        const v = helioAt(b, dayK), rr = squash(Math.hypot(v[0], v[1])) * zoom;
        g.strokeStyle = b === "Earth" ? "rgba(92,107,192,0.75)" : "rgba(154,163,181,0.26)"; g.lineWidth = (b === "Earth" ? 1.6 : 1) * U;
        g.beginPath(); g.ellipse(ox, oy, rr, Math.max(0.6, rr * Math.cos(pitch)), 0, 0, Math.PI * 2); g.stroke();
      }
      glow(ox, oy, 90 * U * Math.sqrt(zoom), "rgba(255,180,80,A)", 0.4);
      sprite("sun-512", ox, oy, 34 * U * Math.sqrt(zoom), 1);
      for (const b of ORDER) {
        const v = helioAt(b, dayK);
        const [x, y] = solarXY(v, pitch, zoom, ox, oy);
        const r = SIZE[b] * U;
        if (b === "Earth") { glow(x, y, r * 3, "rgba(80,140,255,A)", 0.45); dot(x, y, r * 0.75, "#4f86e0", 1); dot(x - r * 0.2, y - r * 0.2, r * 0.3, "#9cc3ff", 0.6); }
        else sprite(b.toLowerCase(), x, y, r, 1);
        g.globalAlpha = sysA * (1 - prog(t, K.flat, K.flat + 1.2)) ;
        g.fillStyle = b === "Earth" ? "#aab6ee" : C.muted; g.font = `500 ${15 * U}px "Space Grotesk"`; g.textAlign = "left";
        g.fillText(b.toUpperCase(), x + r + 6 * U, y + 5 * U);
        g.globalAlpha = sysA;
      }
      g.restore();
    }
    // From Earth: everything sits in one narrow strip of sky, drawn as the ring around us.
    const ringA = prog(t, K.soFrom + 1.4, K.soFrom + 3.2);
    if (ringA > 0) {
      ring(0, { a: ringA, bodies: ringA, bandGlow: fade(t, K.zodiac - 0.2, K.zodiac + 0.4, K.zodiac + 2.4, K.zodiac + 3.6) });
      glow(CX, CY, 46 * U, "rgba(80,140,255,A)", 0.5 * ringA); dot(CX, CY, 10 * U, "#4f86e0", ringA);
    }
  }

  // ---- Scene 3: twelve equal 30° slices from the March equinox; the uneven constellations behind.
  const SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
  function signs(t) {
    const [a0] = S.signs;
    const lit = Math.floor((t - S.beat[0]) / S.beatStep);
    const inBeat = t >= S.beat[0] && t < S.beat[0] + 12 * S.beatStep;
    ring(0, { a: 1, bodies: 1 - 0.6 * prog(t, K.named - 0.5, K.named + 1), bodyAlpha: () => 1 });
    glow(CX, CY, 46 * U, "rgba(80,140,255,A)", 0.5 * (1 - prog(t, S.beat[0] - 1, S.beat[0]))); dot(CX, CY, 10 * U, "#4f86e0", 1 - prog(t, S.beat[0] - 1, S.beat[0]));
    // The equinox point: where the Sun stood on 20 March 2012.
    const eq = prog(t, a0 + 0.4, a0 + 1.6);
    if (eq > 0) {
      const [x1, y1] = onRing(0, 0, 0, RI - 18 * U), [x2, y2] = onRing(0, 0, 0, RO + 30 * U);
      g.globalAlpha = eq; g.strokeStyle = C.brass; g.lineWidth = 2.4 * U; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); g.globalAlpha = 1;
      const [sx, sy] = onRing(0, 0, 0);
      const sunA = fade(t, K.spring - 1.2, K.spring - 0.4, K.signs, K.signs + 1);
      if (sunA > 0) { glow(sx, sy, 70 * U, "rgba(255,180,80,A)", 0.5 * sunA); sprite("sun", sx, sy, 20 * U, sunA); }
    }
    // The twelve dividers, drawn one by one from 0°.
    for (let i = 0; i < 12; i++) {
      const k = sd(prog(t, K.twelve + i * 0.16, K.twelve + i * 0.16 + 0.7));
      if (k <= 0) continue;
      const [x1, y1] = onRing(i * 30, 0, 0, RI), [x2, y2] = onRing(i * 30, 0, 0, lerp(RI, RO, k));
      g.strokeStyle = "rgba(212,176,106,0.75)"; g.lineWidth = 1.4 * U; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
    }
    // Sign names inside the band.
    const nameA = prog(t, K.signs - 0.6, K.signs + 0.6);
    if (nameA > 0) for (let i = 0; i < 12; i++) {
      const on = inBeat && lit === i, done = inBeat && lit > i;
      const a = ang(i * 30 + 15, 0);
      g.save(); g.translate(CX + RM * Math.cos(a), CY + RM * Math.sin(a)); g.rotate(a + Math.PI / 2 + (Math.sin(a) > 0 ? Math.PI : 0));
      g.globalAlpha = nameA * (inBeat ? (on ? 1 : done ? 0.55 : 0.35) : 0.85);
      g.fillStyle = on ? "#f2d79a" : C.brass; g.font = `500 ${(on ? 23 : 19) * U}px "Space Grotesk"`; g.textAlign = "center"; g.textBaseline = "middle";
      g.fillText(SIGNS[i].toUpperCase().split("").join(String.fromCharCode(8202)), 0, 0);
      g.restore();
      if (on) {
        const a1 = ang(i * 30, 0), a2 = ang(i * 30 + 30, 0);
        g.fillStyle = "rgba(212,176,106,0.16)"; g.beginPath(); g.arc(CX, CY, RO, a2, a1); g.arc(CX, CY, RI, a1, a2, true); g.fill();
      }
    }
    // The constellations as the IAU draws them: real stick figures and their uneven spans, outside the band.
    const conA = prog(t, K.named - 0.2, K.named + 1.2) * (1 - 0.5 * prog(t, S.beat[0], S.beat[0] + 1));
    if (conA > 0) {
      const RC = RO + 46 * U;
      for (const c of D.stars.constellations) {
        g.strokeStyle = `rgba(170,186,240,${0.55 * conA})`; g.lineWidth = 1.2 * U;
        for (const line of c.lines) { g.beginPath(); line.forEach(([lon, lat], n) => { const [x, y] = onRing(lon, lat, 0); n ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke(); }
      }
      D.stars.crossings.forEach((c, n) => {
        let a1 = c.enter, a2 = c.leave; if (a2 < a1) a2 += 360;
        g.strokeStyle = n % 2 ? `rgba(170,186,240,${0.85 * conA})` : `rgba(92,107,192,${0.85 * conA})`; g.lineWidth = 5 * U;
        g.beginPath(); g.arc(CX, CY, RC, ang(a2, 0) + 0.012, ang(a1, 0) - 0.012); g.stroke();
        const mid = (a1 + a2) / 2, am = ang(mid, 0), [lx, ly] = [CX + (RC + 26 * U) * Math.cos(am), CY + (RC + 26 * U) * Math.sin(am)];
        g.globalAlpha = conA * 0.95; g.fillStyle = "#aab6ee"; g.font = `500 ${15 * U}px "IBM Plex Mono"`; g.textAlign = "center"; g.textBaseline = "middle";
        g.fillText(c.con.toUpperCase(), lx, ly); g.globalAlpha = 1;
      });
    }
  }

  // ---- Scene 4: the horizon. Earth turns, the zodiac rises in the east, and 06:30 lands Virgo on it.
  const ascAt = (min) => { const a = D.ascEvery2Min, f = clamp(min / 2, 0, a.length - 1), i = Math.floor(f), j = Math.min(a.length - 1, i + 1); let x = a[i], y = a[j]; if (y < x) y += 360; return (lerp(x, y, f - i)) % 360; };
  function horizon(t) {
    const [a0] = S.horizon;
    const turn = ease(prog(t, a0 + 0.2, a0 + 2.2));
    const clockK = ease(prog(t, S.sweep[0], S.sweep[1]));
    const minute = clockK * 390;
    const L0 = turn < 1 ? lerp(0, D.ascEvery2Min[0], turn) : ascAt(minute);
    const hzA = prog(t, a0 + 0.6, a0 + 2.0);
    const handOver = 1 - prog(t, K.here - 0.4, K.here + 0.8);
    ring(L0, { a: 0.15 + 0.85 * handOver, bodies: handOver, horizon: hzA > 0.5, pulse: 1 + 0.35 * fade(t, K.date - 0.1, K.date + 0.3, K.date + 1.2, K.date + 1.8) });
    if (hzA > 0) {
      const ext = (V ? W * 0.5 : RO + 260 * U) * hzA;
      const pulse = fade(t, K.time - 0.1, K.time + 0.3, K.time + 1.4, K.time + 2.0);
      g.strokeStyle = C.brass; g.lineWidth = (2 + 2 * pulse) * U; g.globalAlpha = 0.95;
      g.beginPath(); g.moveTo(CX - ext, CY); g.lineTo(CX + ext, CY); g.stroke(); g.globalAlpha = 1;
      const eastA = 0.55 + 0.45 * fade(t, K.East - 0.1, K.East + 0.3, K.East + 1.6, K.East + 2.2);
      glow(CX - RO, CY, 70 * U, "rgba(212,176,106,A)", 0.35 * eastA * hzA);
    }
    // The rising sign right now, and how long it takes to come up, from the engine's sweep.
    const rising = SIGNS[Math.floor((((L0 % 360) + 360) % 360) / 30)];
    return { minute, rising };
  }

  const clockEl = document.getElementById("clock-t"), dateEl = document.getElementById("date"), risingEl = document.getElementById("rising");
  const capEl = document.getElementById("caption");
  const MON = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  let lastCap = "";
  function captions(t) {
    const c = CAPS.find((g) => t >= g.start && t < g.end + 0.25);
    const html = c ? `<div class="line">${c.words.map((w) => `<span class="w${t >= w.start ? " on" : ""}">${w.text}</span>`).join(" ")}</div>` : "";
    if (html !== lastCap) { capEl.innerHTML = html; lastCap = html; }
  }

  function draw(t) {
    background(1);
    if (t < S.hook[1] + 0.6) hook(t);
    if (t >= S.disc[0] && t < S.disc[1]) disc(t);
    if (t >= S.signs[0] && t < S.signs[1]) signs(t);
    let h = null;
    if (t >= S.horizon[0]) h = horizon(t);
    // Words that follow the drawing.
    const dayK = sd(prog(t - S.disc[0], 0.8, 11.5));
    const d = new Date(Date.UTC(2012, 7, 30) - (1 - dayK) * 366 * 86400000);
    dateEl.textContent = `${String(d.getUTCDate()).padStart(2, "0")} ${MON[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
    if (h) {
      const m = Math.round(h.minute);
      clockEl.textContent = `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
      const mins = D.risingMinutes[h.rising];
      risingEl.innerHTML = `<b>${h.rising.toUpperCase()}</b> rising · takes ${Math.floor(mins / 60) ? Math.floor(mins / 60) + " h " : ""}${mins % 60} m`;
    }
    captions(t);
  }

  window.addEventListener("hf-seek", (e) => draw(e.detail.time));
  draw(window.__hfThreeTime || 0);
  window.__L = { W, H, V, U, CX, CY, RO, RI, SC };
})();

"use client";
import { useEffect } from "react";

/*
 * 首頁沉浸效果（只負責動態，不負責版面）
 * 1. 一天的光線：捲動時，紙面疊的光影色罩跟著變
 * 2. 墨暈標題：「墨鴉」兩字進場時從暈開的墨收攏成清楚的字；游標停在字上就暈開，離開才收攏
 * 3. 線香煙霧：小畫布疊在香爐圖上，煙會被游標撥動
 * 4. 活的蝴蝶與竹雞：蝴蝶閃躲游標，點竹雞會飛走、過幾秒回來
 * 全部在使用者要求「減少動態」時不啟動。
 */

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));

const noop = () => {};

/* ---------- 1. 一天的光線 ---------- */
function setupDaylight(): () => void {
  const dawn = document.querySelector<HTMLElement>(".dl-dawn");
  const dusk = document.querySelector<HTMLElement>(".dl-dusk");
  const sun = document.querySelector<HTMLElement>(".dl-sun");
  if (!dawn || !dusk || !sun) return noop;

  let target = 0;
  let current = 0;
  let raf = 0;

  const read = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    target = max > 0 ? clamp(window.scrollY / max, 0, 1) : 0;
  };

  // p：整頁捲動進度，0 是頁首（早晨），1 是頁尾
  const apply = (p: number) => {
    dawn.style.opacity = String(clamp(1 - p / 0.5, 0, 1));
    dusk.style.opacity = String(clamp((p - 0.45) / 0.5, 0, 1));
    const arc = Math.sin(p * Math.PI);
    sun.style.opacity = String(0.2 + 0.4 * arc);
    sun.style.transform = `translate3d(${(p * 2 - 1) * 35}vw, ${6 - arc * 12}vh, 0)`;
  };

  const tick = () => {
    current += (target - current) * 0.08;
    if (Math.abs(target - current) > 0.0005) {
      raf = requestAnimationFrame(tick);
    } else {
      current = target;
      raf = 0;
    }
    apply(current);
  };

  const onChange = () => {
    read();
    if (!raf) raf = requestAnimationFrame(tick);
  };

  read();
  current = target;
  apply(current);
  window.addEventListener("scroll", onChange, { passive: true });
  window.addEventListener("resize", onChange);
  return () => {
    window.removeEventListener("scroll", onChange);
    window.removeEventListener("resize", onChange);
    if (raf) cancelAnimationFrame(raf);
  };
}

/* ---------- 2. 墨暈標題 ---------- */
const INK_MAX_BLUR = 14;
// 游標停在字上時，暈開程度停在多少（0 清楚、1 最糊）
const INK_HOVER_K = 0.6;
// 進場動畫的開始時間（毫秒，從頁面載入起算），配合進場墨滴揭幕
const INK_START_AT = 750;

function setupInk(): () => void {
  const chars = Array.from(
    document.querySelectorAll<HTMLElement>(".ink-char")
  );
  if (chars.length === 0) return noop;

  const state = chars.map((el, i) => ({
    el,
    blur: document.getElementById(`ink-blur-${i}`),
    mat: document.getElementById(`ink-mat-${i}`),
    k: 0, // 暈開程度：1 最糊，0 清楚
    target: 0, // k 正在往哪裡走：游標停在字上是 INK_HOVER_K，否則是 0
    hover: false,
    raf: 0,
    last: 0,
  }));
  const timers: number[] = [];

  const apply = (i: number) => {
    const s = state[i];
    if (!s.blur || !s.mat) return;
    // 暈開程度同時決定模糊半徑與邊緣的硬度；k=0 時等於沒有濾鏡
    const a = 1 + 19 * s.k;
    s.blur.setAttribute("stdDeviation", (s.k * INK_MAX_BLUR).toFixed(2));
    s.mat.setAttribute(
      "values",
      `1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 ${a.toFixed(2)} ${(-(a - 1) * 0.45).toFixed(2)}`
    );
    s.el.style.filter = `url(#ink-bleed-${i})`;
  };

  const loop = (i: number, now: number) => {
    const s = state[i];
    const frames = clamp((now - s.last) / 16.67, 0, 3);
    s.last = now;
    // 每幀往目標走一段：暈開比收攏慢一點，越接近目標越慢（有慣性）
    const rate = s.target > s.k ? 0.04 : 0.055;
    s.k += (s.target - s.k) * (1 - Math.pow(1 - rate, frames));
    if (s.target === 0 && s.k < 0.015) {
      s.k = 0;
      s.raf = 0;
      s.el.style.filter = "";
      return;
    }
    apply(i);
    if (s.target > 0 && Math.abs(s.target - s.k) < 0.004) {
      s.raf = 0; // 停在暈開的狀態，等游標離開再繼續
      return;
    }
    s.raf = requestAnimationFrame((t) => loop(i, t));
  };

  const run = (i: number) => {
    const s = state[i];
    if (!s.raf) {
      s.last = performance.now();
      s.raf = requestAnimationFrame((t) => loop(i, t));
    }
  };

  // 進場：從 k 開始往清楚收攏（游標此時已在字上，就收攏到暈開的程度為止）
  const bloom = (i: number, k: number) => {
    const s = state[i];
    s.k = k;
    s.target = s.hover ? INK_HOVER_K : 0;
    apply(i);
    run(i);
  };

  // 游標進入：往暈開的程度走；游標離開：往清楚走
  const setHover = (i: number, on: boolean) => {
    const s = state[i];
    s.hover = on;
    s.target = on ? INK_HOVER_K : 0;
    run(i);
  };

  // 先把兩個字設成糊的，等到揭幕時間再開始收攏
  // 這個分頁播過揭幕了（layout.tsx 標記），就不用等揭幕時間
  // 從換頁墨色轉場進來：等墨退到一半（約 0.4 秒）再開始
  const root = document.documentElement;
  const skipIntro = root.hasAttribute("data-intro-seen");
  const wait = root.hasAttribute("data-nav-in")
    ? 400
    : skipIntro
      ? 0
      : Math.max(0, INK_START_AT - performance.now());
  state.forEach((s, i) => {
    s.k = 1;
    apply(i);
    s.raf = 0;
    timers.push(window.setTimeout(() => bloom(i, 1), wait + i * 140));
  });

  const hoverHandlers = chars.map((el, i) => {
    const enter = () => setHover(i, true);
    const leave = () => setHover(i, false);
    el.addEventListener("pointerenter", enter);
    el.addEventListener("pointerleave", leave);
    el.addEventListener("pointercancel", leave);
    return { enter, leave };
  });

  return () => {
    timers.forEach((t) => clearTimeout(t));
    chars.forEach((el, i) => {
      el.removeEventListener("pointerenter", hoverHandlers[i].enter);
      el.removeEventListener("pointerleave", hoverHandlers[i].leave);
      el.removeEventListener("pointercancel", hoverHandlers[i].leave);
      el.style.filter = "";
      if (state[i].raf) cancelAnimationFrame(state[i].raf);
    });
  };
}

/* ---------- 3. 線香煙霧 ---------- */
// 三支香燃燒端在香爐圖上的位置（佔圖寬高的比例，量自 col_1_wish_strip.webp）
const INCENSE_TIPS = [
  { x: 0.456, y: 0.369 },
  { x: 0.502, y: 0.342 },
  { x: 0.554, y: 0.359 },
];
const SMOKE_MAX = 140;

type Puff = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  phase: number;
};

function makeSmokeSprite(): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d");
  if (g) {
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, "rgba(238, 232, 222, 1)");
    grad.addColorStop(1, "rgba(238, 232, 222, 0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
  }
  return c;
}

function setupSmoke(): () => void {
  const canvas = document.querySelector<HTMLCanvasElement>(".smoke-canvas");
  const host = canvas?.parentElement;
  const ctx = canvas?.getContext("2d");
  if (!canvas || !host || !ctx) return noop;

  const sprite = makeSmokeSprite();
  const puffs: Puff[] = [];
  const carry = INCENSE_TIPS.map(() => 0);
  let visible = false;
  let raf = 0;
  let last = 0;
  let size = 0;
  let px = 0;
  let py = 0;
  let pt = 0;

  const resize = () => {
    const rect = host.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    size = Math.max(1, Math.round(rect.width * dpr));
    canvas.width = size;
    canvas.height = size;
  };

  const frame = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    INCENSE_TIPS.forEach((tip, i) => {
      carry[i] += dt;
      while (carry[i] > 0.09 && puffs.length < SMOKE_MAX) {
        carry[i] -= 0.09;
        puffs.push({
          x: tip.x + (Math.random() - 0.5) * 0.004,
          y: tip.y,
          vx: (Math.random() - 0.5) * 0.01,
          vy: -(0.05 + Math.random() * 0.03),
          age: 0,
          life: 4 + Math.random() * 2.5,
          phase: Math.random() * 6.28,
        });
      }
      if (carry[i] > 0.09) carry[i] = 0;
    });

    ctx.clearRect(0, 0, size, size);
    for (let i = puffs.length - 1; i >= 0; i--) {
      const p = puffs[i];
      p.age += dt;
      if (p.age >= p.life) {
        puffs.splice(i, 1);
        continue;
      }
      p.vx += Math.sin(p.age * 1.8 + p.phase) * 0.05 * dt;
      p.vx *= Math.pow(0.985, dt * 60);
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const t = p.age / p.life;
      const r = 0.012 + t * 0.06;
      ctx.globalAlpha = 0.28 * Math.sin(Math.PI * t);
      ctx.drawImage(
        sprite,
        (p.x - r) * size,
        (p.y - r) * size,
        r * 2 * size,
        r * 2 * size
      );
    }
    ctx.globalAlpha = 1;

    raf = visible ? requestAnimationFrame(frame) : 0;
  };

  const start = () => {
    if (raf) return;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  };

  // 游標掃過時，把游標速度的一部分推給附近的煙
  const onMove = (e: PointerEvent) => {
    const rect = host.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const now = performance.now();
    if (pt) {
      const dts = Math.max(0.008, (now - pt) / 1000);
      const vx = clamp((x - px) / dts, -3, 3);
      const vy = clamp((y - py) / dts, -3, 3);
      for (const p of puffs) {
        const d = Math.hypot(p.x - x, p.y - y);
        if (d < 0.2) {
          const f = (1 - d / 0.2) * 0.12;
          p.vx += vx * f;
          p.vy += vy * f;
        }
      }
    }
    px = x;
    py = y;
    pt = now;
  };

  const io = new IntersectionObserver(
    (entries) => {
      visible = entries.some((e) => e.isIntersecting);
      if (visible) start();
    },
    { threshold: 0 }
  );
  const ro = new ResizeObserver(resize);

  resize();
  io.observe(host);
  ro.observe(host);
  host.addEventListener("pointermove", onMove);
  return () => {
    host.removeEventListener("pointermove", onMove);
    io.disconnect();
    ro.disconnect();
    if (raf) cancelAnimationFrame(raf);
  };
}

/* ---------- 4. 活的蝴蝶與竹雞 ---------- */
// 蝴蝶可以飄動的範圍（相對原位，單位 px），避免蓋住右邊的標題
const BF_X: [number, number] = [-60, 180];
const BF_Y: [number, number] = [-50, 170];
const BF_FLEE_RADIUS = 170;

function setupCreatures(): () => void {
  const butterfly = document.querySelector<HTMLElement>(".butterfly-deco");
  const partridge = document.querySelector<HTMLElement>(".partridge-deco");
  if (!butterfly && !partridge) return noop;

  let mx = -9999;
  let my = -9999;
  let raf = 0;
  let last = 0;
  const seen = { butterfly: false, partridge: false };

  // 蝴蝶
  const bf = { x: 0, y: 0, vx: 0, vy: 0 };
  // 竹雞：home 在原位、flying 飛走中、gone 不在畫面、back 飛回來
  const pt = {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    mode: "home" as "home" | "flying" | "gone" | "back",
    since: 0,
    opacity: 1,
  };

  const stepButterfly = (t: number, f: number) => {
    if (!butterfly) return;
    const rect = butterfly.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    // 原位的漂浮：幾個不同週期的正弦疊起來，看起來不規律
    let tx = 40 * Math.sin(t * 0.9) + 18 * Math.sin(t * 2.1 + 1) + 40;
    let ty = 26 * Math.sin(t * 1.3 + 2) + 10 * Math.sin(t * 2.7) + 40;
    const dx = cx - mx;
    const dy = cy - my;
    const d = Math.hypot(dx, dy);
    if (d < BF_FLEE_RADIUS) {
      // 游標靠近：目標改成「從現在位置沿遠離游標的方向再走一段」
      const push = (BF_FLEE_RADIUS - d) * 1.4;
      const nx = d > 0.001 ? dx / d : 1;
      const ny = d > 0.001 ? dy / d : 0;
      tx = bf.x + nx * push;
      ty = bf.y + ny * push;
    }
    tx = clamp(tx, BF_X[0], BF_X[1]);
    ty = clamp(ty, BF_Y[0], BF_Y[1]);
    bf.vx += (tx - bf.x) * 0.02 * f;
    bf.vy += (ty - bf.y) * 0.02 * f;
    const damp = Math.pow(0.9, f);
    bf.vx *= damp;
    bf.vy *= damp;
    bf.x = clamp(bf.x + bf.vx * f, BF_X[0], BF_X[1]);
    bf.y = clamp(bf.y + bf.vy * f, BF_Y[0], BF_Y[1]);
    const tilt = clamp(bf.vx * 3, -22, 22);
    butterfly.style.transform = `translate3d(${bf.x.toFixed(2)}px, ${bf.y.toFixed(2)}px, 0) rotate(${tilt.toFixed(2)}deg)`;
  };

  const stepPartridge = (now: number, f: number) => {
    if (!partridge) return;
    if (pt.mode === "flying") {
      // 起飛：往右上加速，越飛越淡
      pt.vx += 0.9 * f;
      pt.vy -= 0.8 * f;
      pt.x += pt.vx * f;
      pt.y += pt.vy * f;
      pt.opacity = clamp(1 - (now - pt.since) / 1100, 0, 1);
      if (pt.opacity <= 0) {
        pt.mode = "gone";
        pt.since = now;
      }
    } else if (pt.mode === "gone") {
      pt.opacity = 0;
      if (now - pt.since > 2600) {
        // 從右上角回來
        pt.mode = "back";
        pt.since = now;
        pt.x = 320;
        pt.y = -280;
        pt.vx = 0;
        pt.vy = 0;
      }
    } else if (pt.mode === "back") {
      pt.vx += (0 - pt.x) * 0.045 * f;
      pt.vy += (0 - pt.y) * 0.045 * f;
      const damp = Math.pow(0.84, f);
      pt.vx *= damp;
      pt.vy *= damp;
      pt.x += pt.vx * f;
      pt.y += pt.vy * f;
      pt.opacity = clamp((now - pt.since) / 500, 0, 1);
      if (
        Math.abs(pt.x) < 0.5 &&
        Math.abs(pt.y) < 0.5 &&
        Math.abs(pt.vx) < 0.05 &&
        Math.abs(pt.vy) < 0.05
      ) {
        pt.mode = "home";
        pt.x = pt.y = 0;
        pt.opacity = 1;
      }
    }
    const rot = pt.mode === "flying" ? -22 : pt.mode === "back" ? clamp(pt.vx * 1.5, -20, 20) : 0;
    partridge.style.transform = `translateY(-50%) translate3d(${pt.x.toFixed(2)}px, ${pt.y.toFixed(2)}px, 0) rotate(${rot.toFixed(2)}deg)`;
    partridge.style.opacity = String(pt.opacity);
  };

  const frame = (now: number) => {
    const f = clamp((now - last) / 16.67, 0, 3);
    last = now;
    if (seen.butterfly) stepButterfly(now / 1000, f);
    if (seen.partridge || pt.mode !== "home") stepPartridge(now, f);
    const alive = seen.butterfly || seen.partridge || pt.mode !== "home";
    raf = alive ? requestAnimationFrame(frame) : 0;
  };

  const start = () => {
    if (raf) return;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  };

  const onMove = (e: PointerEvent) => {
    mx = e.clientX;
    my = e.clientY;
  };

  const onPartridgeClick = () => {
    if (pt.mode !== "home") return;
    pt.mode = "flying";
    pt.since = performance.now();
    pt.vx = 4;
    pt.vy = -6;
    start();
  };

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.target === butterfly) seen.butterfly = e.isIntersecting;
        if (e.target === partridge) seen.partridge = e.isIntersecting;
      });
      start();
    },
    { threshold: 0 }
  );
  if (butterfly) io.observe(butterfly);
  if (partridge) io.observe(partridge);

  window.addEventListener("pointermove", onMove, { passive: true });
  partridge?.addEventListener("click", onPartridgeClick);
  return () => {
    window.removeEventListener("pointermove", onMove);
    partridge?.removeEventListener("click", onPartridgeClick);
    io.disconnect();
    if (raf) cancelAnimationFrame(raf);
    if (butterfly) butterfly.style.transform = "";
    if (partridge) {
      partridge.style.transform = "";
      partridge.style.opacity = "";
    }
  };
}

export default function Immersion() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const cleanups = [
      setupDaylight(),
      setupInk(),
      setupSmoke(),
      setupCreatures(),
    ];
    return () => cleanups.forEach((fn) => fn());
  }, []);
  return null;
}

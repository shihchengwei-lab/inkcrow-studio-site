"use client";
import { useEffect } from "react";
import { setupSmoke } from "./smoke";
import { setupButterfly } from "./butterfly";

/*
 * 首頁沉浸效果（只負責動態，不負責版面）
 * 1. 墨暈標題：只在游標停留時暈開，離開後收攏；進場由 WaterInk 負責。
 * 2. 線香煙霧：小畫布疊在香爐圖上，煙會被游標撥動
 * 3. 活的蝴蝶與竹雞：蝴蝶閃躲游標，點竹雞會飛走、過幾秒回來
 * 全部在使用者要求「減少動態」時不啟動。
 */

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));

const noop = () => {};

/* ---------- 1. 墨暈標題 ---------- */
const INK_MAX_BLUR = 14;
// 游標停在字上時，暈開程度停在多少（0 清楚、1 最糊）
const INK_HOVER_K = 0.6;

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

  // 游標進入：往暈開的程度走；游標離開：往清楚走
  const setHover = (i: number, on: boolean) => {
    const s = state[i];
    s.hover = on;
    s.target = on ? INK_HOVER_K : 0;
    run(i);
  };

  const hoverHandlers = chars.map((el, i) => {
    const enter = () => setHover(i, true);
    const leave = () => setHover(i, false);
    el.addEventListener("pointerenter", enter);
    el.addEventListener("pointerleave", leave);
    el.addEventListener("pointercancel", leave);
    return { enter, leave };
  });

  return () => {
    chars.forEach((el, i) => {
      el.removeEventListener("pointerenter", hoverHandlers[i].enter);
      el.removeEventListener("pointerleave", hoverHandlers[i].leave);
      el.removeEventListener("pointercancel", hoverHandlers[i].leave);
      el.style.filter = "";
      if (state[i].raf) cancelAnimationFrame(state[i].raf);
    });
  };
}

/* ---------- 3. 活的蝴蝶與竹雞 ---------- */
function setupPartridge(): () => void {
  const partridge = document.querySelector<HTMLElement>(".partridge-deco");
  if (!partridge) return noop;
  let raf = 0;
  let last = 0;
  const seen = { partridge: false };

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
    if (seen.partridge || pt.mode !== "home") stepPartridge(now, f);
    const alive = seen.partridge || pt.mode !== "home";
    raf = alive ? requestAnimationFrame(frame) : 0;
  };

  const start = () => {
    if (raf) return;
    last = performance.now();
    raf = requestAnimationFrame(frame);
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
        if (e.target === partridge) seen.partridge = e.isIntersecting;
      });
      start();
    },
    { threshold: 0 }
  );
  if (partridge) io.observe(partridge);

  partridge?.addEventListener("click", onPartridgeClick);
  return () => {
    partridge?.removeEventListener("click", onPartridgeClick);
    io.disconnect();
    if (raf) cancelAnimationFrame(raf);
    if (partridge) {
      partridge.style.transform = "";
      partridge.style.opacity = "";
    }
  };
}

export default function Immersion() {
  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let cleanups: (() => void)[] = [];
    const sync = () => {
      cleanups.forEach((fn) => fn());
      cleanups = motion.matches ? [] : [setupInk(), setupSmoke(), setupButterfly(), setupPartridge()];
    };
    sync();
    motion.addEventListener("change", sync);
    return () => {
      motion.removeEventListener("change", sync);
      cleanups.forEach((fn) => fn());
    };
  }, []);
  return null;
}

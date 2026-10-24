"use client";
import { useEffect } from "react";
import { setupSmoke } from "./smoke";
import { setupButterfly } from "./butterfly";
import { setupPartridge } from "./partridge";

/*
 * 首頁沉浸效果（只負責動態，不負責版面）
 * 1. 墨暈標題：只在游標停留時暈開，離開後收攏；進場由 WaterInk 負責。
 * 2. 線香煙霧：小畫布疊在香爐圖上，煙會被游標撥動
 * 3. 活的蝴蝶與竹雞：蝴蝶閃躲游標，竹雞察覺後停頓、點擊短跳
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

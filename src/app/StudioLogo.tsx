"use client";

import { useEffect, useRef } from "react";
import "./studio-logo.css";

const SOURCE = "/assets/logo-mark.webp";
const CORE_MS = 1050;
const ORBIT_START_MS = 825;
const RING_MS = 1100;
const DOT_MS = 140;
const DOT_GAP_MS = 220;
const DOTS = [{ x: 157.2, y: 628.77 }, { x: 1124.34, y: 628.77 }];
const DOT_RADIUS = 22;
const REPLAY_MS = RING_MS + DOTS.length * DOT_MS + (DOTS.length - 1) * DOT_GAP_MS;
const INTRO_MS = ORBIT_START_MS + REPLAY_MS;
const CIRCUMFERENCE = 2 * Math.PI * 480;
const ease = (value: number) => {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
};

export default function StudioLogo() {
  const hostRef = useRef<HTMLButtonElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const riseRef = useRef<SVGRectElement>(null);
  const ringRef = useRef<SVGCircleElement>(null);
  const dotsRef = useRef<SVGGElement>(null);
  const introWanted = useRef<boolean | null>(null);
  const playback = useRef<{ kind: "forming" | "replaying"; elapsed: number } | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    const image = imageRef.current;
    const rise = riseRef.current;
    const ring = ringRef.current;
    const dots = dotsRef.current;
    if (!host || !image || !rise || !ring || !dots) return;
    const root = document.documentElement;
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    let disposed = false;
    let introFrame = 0;
    let hoverFrame = 0;
    let visible = false;
    let decoded = false;
    let amount = 0;
    let target = 0;
    let x = 0;
    let y = 0;
    let targetX = 0;
    let targetY = 0;
    let previous = 0;
    let lastPlayback = 0;

    if (introWanted.current === null) {
      try { introWanted.current = !sessionStorage.getItem("inkcrow-logo-seen"); }
      catch { introWanted.current = true; }
    }
    const finish = () => {
      cancelAnimationFrame(introFrame);
      introFrame = 0;
      playback.current = null;
      introWanted.current = false;
      host.dataset.phase = "still";
      root.removeAttribute("data-logo-intro");
    };
    // 首次出場與重播共用順序：墨圈完成，再點左點、右點。
    const paintOrbit = (elapsed: number) => {
      ring.setAttribute("stroke-dashoffset", String(CIRCUMFERENCE * (1 - ease(elapsed / RING_MS))));
      Array.from(dots.children).forEach((dot, i) => {
        dot.setAttribute("r", String(DOT_RADIUS * ease((elapsed - RING_MS - i * (DOT_MS + DOT_GAP_MS)) / DOT_MS)));
      });
    };
    const form = (now: number) => {
      introFrame = 0;
      const active = playback.current;
      if (!active || !visible || document.hidden || disposed) return;
      active.elapsed += now - lastPlayback;
      lastPlayback = now;
      if (active.kind === "forming") {
        rise.setAttribute("y", String(1030 - 1000 * ease(active.elapsed / CORE_MS)));
      }
      paintOrbit(active.elapsed - (active.kind === "forming" ? ORBIT_START_MS : 0));
      if (active.elapsed >= (active.kind === "forming" ? INTRO_MS : REPLAY_MS)) finish();
      else introFrame = requestAnimationFrame(form);
    };
    const start = () => {
      if (disposed || motion.matches || !decoded || !visible || document.hidden || introFrame) return;
      if (!playback.current) {
        if (!introWanted.current) return;
        playback.current = { kind: "forming", elapsed: 0 };
        try { sessionStorage.setItem("inkcrow-logo-seen", "1"); } catch { /* 記錄失敗不影響圖形 */ }
      }
      host.dataset.phase = playback.current.kind;
      lastPlayback = performance.now();
      introFrame = requestAnimationFrame(form);
    };

    const resetHover = () => {
      cancelAnimationFrame(hoverFrame);
      hoverFrame = 0;
      amount = target = 0;
      delete host.dataset.bleeding;
      host.style.removeProperty("--logo-bleed");
    };
    const hover = (now: number) => {
      hoverFrame = 0;
      const dt = Math.min(64, now - previous);
      previous = now;
      amount += (target - amount) * (1 - Math.exp(-dt / (target ? 160 : 230)));
      x += (targetX - x) * (1 - Math.exp(-dt / 65));
      y += (targetY - y) * (1 - Math.exp(-dt / 65));
      host.style.setProperty("--logo-x", `${x}px`);
      host.style.setProperty("--logo-y", `${y}px`);
      host.style.setProperty("--logo-bleed", String(amount * 0.65));
      if (!target && amount < 0.005) { resetHover(); return; }
      if (Math.abs(target - amount) > 0.005 || Math.hypot(targetX - x, targetY - y) > 0.2) {
        hoverFrame = requestAnimationFrame(hover);
      }
    };
    const runHover = () => {
      if (!hoverFrame) { previous = performance.now(); hoverFrame = requestAnimationFrame(hover); }
    };
    const move = (event: PointerEvent) => {
      if (event.pointerType === "touch" || motion.matches || !visible || document.hidden || host.dataset.phase !== "still") return;
      const bounds = host.getBoundingClientRect();
      targetX = event.clientX - bounds.left;
      targetY = event.clientY - bounds.top;
      if (!target && amount === 0) { x = targetX; y = targetY; }
      target = 1;
      host.dataset.bleeding = "true";
      runHover();
    };
    const leave = () => { target = 0; if (amount > 0) runHover(); };
    const onMotion = () => { if (motion.matches) { finish(); resetHover(); } };
    // 重播只遮住墨環與兩點，文字及中央圖形始終使用原圖。
    const replay = () => {
      if (motion.matches || !decoded) return;
      finish();
      resetHover();
      paintOrbit(0);
      playback.current = { kind: "replaying", elapsed: 0 };
      host.dataset.phase = "replaying";
      start();
    };
    const syncVisibility = () => {
      if (visible && !document.hidden) start();
      else {
        cancelAnimationFrame(introFrame);
        introFrame = 0;
        resetHover();
      }
    };

    if (motion.matches || !introWanted.current) finish();
    else root.setAttribute("data-logo-intro", "");
    const observer = new IntersectionObserver((entries) => {
      visible = entries.some((entry) => entry.isIntersecting && entry.intersectionRatio >= 0.2);
      syncVisibility();
    }, { threshold: 0.2 });
    observer.observe(host);
    image.decode().then(() => { decoded = true; start(); }, () => { if (!disposed) finish(); });
    host.addEventListener("pointermove", move, { passive: true });
    host.addEventListener("pointerleave", leave);
    host.addEventListener("pointercancel", leave);
    host.addEventListener("click", replay);
    motion.addEventListener("change", onMotion);
    window.addEventListener("resize", resetHover);
    document.addEventListener("visibilitychange", syncVisibility);
    return () => {
      disposed = true;
      observer.disconnect();
      cancelAnimationFrame(introFrame);
      resetHover();
      root.removeAttribute("data-logo-intro");
      host.removeEventListener("pointermove", move);
      host.removeEventListener("pointerleave", leave);
      host.removeEventListener("pointercancel", leave);
      host.removeEventListener("click", replay);
      motion.removeEventListener("change", onMotion);
      window.removeEventListener("resize", resetHover);
      document.removeEventListener("visibilitychange", syncVisibility);
    };
  }, []);

  return (
    <button type="button" className="studio-logo" ref={hostRef} data-phase="waiting" aria-label="重播墨鴉 Logo 的墨環與墨點">
      {/* 完成後直接顯示原圖；動畫與暈墨只是同一張圖的遮罩層。 */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img ref={imageRef} className="logo-source" src={SOURCE} alt="墨鴉工作室 標記" width="1280" height="1280" />
      <svg className="logo-formation" viewBox="0 0 1280 1280" aria-hidden="true">
        <defs>
          <clipPath id="logo-core"><circle cx="625" cy="640" r="365" /></clipPath>
          <mask id="logo-outside" maskUnits="userSpaceOnUse" x="0" y="0" width="1280" height="1280">
            <rect width="1280" height="1280" fill="white" />
            <circle cx="625" cy="640" r="365" fill="black" />
          </mask>
          <linearGradient id="logo-rise" x1="0" y1="0" x2="0" y2="1">
            <stop stopColor="white" stopOpacity="0" />
            <stop offset="0.075" stopColor="white" />
          </linearGradient>
          <filter id="logo-wet-front" x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence type="fractalNoise" baseFrequency="0.025" numOctaves="2" seed="8" result="grain" />
            <feDisplacementMap in="SourceGraphic" in2="grain" scale="20" xChannelSelector="R" yChannelSelector="G" />
          </filter>
          <g id="logo-orbit">
            <circle ref={ringRef} cx="625" cy="640" r="480" fill="none" stroke="white" strokeWidth="340"
              strokeDasharray={CIRCUMFERENCE} strokeDashoffset={CIRCUMFERENCE} transform="rotate(90 625 640)" />
            {DOTS.map(({ x, y }) => <circle key={x} cx={x} cy={y} r={DOT_RADIUS} fill="black" />)}
            <g ref={dotsRef} fill="white">
              {DOTS.map(({ x, y }) => <circle key={x} cx={x} cy={y} r="0" />)}
            </g>
          </g>
          <mask id="logo-reveal" maskUnits="userSpaceOnUse" x="0" y="0" width="1280" height="1280">
            <g clipPath="url(#logo-core)">
              <rect ref={riseRef} y="1030" width="1280" height="1280" fill="url(#logo-rise)" filter="url(#logo-wet-front)" />
            </g>
            <g mask="url(#logo-outside)">
              <use href="#logo-orbit" />
            </g>
          </mask>
          {/* 範圍落在原圖的留白處，避開上、下文字，只取兩側墨環和墨點。 */}
          <mask id="logo-replay-region" maskUnits="userSpaceOnUse" x="0" y="0" width="1280" height="1280">
            <path d="M0 330H625V980H0Z M625 360H1280V980H625Z" fill="white" />
            <circle cx="625" cy="640" r="385" fill="black" />
          </mask>
          <mask id="logo-replay" maskUnits="userSpaceOnUse" x="0" y="0" width="1280" height="1280">
            <rect width="1280" height="1280" fill="white" />
            <g mask="url(#logo-replay-region)">
              <rect width="1280" height="1280" fill="black" />
              <use href="#logo-orbit" />
            </g>
          </mask>
          <filter id="logo-edge-bleed" x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="2" seed="12" result="grain" />
            <feDisplacementMap in="SourceGraphic" in2="grain" scale="5" xChannelSelector="R" yChannelSelector="G" />
            <feGaussianBlur stdDeviation="1.5" />
          </filter>
        </defs>
        <image className="logo-intro-image" href={SOURCE} width="1280" height="1280" mask="url(#logo-reveal)" />
        <image className="logo-replay-image" href={SOURCE} width="1280" height="1280" mask="url(#logo-replay)" />
      </svg>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="logo-bleed" src={SOURCE} alt="" aria-hidden="true" width="1280" height="1280" />
    </button>
  );
}

import { LOGO_SEEN_KEY } from "./config";
import { createHoverState, orbitPose, playbackPose, stepHover, type LogoMemory } from "./model";

type Elements = { host: HTMLButtonElement; image: HTMLImageElement; rise: SVGRectElement; ring: SVGCircleElement; dots: SVGGElement };

/** DOM、可見性與排程只在這裡管理；跨 effect 的播放進度由元件保留。 */
export function mountStudioLogo({ host, image, rise, ring, dots }: Elements, memory: LogoMemory) {
  const root = document.documentElement;
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  let disposed = false;
  let introFrame = 0;
  let hoverFrame = 0;
  let visible = false;
  let decoded = false;
  const hoverState = createHoverState();
  let previous = 0;
  let lastPlayback = 0;

  if (memory.introWanted === null) {
    try { memory.introWanted = !sessionStorage.getItem(LOGO_SEEN_KEY); }
    catch { memory.introWanted = true; }
  }
  const finish = () => {
    cancelAnimationFrame(introFrame);
    introFrame = 0;
    memory.playback = null;
    memory.introWanted = false;
    host.dataset.phase = "still";
    root.removeAttribute("data-logo-intro");
  };
  // 首次出場與重播共用順序：墨圈完成，再點左點、右點。
  const paintOrbit = (pose: ReturnType<typeof orbitPose>) => {
    ring.setAttribute("stroke-dashoffset", String(pose.offset));
    Array.from(dots.children).forEach((dot, i) => dot.setAttribute("r", String(pose.radii[i])));
  };
  const form = (now: number) => {
    introFrame = 0;
    const active = memory.playback;
    if (!active || !visible || document.hidden || disposed) return;
    active.elapsed += now - lastPlayback;
    lastPlayback = now;
    const pose = playbackPose(active);
    if (pose.rise !== null) rise.setAttribute("y", String(pose.rise));
    paintOrbit(pose.orbit);
    if (pose.done) finish();
    else introFrame = requestAnimationFrame(form);
  };
  const start = () => {
    if (disposed || motion.matches || !decoded || !visible || document.hidden || introFrame) return;
    if (!memory.playback) {
      if (!memory.introWanted) return;
      memory.playback = { kind: "forming", elapsed: 0 };
      try { sessionStorage.setItem(LOGO_SEEN_KEY, "1"); } catch { /* 記錄失敗不影響圖形 */ }
    }
    host.dataset.phase = memory.playback.kind;
    lastPlayback = performance.now();
    introFrame = requestAnimationFrame(form);
  };

  const resetHover = () => {
    cancelAnimationFrame(hoverFrame);
    hoverFrame = 0;
    hoverState.amount = hoverState.target = 0;
    delete host.dataset.bleeding;
    host.style.removeProperty("--logo-bleed");
  };
  const hover = (now: number) => {
    hoverFrame = 0;
    const dt = Math.min(64, now - previous);
    previous = now;
    const result = stepHover(hoverState, dt);
    host.style.setProperty("--logo-x", `${hoverState.x}px`);
    host.style.setProperty("--logo-y", `${hoverState.y}px`);
    host.style.setProperty("--logo-bleed", String(hoverState.amount * 0.65));
    if (result.clear) { resetHover(); return; }
    if (result.moving) {
      hoverFrame = requestAnimationFrame(hover);
    }
  };
  const runHover = () => {
    if (!hoverFrame) { previous = performance.now(); hoverFrame = requestAnimationFrame(hover); }
  };
  const move = (event: PointerEvent) => {
    if (event.pointerType === "touch" || motion.matches || !visible || document.hidden || host.dataset.phase !== "still") return;
    const bounds = host.getBoundingClientRect();
    hoverState.targetX = event.clientX - bounds.left;
    hoverState.targetY = event.clientY - bounds.top;
    if (!hoverState.target && hoverState.amount === 0) { hoverState.x = hoverState.targetX; hoverState.y = hoverState.targetY; }
    hoverState.target = 1;
    host.dataset.bleeding = "true";
    runHover();
  };
  const leave = () => { hoverState.target = 0; if (hoverState.amount > 0) runHover(); };
  const onMotion = () => { if (motion.matches) { finish(); resetHover(); } };
  // 重播只遮住墨環與兩點，文字及中央圖形始終使用原圖。
  const replay = () => {
    if (motion.matches || !decoded) return;
    finish();
    resetHover();
    paintOrbit(orbitPose(0));
    memory.playback = { kind: "replaying", elapsed: 0 };
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

  if (motion.matches || !memory.introWanted) finish();
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
}
